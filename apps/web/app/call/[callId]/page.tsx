'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTracks,
  ParticipantTile,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { api } from '@/lib/api';
import { useCallTimer } from '@/hooks/useCallTimer';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useRecording } from '@/hooks/useRecording';
import ControlBar from '@/components/ControlBar';

/** P2P call page — 2-participant audio/video call via LiveKit. */
export default function CallPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = use(params);
  const router = useRouter();
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isHost, setIsHost] = useState(true); // Assume host for calls
  const [error, setError] = useState('');
  const { recording, start: startRec, stop: stopRec, error: recError } = useRecording(roomName);

  useEffect(() => {
    api.get(`/api/token?room=${callId}&type=call`)
      .then(({ data }) => { setToken(data.token); setRoomName(data.roomName); })
      .catch(() => setError('Could not get call token.'));
  }, [callId]);

  const handleLeave = useCallback(() => {
    const ok = window.confirm('End this call?');
    if (ok) router.replace('/dashboard');
  }, [router]);

  if (error) return (
    <div className="flex h-full items-center justify-center gap-4 flex-col bg-[#1a1a2e]">
      <p className="text-[#fc8181]">{error}</p>
      <button onClick={() => router.replace('/dashboard')} className="rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white">Back</button>
    </div>
  );

  if (!token) return (
    <div className="flex h-full items-center justify-center bg-[#1a1a2e]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
    </div>
  );

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://localhost:7880'}
      token={token}
      connect
      audio
      video
      onDisconnected={() => router.replace('/dashboard')}
      className="flex h-full flex-col bg-[#1a1a2e]"
    >
      <RoomAudioRenderer />
      <CallLayout roomName={roomName} callId={callId} onLeave={handleLeave} isHost={isHost} recording={recording} onRecordStart={startRec} onRecordStop={stopRec} recError={recError} />
    </LiveKitRoom>
  );
}

function CallLayout({ roomName, callId, onLeave, isHost, recording, onRecordStart, onRecordStop, recError }: { roomName: string; callId: string; onLeave(): void; isHost: boolean; recording: boolean; onRecordStart(): void; onRecordStop(): void; recError: string }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const remoteTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
    .filter((t) => !t.participant.isLocal);
  const localTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
    .filter((t) => t.participant.isLocal);
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  const { sharing } = useScreenShare(localParticipant);
  const remoteJoined = participants.filter((p) => !p.isLocal).length > 0;
  const { formatted } = useCallTimer(remoteJoined);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Timer and Recording */}
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-4 rounded-full bg-[#16213e]/90 px-4 py-1 text-sm font-mono text-white">
        {remoteJoined ? formatted : 'Calling…'}
        {recording && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#fc8181]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#fc8181]" /> REC
          </span>
        )}
        {recError && <span className="text-xs text-[#fc8181]">{recError}</span>}
      </div>

      {/* Main video area */}
      <div className="flex flex-1 gap-2 overflow-hidden p-3">
        {sharing && screenTracks.length > 0 ? (
          /* Screen share layout */
          <>
            <div className="flex-1 rounded-xl overflow-hidden bg-[#0f3460]">
              <ParticipantTile trackRef={screenTracks[0]} />
            </div>
            <div className="flex w-44 flex-col gap-2">
              {remoteTracks.map((t) => (
                <div key={t.participant.sid} className="aspect-video rounded-lg overflow-hidden bg-[#0f3460]">
                  <ParticipantTile trackRef={t} />
                </div>
              ))}
            </div>
          </>
        ) : remoteJoined ? (
          /* Normal call — remote full, local PiP */
          <div className="relative flex-1 rounded-xl overflow-hidden bg-[#0f3460]">
            {remoteTracks[0] && <ParticipantTile trackRef={remoteTracks[0]} className="h-full w-full" />}
            {/* PiP local */}
            {localTracks[0] && (
              <div className="absolute bottom-4 right-4 w-36 aspect-video rounded-lg overflow-hidden border-2 border-[#1D9E75] shadow-lg">
                <ParticipantTile trackRef={localTracks[0]} />
              </div>
            )}
          </div>
        ) : (
          /* Waiting screen */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-xl bg-[#16213e]">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-4xl">
                👤
              </div>
              <span className="absolute inset-0 rounded-full border-4 border-[#1D9E75] animate-ping opacity-30" />
            </div>
            <p className="text-lg font-semibold text-white">Calling…</p>
            <p className="text-sm text-[#a0aec0]">Call ID: <span className="font-mono text-[#1D9E75]">{callId}</span></p>
          </div>
        )}
      </div>

      <ControlBar onLeave={onLeave} isHost={isHost} recording={recording} onRecordStart={onRecordStart} onRecordStop={onRecordStop} />
    </div>
  );
}
