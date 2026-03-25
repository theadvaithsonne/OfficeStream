'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  incoming_knock: '📞',
  invite_received: '✉️',
  room_started: '🎙️',
  recording_ready: '🎬',
  member_joined: '👋',
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time: new notification pushed over socket
  useEffect(() => {
    if (!socket) return;
    socket.on('notification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
      setUnread((n) => n + 1);
    });
    return () => { socket.off('notification'); };
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    await api.patch('/api/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#64748b] transition hover:bg-[#0f3460] hover:text-white"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#fc8181] text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-[#1e3a5f] bg-[#16213e] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1e3a5f] px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#1D9E75] hover:text-[#25c792]">
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#64748b]">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n._id}
                  onClick={() => !n.read && markOne(n._id)}
                  className={`flex cursor-pointer gap-3 px-4 py-3 text-sm transition hover:bg-[#0f3460] ${!n.read ? 'bg-[#1D9E75]/10' : ''}`}
                >
                  <span className="text-base">{typeIcon[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${n.read ? 'text-[#64748b]' : 'text-white'}`}>{n.title}</p>
                    <p className="truncate text-xs text-[#64748b]">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
