import { Request, Response } from 'express';
import { generateLiveKitToken, officeRoomName, p2pRoomName } from '../lib/livekit';
import { User } from '../models/User';

/**
 * POST /api/token/guest — generates a LiveKit token for a named guest (no auth required).
 * Body: { name: string, roomId: string }
 */
export async function getGuestToken(req: Request, res: Response): Promise<void> {
  const { name, roomId } = req.body as { name?: string; roomId?: string };
  if (!name?.trim() || !roomId) {
    res.status(400).json({ message: 'name and roomId are required' });
    return;
  }
  const roomName = officeRoomName(roomId);
  const token = await generateLiveKitToken({
    roomName,
    participantName: name.trim(),
    canPublish: true,
    canPublishData: true,
  });
  res.json({ token, roomName });
}

/**
 * GET /api/token?room=<name>&type=conference|call
 * Returns a LiveKit JWT for the authenticated user to join the requested room.
 */
export async function getToken(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { room, type } = req.query as { room?: string; type?: string };

  if (!room) {
    res.status(400).json({ message: 'room query param is required' });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const roomName = type === 'call' ? p2pRoomName(room) : officeRoomName(room);
  const isHost = user.role === 'owner' || user.role === 'admin';

  const token = await generateLiveKitToken({
    roomName,
    participantName: user.name,
    canPublish: true,
    canPublishData: true,
  });

  res.json({ token, roomName, isHost });
}
