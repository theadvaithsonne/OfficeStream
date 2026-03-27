'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { api } from '@/lib/api';
import StatusDot from './StatusDot';

interface Member {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'owner' | 'admin' | 'member';
}

interface InviteCode { code: string; expiresAt: string }
interface Office { _id: string; name: string; members: Member[]; inviteCodes?: InviteCode[] }
interface SidebarProps {
  onKnock(member: Member): void;
  onChat(member: Member): void;
  open: boolean;
  onClose(): void;
  activeChatId?: string;
}

function playMessageSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {}
}

export default function Sidebar({ onKnock, onChat, open, onClose, activeChatId }: SidebarProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [office, setOffice] = useState<Office | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const activeChatIdRef = useRef(activeChatId);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // Fetch initial unread counts
  useEffect(() => {
    api.get('/api/messages/unread')
      .then(({ data }) => setUnreadCounts(data.unread))
      .catch(() => {});
  }, []);

  // Clear unread when active chat changes
  useEffect(() => {
    if (activeChatId) {
      setUnreadCounts(prev => {
        if (!prev[activeChatId]) return prev;
        const next = { ...prev };
        delete next[activeChatId];
        return next;
      });
    }
  }, [activeChatId]);

  useEffect(() => {
    api.get('/api/offices/me')
      .then(({ data }) => { setOffice(data.office); setMembers(data.office.members); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('presence', ({ userId, status }: { userId: string; status: Member['status'] }) => {
      setMembers((prev) => prev.map((m) => m._id === userId ? { ...m, status } : m));
    });
    return () => { socket.off('presence'); };
  }, [socket]);

  // Listen for incoming DMs — show badge + play sound if not currently in that chat
  useEffect(() => {
    if (!socket || !user) return;
    const handleDm = (msg: { from: string; to: string }) => {
      if (msg.to !== user._id) return;
      if (msg.from === activeChatIdRef.current) return;
      setUnreadCounts(prev => ({ ...prev, [msg.from]: (prev[msg.from] ?? 0) + 1 }));
      playMessageSound();
    };
    socket.on('dm_message', handleDm);
    return () => { socket.off('dm_message', handleDm); };
  }, [socket, user]);

  const handleChat = useCallback((member: Member) => {
    setUnreadCounts(prev => {
      if (!prev[member._id]) return prev;
      const next = { ...prev };
      delete next[member._id];
      return next;
    });
    onChat(member);
  }, [onChat]);

  const online  = members.filter((m) => m.status !== 'offline');
  const offline = members.filter((m) => m.status === 'offline');

  const inner = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Office header */}
      {office && (
        <div className="flex items-center gap-2 border-b border-[#1e3a5f] px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-bold text-white">
            {office.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{office.name}</p>
            <p className="text-xs text-[#64748b]">{members.length} members</p>
          </div>
          {/* Close button on mobile */}
          <button onClick={onClose} className="ml-auto rounded-md p-1 text-[#64748b] hover:text-white md:hidden">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Invite code */}
      {office && <InviteCodeBar officeId={office._id} inviteCodes={office.inviteCodes} />}

      {/* Quick add user */}
      {office && <QuickAddUser officeId={office._id} onAdded={() => {
        api.get('/api/offices/me').then(({ data }) => { setOffice(data.office); setMembers(data.office.members); }).catch(() => {});
      }} />}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {online.length > 0 && (
          <section>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">
              Online — {online.length}
            </p>
            {online.map((m) => (
              <MemberRow
                key={m._id}
                member={m}
                isMe={m._id === user?._id}
                onKnock={onKnock}
                onChat={handleChat}
                unreadCount={unreadCounts[m._id] ?? 0}
              />
            ))}
          </section>
        )}
        {offline.length > 0 && (
          <section>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">
              Offline — {offline.length}
            </p>
            {offline.map((m) => (
              <MemberRow
                key={m._id}
                member={m}
                isMe={m._id === user?._id}
                onKnock={onKnock}
                onChat={handleChat}
                unreadCount={unreadCounts[m._id] ?? 0}
              />
            ))}
          </section>
        )}
        {!office && (
          <div className="flex flex-1 items-center justify-center pt-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#1e3a5f] bg-[#16213e]">
        {inner}
      </aside>

      {/* Mobile overlay drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative z-50 flex w-64 flex-col bg-[#16213e] shadow-2xl">
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}

function InviteCodeBar({ officeId, inviteCodes }: { officeId: string; inviteCodes?: InviteCode[] }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Find the latest non-expired invite code
  useEffect(() => {
    const active = inviteCodes
      ?.filter((c) => new Date(c.expiresAt).getTime() > Date.now())
      .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
    if (active) setCode(active.code);
  }, [inviteCodes]);

  async function generateCode() {
    setLoading(true);
    try {
      const { data } = await api.post(`/api/offices/${officeId}/invite`);
      setCode(data.inviteCode ?? data.code);
    } catch {}
    setLoading(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-b border-[#1e3a5f] px-4 py-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Invite Code</p>
      {code ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-[#0a1628] px-2 py-1 text-xs font-mono text-[#1D9E75] select-all">{code}</code>
          <button
            onClick={copyCode}
            className="rounded px-1.5 py-1 text-[10px] text-[#64748b] transition hover:bg-[#0f3460] hover:text-white"
            title="Copy invite code"
          >
            {copied ? (
              <svg className="h-3.5 w-3.5 text-[#1D9E75]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={generateCode}
          disabled={loading}
          className="text-xs text-[#1D9E75] hover:underline disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate invite code'}
        </button>
      )}
    </div>
  );
}

function QuickAddUser({ officeId, onAdded }: { officeId: string; onAdded(): void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const { data } = await api.post(`/api/offices/${officeId}/quick-add`, { name, email, password });
      setMsg({ text: data.message, ok: true });
      setName(''); setEmail(''); setPassword('');
      onAdded();
      setTimeout(() => { setMsg(null); setOpen(false); }, 1500);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to add user', ok: false });
    }
    setLoading(false);
  }

  return (
    <div className="border-b border-[#1e3a5f] px-4 py-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-1.5 text-xs text-[#1D9E75] hover:text-[#25c28b] transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Quick Add User
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Add User</p>
            <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="text-[#64748b] hover:text-white">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded bg-[#0a1628] px-2 py-1 text-xs text-white placeholder-[#64748b] outline-none focus:ring-1 focus:ring-[#1D9E75]"
          />
          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded bg-[#0a1628] px-2 py-1 text-xs text-white placeholder-[#64748b] outline-none focus:ring-1 focus:ring-[#1D9E75]"
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded bg-[#0a1628] px-2 py-1 text-xs text-white placeholder-[#64748b] outline-none focus:ring-1 focus:ring-[#1D9E75]"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded bg-[#1D9E75] px-2 py-1 text-xs font-medium text-white transition hover:bg-[#25c28b] disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
          {msg && <p className={`text-[10px] ${msg.ok ? 'text-[#1D9E75]' : 'text-red-400'}`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}

function MemberRow({ member, isMe, onKnock, onChat, unreadCount }: {
  member: Member; isMe: boolean;
  onKnock(m: Member): void;
  onChat(m: Member): void;
  unreadCount: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onChat(member)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[#0f3460]"
    >
      <div className="relative shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-semibold text-white">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={member.status} /></span>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm ${isMe ? 'font-semibold text-white' : 'text-[#a0aec0]'}`}>
          {member.name}{isMe && <span className="ml-1 text-xs text-[#64748b]">(you)</span>}
        </p>
        {member.role === 'owner' && <p className="text-[10px] text-[#1D9E75]">Owner</p>}
      </div>
      {!isMe && unreadCount > 0 && !hover && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6264a7] px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      {!isMe && hover && (
        <div className="flex gap-1">
          {/* Call button — only when online */}
          {member.status !== 'offline' && (
            <button
              onClick={(e) => { e.stopPropagation(); onKnock(member); }}
              title={`Call ${member.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1D9E75]/20 text-[#1D9E75] transition hover:bg-[#1D9E75] hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
