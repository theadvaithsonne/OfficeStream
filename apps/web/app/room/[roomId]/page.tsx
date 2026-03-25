'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useTracks } from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useRecording } from '@/hooks/useRecording';
import VideoGrid from '@/components/VideoGrid';
import ControlBar from '@/components/ControlBar';

// Resolved at module level — never changes between renders.
const LK_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://localhost:7880';

/** Conference room page — supports both logged-in users and named guests. */
export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [token, setToken]         = useState('');
  const [roomName, setRoomName]   = useState('');
  const [isHost, setIsHost]       = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError]         = useState('');
  const [showAddPeople, setShowAddPeople] = useState(false);

  // Guest flow
  const [guestName, setGuestName]             = useState('');
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  // Recording (hook must be at top level, not inside LiveKitRoom sub-tree)
  const { recording, start: startRec, stop: stopRec, error: recError } = useRecording(roomName);
  const [anyoneRecording, setAnyoneRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);

  /**
   * Tracks whether we have ever reached a fully-connected state.
   *
   * A ref (not state) is intentional: refs survive React 19 StrictMode's
   * double-mount cycle.  In development StrictMode mounts → unmounts → remounts
   * every component.  Without this guard, onDisconnected fires during the
   * synthetic unmount before any real connection is established, which sends
   * the user straight back to /dashboard.
   */
  const everConnectedRef = useRef(false);

  // ── Recording timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!recording && !anyoneRecording) { setRecElapsed(0); return; }
    setRecElapsed(0);
    const t = setInterval(() => setRecElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording, anyoneRecording]);

  // ── Token fetch ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      api
        .get(`/api/token?room=${roomId}&type=conference`)
        .then(({ data }) => {
          setToken(data.token);
          setRoomName(data.roomName);
          setIsHost(data.isHost);
        })
        .catch(() => setError('Could not get room token. Check your connection.'));
    } else {
      setShowGuestPrompt(true);
    }
  }, [authLoading, user, roomId]);

  async function joinAsGuest() {
    if (!guestName.trim()) return;
    try {
      const { data } = await api.post('/api/token/guest', { name: guestName.trim(), roomId });
      setToken(data.token);
      setRoomName(data.roomName);
      setShowGuestPrompt(false);
    } catch {
      setError('Could not join room. The room may not exist.');
    }
  }

  // ── LiveKit event handlers ────────────────────────────────────────────────

  const handleConnected = useCallback(() => {
    everConnectedRef.current = true;
    setConnected(true);
  }, []);

  /**
   * Only navigate away when the room was previously connected.
   * Premature events (StrictMode remount, network failure before join) arrive
   * before everConnectedRef is set, so they are ignored.
   */
  const handleDisconnected = useCallback(() => {
    if (everConnectedRef.current) {
      router.replace('/dashboard');
    }
  }, [router]);

  /** Surface join-time errors to the user rather than silently redirecting. */
  const handleLKError = useCallback((err: Error) => {
    if (!everConnectedRef.current) {
      setError(`Could not connect to the meeting room: ${err.message}`);
      setToken('');
    }
  }, []);

  // ── Leave ─────────────────────────────────────────────────────────────────

  const handleLeave = useCallback(() => {
    if (window.confirm('Leave the conference room?')) router.replace('/dashboard');
  }, [router]);

  // ── Recording broadcast ────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket || !roomName) return;
    
    // Join the socket room so we receive events from this room
    socket.emit('join_room', { roomName });
    
    const onRecordingStarted = () => setAnyoneRecording(true);
    const onRecordingStopped = () => setAnyoneRecording(false);
    
    socket.on('recording:started', onRecordingStarted);
    socket.on('recording:stopped', onRecordingStopped);
    
    return () => {
      socket.off('recording:started', onRecordingStarted);
      socket.off('recording:stopped', onRecordingStopped);
    };
  }, [socket, roomName]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) return <LoadingScreen label="Loading…" />;

  if (showGuestPrompt) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1a2e] px-4">
        <div className="w-full max-w-sm rounded-xl border border-[#1e3a5f] bg-[#16213e] p-6 shadow-2xl">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D9E75]">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Join Meeting</h2>
            <p className="mt-1 text-xs text-[#64748b]">Enter your name to join as a guest</p>
          </div>
          {error && <div className="mb-3 rounded-md bg-[#fc8181]/10 px-3 py-2 text-sm text-[#fc8181]">{error}</div>}
          <input
            autoFocus
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinAsGuest()}
            placeholder="Your name"
            className="mb-3 w-full rounded-lg border border-[#1e3a5f] bg-[#0f3460] px-3 py-2.5 text-sm text-white placeholder-[#64748b] outline-none focus:border-[#1D9E75]"
          />
          <button
            onClick={joinAsGuest}
            disabled={!guestName.trim()}
            className="w-full rounded-lg bg-[#1D9E75] py-2.5 text-sm font-semibold text-white transition hover:bg-[#25c792] disabled:opacity-60"
          >
            Join meeting
          </button>
          <button
            onClick={() => router.replace('/login')}
            className="mt-2 w-full rounded-lg border border-[#1e3a5f] py-2 text-xs text-[#a0aec0] hover:bg-[#0f3460]"
          >
            Sign in with account instead
          </button>
        </div>
      </div>
    );
  }

  if (error) return <ErrorScreen message={error} onBack={() => router.replace('/dashboard')} />;
  if (!token) return <LoadingScreen label="Joining room…" />;

  return (
    <div className="flex h-full flex-col bg-[#1a1a2e]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e3a5f] bg-[#16213e] px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="rounded-md p-1.5 text-[#a0aec0] hover:bg-[#0f3460] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">Conference Room</span>
          <span className="hidden rounded-full bg-[#0f3460] px-2 py-0.5 font-mono text-xs text-[#a0aec0] sm:inline">
            {roomName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(recording || anyoneRecording) && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#fc8181]/20 px-3 py-1 text-xs font-semibold text-[#fc8181]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#fc8181]" /> REC {Math.floor(recElapsed / 60)}:{(recElapsed % 60).toString().padStart(2, '0')}
            </span>
          )}
          {recError && <span className="text-xs text-[#fc8181]">{recError}</span>}
          <button
            onClick={() => setShowAddPeople(true)}
            title="Add people to call"
            className="flex items-center gap-1.5 rounded-lg border border-[#1e3a5f] px-2.5 py-1.5 text-xs text-[#a0aec0] transition hover:bg-[#0f3460] hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add people
          </button>
          <button
            onClick={copyLink}
            title="Copy meeting link"
            className="flex items-center gap-1.5 rounded-lg border border-[#1e3a5f] px-2.5 py-1.5 text-xs text-[#a0aec0] transition hover:bg-[#0f3460] hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy link
          </button>
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        serverUrl={LK_URL}
        token={token}
        connect
        audio={false}
        video={false}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleLKError}
        className="relative flex flex-1 flex-col overflow-hidden"
      >
        <RoomAudioRenderer />
        <ScreenShareAwareGrid />
        <ControlBar
          onLeave={handleLeave}
          isHost={isHost}
          recording={recording}
          onRecordStart={startRec}
          onRecordStop={stopRec}
        />
        {!connected && <LoadingOverlay />}
      </LiveKitRoom>

      {showAddPeople && (
        <AddPeopleModal
          roomId={roomId}
          socket={socket}
          onClose={() => setShowAddPeople(false)}
        />
      )}
    </div>
  );
}

// ── Inner components (need LiveKit context) ────────────────────────────────────

function ScreenShareAwareGrid() {
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  return (
    <div className="flex-1 overflow-hidden p-3">
      <VideoGrid hasScreenShare={screenTracks.length > 0} />
    </div>
  );
}

// ── Pure UI components ─────────────────────────────────────────────────────────

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#1a1a2e]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
      <p className="text-sm text-[#a0aec0]">{label}</p>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
    </div>
  );
}

interface OfficeMember { _id: string; name: string; email: string; status: string }

function AddPeopleModal({ roomId, socket, onClose }: {
  roomId: string;
  socket: Socket | null;
  onClose(): void;
}) {
  const [members, setMembers] = useState<OfficeMember[]>([]);
  const [query, setQuery] = useState('');
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/api/offices/me')
      .then(({ data }) => setMembers(data.office.members))
      .catch(() => {});
  }, []);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.email.toLowerCase().includes(query.toLowerCase())
  );

  function invite(member: OfficeMember) {
    socket?.emit('call_invite', { toId: member._id, roomId });
    setInvited((prev) => new Set([...prev, member._id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-[#1e3a5f] bg-[#16213e] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Add people to call</h3>
          <button onClick={onClose} className="rounded p-1 text-[#64748b] hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="mb-3 w-full rounded-lg border border-[#1e3a5f] bg-[#0f3460] px-3 py-2 text-sm text-white placeholder-[#64748b] outline-none focus:border-[#1D9E75]"
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.map((m) => (
            <div key={m._id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#0f3460]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-semibold text-white">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{m.name}</p>
                <p className="truncate text-xs text-[#64748b]">{m.email}</p>
              </div>
              <button
                onClick={() => invite(m)}
                disabled={invited.has(m._id) || m.status === 'offline'}
                className="shrink-0 rounded-md bg-[#1D9E75] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#25c792] disabled:opacity-50"
              >
                {invited.has(m._id) ? 'Invited' : 'Invite'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-xs text-[#64748b]">No members found</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#1a1a2e]">
      <p className="text-[#fc8181]">{message}</p>
      <button
        onClick={onBack}
        className="rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#25c792]"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
