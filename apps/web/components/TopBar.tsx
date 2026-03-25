'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { api } from '@/lib/api';
import NotificationDropdown from './NotificationDropdown';
import StatusDot from './StatusDot';

type Status = 'online' | 'away' | 'busy' | 'offline';

const statusLabels: Record<Status, string> = {
  online: 'Available',
  away: 'Away',
  busy: 'Busy',
  offline: 'Appear offline',
};

const statusColors: Record<Status, string> = {
  online: 'text-[#48bb78]',
  away: 'text-[#f6ad55]',
  busy: 'text-[#fc8181]',
  offline: 'text-[#718096]',
};

export default function TopBar({ officeName, onMenuClick }: { officeName: string; onMenuClick?(): void }) {
  const { user, logout, setUser } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusOpen && statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusOpen, userMenuOpen]);

  async function changeStatus(status: Status) {
    try {
      await api.patch('/api/auth/me/status', { status });
      setUser((u) => (u ? { ...u, status } : u));
      socket?.emit('set_status', status);
    } catch {}
    setStatusOpen(false);
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (!user) return null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#1e3a5f] bg-[#16213e] px-4">
      {/* Left — hamburger (mobile) + office name */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-1.5 text-[#64748b] transition hover:text-white md:hidden"
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <span className="text-sm font-semibold text-white">{officeName}</span>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />

        {/* Status picker */}
        <div className="relative" ref={statusRef}>
          <button
            onClick={() => { setStatusOpen((o) => !o); setUserMenuOpen(false); }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#64748b] transition hover:bg-[#0f3460] hover:text-white"
          >
            <StatusDot status={user.status} />
            <span className={statusColors[user.status]}>{statusLabels[user.status]}</span>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {statusOpen && (
            <div className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-[#1e3a5f] bg-[#16213e] shadow-xl">
              {(Object.keys(statusLabels) as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#a0aec0] transition hover:bg-[#0f3460]"
                >
                  <StatusDot status={s} size="md" />
                  <span>{statusLabels[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Avatar + user menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setUserMenuOpen((o) => !o); setStatusOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D9E75] text-sm font-semibold text-white transition hover:bg-[#25c792]"
            aria-label="User menu"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-[#1e3a5f] bg-[#16213e] shadow-xl">
              <div className="border-b border-[#1e3a5f] px-4 py-3">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-[#64748b] truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#a0aec0] transition hover:bg-[#0f3460] hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
