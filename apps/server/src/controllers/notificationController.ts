import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { type NotificationType } from '../lib/constants';
import { MAX_NOTIFICATIONS } from '../lib/constants';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

/** Creates and persists a notification. Called internally by other controllers and socket handlers. */
export async function createNotification(params: CreateNotificationParams) {
  return Notification.create(params);
}

/** GET /api/notifications — returns the caller's last 50 notifications, unread first. */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const notifications = await Notification.find({ userId: req.user!.userId })
    .sort({ read: 1, createdAt: -1 })
    .limit(MAX_NOTIFICATIONS);

  const unreadCount = await Notification.countDocuments({
    userId: req.user!.userId,
    read: false,
  });

  res.json({ notifications, unreadCount });
}

/** PATCH /api/notifications/:id/read — marks a single notification as read. */
export async function markRead(req: Request, res: Response): Promise<void> {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    { read: true },
    { new: true }
  );
  if (!notif) {
    res.status(404).json({ message: 'Notification not found' });
    return;
  }
  res.json({ notification: notif });
}

/** PATCH /api/notifications/read-all — marks all of the caller's notifications as read. */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  await Notification.updateMany({ userId: req.user!.userId, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
}

/** DELETE /api/notifications/:id — deletes a single notification owned by the caller. */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
  res.json({ message: 'Deleted' });
}
