import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthPayload } from '../middleware/auth';
import { USER_STATUSES, type UserStatus } from '../lib/constants';

type AuthSocket = Socket & { userId: string };

let io: IOServer;

/** Builds the Socket.IO room name for an office (used for presence broadcasts). */
export function officeSocketRoom(officeId: string): string {
  return `office:${officeId}`;
}

/** Builds the Socket.IO room name for a user (used for targeted notifications). */
export function userSocketRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Initialises Socket.IO on the given HTTP server.
 * Authenticates connections via a JWT in `socket.handshake.auth.token`,
 * manages per-user and per-office rooms, and handles presence lifecycle.
 */
export function initSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    },
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;
      (socket as AuthSocket).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const { userId } = socket as AuthSocket;

    // Personal room for targeted notifications/knocks
    socket.join(userSocketRoom(userId));

    // Mark online + join office broadcast room
    const user = await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true });
    if (user?.officeId) {
      const room = officeSocketRoom(String(user.officeId));
      socket.join(room);
      io.to(room).emit('presence', { userId, status: 'online' });
    }

    // ── Client events ──────────────────────────────────────────────────────

    /** join_room — user joins a specific room to receive room-specific events. */
    socket.on('join_room', ({ roomName }: { roomName: string }) => {
      socket.join(roomName);
    });

    /** set_status — client requests a manual presence change. */
    socket.on('set_status', async (status: string) => {
      if (!USER_STATUSES.includes(status as UserStatus)) return;
      await User.findByIdAndUpdate(userId, { status });
      const updated = await User.findById(userId);
      if (updated?.officeId) {
        io.to(officeSocketRoom(String(updated.officeId))).emit('presence', { userId, status });
      }
    });

    /** knock — caller initiates a Teams-style call; roomId is caller-generated. */
    socket.on('knock', async ({ toId, roomId }: { toId: string; roomId: string }) => {
      const caller = await User.findById(userId);
      if (!caller) return;
      io.to(userSocketRoom(toId)).emit('incoming_call', {
        fromId: userId,
        fromName: caller.name,
        roomId,
      });
    });

    /** call_accept — callee accepted; notify caller so both navigate to the room. */
    socket.on('call_accept', ({ toId, roomId }: { toId: string; roomId: string }) => {
      io.to(userSocketRoom(toId)).emit('call_accepted', { roomId });
    });

    /** call_decline — callee declined; notify caller. */
    socket.on('call_decline', ({ toId }: { toId: string }) => {
      io.to(userSocketRoom(toId)).emit('call_declined', { byId: userId });
    });

    /** call_invite — invite someone into an ongoing meeting. */
    socket.on('call_invite', async ({ toId, roomId }: { toId: string; roomId: string }) => {
      const caller = await User.findById(userId);
      if (!caller) return;
      io.to(userSocketRoom(toId)).emit('incoming_call', {
        fromId: userId,
        fromName: caller.name,
        roomId,
      });
    });

    /** recording:started — broadcast that recording has started in the room. */
    socket.on('recording:started', ({ roomName }: { roomName: string }) => {
      // Broadcast to all participants in the room
      io.to(roomName).emit('recording:started');
    });

    /** recording:stopped — broadcast that recording has stopped in the room. */
    socket.on('recording:stopped', ({ roomName }: { roomName: string }) => {
      // Broadcast to all participants in the room
      io.to(roomName).emit('recording:stopped');
    });

    /** dm_send — saves a DM and delivers it in real-time to recipient and sender. */
    socket.on('dm_send', async ({ toId, content }: { toId: string; content: string }) => {
      if (!content?.trim()) return;
      const { Message } = await import('../models/Message');
      const msg = await Message.create({ from: userId, to: toId, content: content.trim() });
      const payload = { _id: msg._id, from: userId, to: toId, content: msg.content, createdAt: msg.createdAt };
      io.to(userSocketRoom(toId)).emit('dm_message', payload);
      io.to(userSocketRoom(userId)).emit('dm_message', payload);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { status: 'offline' });
      const updated = await User.findById(userId);
      if (updated?.officeId) {
        io.to(officeSocketRoom(String(updated.officeId))).emit('presence', {
          userId,
          status: 'offline',
        });
      }
    });
  });

  return io;
}

/** Emits a notification event directly to a specific user's personal socket room. */
export function emitNotification(userId: string, notification: object): void {
  io?.to(userSocketRoom(userId)).emit('notification', notification);
}

/** Returns the initialised Socket.IO server instance. Throws if called before initSocket(). */
export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialised — call initSocket() first');
  return io;
}
