import { Request, Response } from 'express';
import { Message } from '../models/Message';

/** GET /api/messages/:userId — returns the DM history between the caller and :userId */
export async function getConversation(req: Request, res: Response): Promise<void> {
  const me = req.user!.userId;
  const other = req.params.userId;

  const messages = await Message.find({
    $or: [
      { from: me, to: other },
      { from: other, to: me },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  // Mark unread messages from the other person as read
  await Message.updateMany({ from: other, to: me, read: false }, { read: true });

  res.json({ messages });
}

/** GET /api/messages/unread — returns unread message counts per sender */
export async function getUnreadCounts(req: Request, res: Response): Promise<void> {
  const me = req.user!.userId;

  const counts = await Message.aggregate([
    { $match: { to: me, read: false } },
    { $group: { _id: '$from', count: { $sum: 1 } } },
  ]);

  const result: Record<string, number> = {};
  counts.forEach((c) => { result[c._id] = c.count; });

  res.json({ unread: result });
}
