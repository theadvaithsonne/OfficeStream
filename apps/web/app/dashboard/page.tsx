'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { api } from '@/lib/api';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import OfficeSetup from '@/components/OfficeSetup';
import InviteModal from '@/components/InviteModal';
import ChatPanel from '@/components/ChatPanel';
import { OutgoingKnockOverlay, IncomingKnockOverlay } from '@/components/KnockOverlay';

interface Member {
  _id: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'owner' | 'admin' | 'member';
}

interface IncomingCall { fromId: string; fromName: string; roomId: string }

/** Main dashboard page — Teams-style layout. */
export default function DashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const [officeName, setOfficeName] = useState('OfficeStream');
  const [officeId, setOfficeId] = useState('');
  const [hasOffice, setHasOffice] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [outgoingKnock, setOutgoingKnock] = useState<{ member: Member; roomId: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [chatWith, setChatWith] = useState<Member | null>(null);

  // Function to play a simple phone ringtone sound for incoming calls
  const playRingtone = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const playBurst = () => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        let t = audioContext.currentTime;
        const tone = (freq: number, dur: number) => {
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
          t += dur;
        };

        tone(800, 0.4);
        tone(600, 0.4);
        tone(800, 0.4);
        tone(600, 0.4);

        osc.start(audioContext.currentTime);
        osc.stop(t);
      };

      playBurst();

      let ringCount = 0;
      const ringInterval = setInterval(() => {
        ringCount++;
        if (ringCount >= 5) {
          clearInterval(ringInterval);
          return;
        }
        playBurst();
      }, 2000);

    } catch (e) {
      console.error('Failed to play ringtone:', e);
    }
  }, []);

  useEffect(() => {
    api.get('/api/offices/me')
      .then(({ data }) => {
        setOfficeName(data.office.name);
        setOfficeId(data.office._id);
        setHasOffice(true);
        // Set default chat with current user
        if (user) {
          setChatWith({ ...(user as Member) });
        }
      })
      .catch(() => setHasOffice(false));
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: IncomingCall) => {
      setIncomingCall(data);
      playRingtone();
    };
    const handleCallAccepted = ({ roomId }: { roomId: string }) => {
      setOutgoingKnock(null);
      router.push(`/room/${roomId}`);
    };
    const handleCallDeclined = () => setOutgoingKnock(null);

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_declined', handleCallDeclined);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_declined', handleCallDeclined);
    };
  }, [socket, router]);

  const handleKnock = useCallback((member: Member) => {
    const roomId = crypto.randomUUID();
    socket?.emit('knock', { toId: member._id, roomId });
    setOutgoingKnock({ member, roomId });
    // Auto-cancel after 60 seconds
    setTimeout(() => setOutgoingKnock((prev) => prev?.roomId === roomId ? null : prev), 60_000);
  }, [socket]);

  const handleCancelKnock = useCallback(() => {
    if (outgoingKnock) {
      socket?.emit('call_decline', { toId: outgoingKnock.member._id });
    }
    setOutgoingKnock(null);
  }, [outgoingKnock, socket]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    socket?.emit('call_accept', { toId: incomingCall.fromId, roomId: incomingCall.roomId });
    setIncomingCall(null);
    router.push(`/room/${incomingCall.roomId}`);
  }, [incomingCall, socket, router]);

  const handleDeclineCall = useCallback(() => {
    if (!incomingCall) return;
    socket?.emit('call_decline', { toId: incomingCall.fromId });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  if (hasOffice === null) return <Spinner />;

  if (!hasOffice) {
    return (
      <OfficeSetup
        userName={user?.name ?? ''}
        onComplete={(name) => { setOfficeName(name); setHasOffice(true); }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1a1a2e]">
      <TopBar officeName={officeName} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onKnock={handleKnock}
          onChat={(member) => setChatWith({ ...member })}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Chat panel as main content */}
        {chatWith ? (
          <ChatPanel 
            member={chatWith} 
            onClose={() => setChatWith(null)} 
            onCall={handleKnock}
            isFullScreen
          />
        ) : (
          <main className="flex flex-1 flex-col overflow-y-auto p-6">
            <div className="flex h-full items-center justify-center text-center">
              <div className="flex flex-col gap-4">
                <div className="text-6xl">💬</div>
                <p className="text-lg font-semibold text-[#d4d4d4]">Select a conversation to start</p>
                <p className="text-sm text-[#5a5a5a]">Click on any team member to open chat</p>
              </div>
            </div>
          </main>
        )}
      </div>

      {inviteOpen && (
        <InviteModal officeId={officeId} onClose={() => setInviteOpen(false)} />
      )}
      {outgoingKnock && (
        <OutgoingKnockOverlay name={outgoingKnock.member.name} onCancel={handleCancelKnock} />
      )}
      {incomingCall && (
        <IncomingKnockOverlay
          fromName={incomingCall.fromName}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
    </div>
  );
}

function ActionCard({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick(): void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg border border-[#1e3a5f] bg-[#16213e] px-4 py-3 text-left transition hover:border-[#1D9E75] hover:bg-[#0f3460]">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-[#64748b]">{desc}</p>
      </div>
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center bg-[#1a1a2e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
    </div>
  );
}
