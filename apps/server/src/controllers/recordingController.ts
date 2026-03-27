import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { EncodedFileOutput, EncodedFileType, EgressStatus } from 'livekit-server-sdk';
import { Recording } from '../models/Recording';
import { Office } from '../models/Office';
import { Message } from '../models/Message';
import { getIO, userSocketRoom } from '../socket';
import { getEgressClient } from '../lib/livekit';

const RECORDINGS_DIR = path.join(__dirname, '../../recordings');
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

/**
 * POST /api/recording/start
 * Starts server-side recording using LiveKit Room Composite Egress.
 * Body: { roomName }
 */
export async function startRecording(req: Request, res: Response): Promise<void> {
  const { roomName } = req.body as { roomName?: string };

  if (!roomName) {
    res.status(400).json({ message: 'roomName is required' });
    return;
  }

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const office = await Office.findOne({ members: userId });
    if (!office) {
      res.status(404).json({ message: 'Office not found' });
      return;
    }

    // Check for already-active recording in this room
    const existing = await Recording.findOne({ roomName, status: 'recording' });
    if (existing) {
      res.status(409).json({ message: 'Recording already in progress', egressId: existing.egressId, recordingId: existing._id });
      return;
    }

    const egressClient = getEgressClient();

    // Build proper EncodedFileOutput — egress writes to its own filesystem.
    // For local dev the egress service shares `recordings/` via a volume mount.
    const filename = `${roomName}-${Date.now()}.mp4`;
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: path.posix.join('/out', filename),
      disableManifest: true,
    });

    const egress = await egressClient.startRoomCompositeEgress(roomName, output);

    // Persist recording metadata immediately
    const rec = await Recording.create({
      roomName,
      officeId: office._id.toString(),
      egressId: egress.egressId,
      filename,
      recordedBy: userId,
      status: 'recording',
    });

    console.log(`[Recording] Started egress ${egress.egressId} for room ${roomName}`);
    res.json({ recordingId: rec._id, egressId: egress.egressId });
  } catch (error: any) {
    console.error('[Recording] Failed to start:', error.message);
    res.status(500).json({ message: 'Failed to start recording', error: error.message });
  }
}

/**
 * POST /api/recording/stop
 * Stops an active egress recording.
 * Body: { egressId }
 */
export async function stopRecording(req: Request, res: Response): Promise<void> {
  const { egressId } = req.body as { egressId?: string };

  if (!egressId) {
    res.status(400).json({ message: 'egressId is required' });
    return;
  }

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const egressClient = getEgressClient();

    try {
      await egressClient.stopEgress(egressId);
    } catch (stopErr: any) {
      // If egress already aborted/finished on its own, continue with cleanup
      const alreadyDone = stopErr.message?.toLowerCase().includes('cannot be stopped') ||
                          stopErr.message?.toLowerCase().includes('not found');
      if (!alreadyDone) throw stopErr;
      console.log(`[Recording] Egress ${egressId} already ended: ${stopErr.message}`);
    }

    const rec = await Recording.findOne({ egressId });
    if (!rec) {
      res.status(404).json({ message: 'Recording not found' });
      return;
    }

    await Recording.findOneAndUpdate({ egressId }, { status: 'processing' });

    console.log(`[Recording] Stopping egress ${egressId}, polling for completion`);

    pollEgressCompletion(egressId, userId).catch((err) =>
      console.error(`[Recording] Poll error for ${egressId}:`, err.message),
    );

    res.json({ recording: rec });
  } catch (error: any) {
    console.error('[Recording] Failed to stop:', error.message);
    res.status(500).json({ message: 'Failed to stop recording', error: error.message });
  }
}

/**
 * GET /api/recording/status/:egressId
 * Returns current status of a recording.
 */
export async function getRecordingStatus(req: Request, res: Response): Promise<void> {
  const rec = await Recording.findOne({ egressId: req.params.egressId });
  if (!rec) {
    res.status(404).json({ message: 'Recording not found' });
    return;
  }
  res.json({ recording: rec });
}

/**
 * GET /api/recording/list/:officeId
 * Lists all recordings for an office.
 */
export async function listRecordings(req: Request, res: Response): Promise<void> {
  const { officeId } = req.params;
  const recordings = await Recording.find({ officeId }).sort({ createdAt: -1 }).limit(50);
  res.json({ recordings });
}

/**
 * GET /api/recording/:id/download
 * Streams the recording file to the client.
 */
export async function downloadRecording(req: Request, res: Response): Promise<void> {
  const rec = await Recording.findById(req.params.id);
  if (!rec) { res.status(404).json({ message: 'Recording not found' }); return; }

  if (rec.status !== 'ready') {
    res.status(202).json({ message: 'Recording is still processing', status: rec.status });
    return;
  }

  const filePath = path.join(RECORDINGS_DIR, rec.filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ message: 'File not found on disk' }); return; }

  res.download(filePath, `recording-${rec.roomName}-${rec.createdAt.toISOString().slice(0, 10)}.mp4`);
}

/**
 * DELETE /api/recording/:id
 * Deletes a recording (file + metadata).
 */
export async function deleteRecording(req: Request, res: Response): Promise<void> {
  const rec = await Recording.findByIdAndDelete(req.params.id);
  if (!rec) { res.status(404).json({ message: 'Recording not found' }); return; }

  const filePath = path.join(RECORDINGS_DIR, rec.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ message: 'Recording deleted' });
}

/**
 * POST /api/recording/upload
 * Receives a recorded WebM blob from the browser MediaRecorder (fallback).
 * Body (multipart): file, roomName, duration
 */
export async function uploadRecording(req: Request, res: Response): Promise<void> {
  const file = req.file;
  const { roomName, duration } = req.body as { roomName?: string; duration?: string };

  if (!file || !roomName) {
    res.status(400).json({ message: 'file and roomName are required' });
    return;
  }

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const office = await Office.findOne({ members: userId });
    if (!office) {
      res.status(404).json({ message: 'Office not found' });
      return;
    }

    const rec = await Recording.create({
      roomName,
      officeId: office._id.toString(),
      egressId: `upload-${Date.now()}`,
      filename: file.filename,
      size: file.size,
      duration: parseInt(duration ?? '0', 10),
      recordedBy: userId,
      status: 'ready',
    });

    console.log(`[Recording] Upload saved: ${rec._id}`);
    res.json({ recording: rec });
  } catch (error: any) {
    console.error('[Recording] Upload failed:', error.message);
    res.status(500).json({ message: 'Failed to save recording', error: error.message });
  }
}

// ── Background egress polling ────────────────────────────────────────────────

const POLL_INTERVAL = 2000;
const MAX_POLLS = 150; // 5 minutes max

async function pollEgressCompletion(egressId: string, userId: string): Promise<void> {
  const egressClient = getEgressClient();

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL);

    const list = await egressClient.listEgress({ egressId });
    if (!list.length) {
      console.error(`[Recording] Egress ${egressId} not found during poll`);
      await Recording.findOneAndUpdate({ egressId }, { status: 'failed', error: 'Egress not found' });
      return;
    }

    const info = list[0];
    const status = info.status;

    if (status === EgressStatus.EGRESS_COMPLETE) {
      // Egress completed — update recording with file info
      const fileResults = info.fileResults;
      let size = 0;
      let duration = 0;

      if (fileResults.length > 0) {
        const fr = fileResults[0];
        size = Number(fr.size);
        duration = Math.round(Number(fr.duration) / 1_000_000_000); // nanos → seconds
      }

      const rec = await Recording.findOneAndUpdate(
        { egressId },
        { status: 'ready', size, duration },
        { new: true },
      );

      if (rec) {
        // Notify user via DM with embedded recording ID for download link
        const content = `🎬 Recording ready: ${rec.roomName} (${formatDuration(duration)}) {{recording:${rec._id}}}`;
        const msg = await Message.create({ from: userId, to: userId, content });
        const payload = { _id: msg._id, from: userId, to: userId, content: msg.content, createdAt: msg.createdAt };
        const io = getIO();
        io.to(userSocketRoom(userId)).emit('dm_message', payload);
      }

      console.log(`[Recording] Egress ${egressId} completed — size: ${size}, duration: ${duration}s`);
      return;
    }

    if (status === EgressStatus.EGRESS_FAILED || status === EgressStatus.EGRESS_ABORTED) {
      const errorMsg = info.error || 'Egress failed';
      await Recording.findOneAndUpdate({ egressId }, { status: 'failed', error: errorMsg });
      console.error(`[Recording] Egress ${egressId} failed: ${errorMsg}`);
      return;
    }

    // Still active or ending — keep polling
  }

  // Timed out
  await Recording.findOneAndUpdate({ egressId }, { status: 'failed', error: 'Polling timed out' });
  console.error(`[Recording] Egress ${egressId} polling timed out`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
