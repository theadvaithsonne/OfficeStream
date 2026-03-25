'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type SetupMode = 'idle' | 'create' | 'join';

interface OfficeSetupProps {
  userName: string;
  /** Called with the office name once the user has created or joined an office. */
  onComplete(officeName: string): void;
}

/** Full-page wizard shown when the user has no office yet (create or join flow). */
export default function OfficeSetup({ userName, onComplete }: OfficeSetupProps) {
  const [mode, setMode] = useState<SetupMode>('idle');
  const [officeName, setOfficeName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!officeName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/offices', { name: officeName.trim() });
      onComplete(data.office.name);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create office');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/offices/join', { code: inviteCode.trim() });
      onComplete(data.office.name);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h2 className="mb-2 text-center text-xl font-semibold text-white">
          Welcome, {userName}!
        </h2>
        <p className="mb-6 text-center text-sm text-[#9d9d9d]">
          Create a new office or join one with an invite code.
        </p>

        {mode === 'idle' && (
          <div className="flex gap-3">
            <ModeCard icon="🏢" label="Create Office" desc="Start your own workspace" onClick={() => setMode('create')} />
            <ModeCard icon="🔗" label="Join Office" desc="Use an invite code" onClick={() => setMode('join')} />
          </div>
        )}

        {mode === 'create' && (
          <SetupCard title="Create Office" error={error} onBack={() => setMode('idle')}>
            <input
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Acme Corp"
              className="mb-3 w-full rounded-md border border-[#1e3a5f] bg-[#0f3460] px-3 py-2 text-sm text-white placeholder-[#64748b] outline-none focus:border-[#1D9E75]"
            />
            <ActionButton label="Create" loadingLabel="Creating…" loading={loading} onClick={handleCreate} />
          </SetupCard>
        )}

        {mode === 'join' && (
          <SetupCard title="Join with Invite Code" error={error} onBack={() => setMode('idle')}>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Paste invite code"
              className="mb-3 w-full rounded-md border border-[#1e3a5f] bg-[#0f3460] px-3 py-2 text-sm text-white placeholder-[#64748b] outline-none focus:border-[#1D9E75]"
            />
            <ActionButton label="Join" loadingLabel="Joining…" loading={loading} onClick={handleJoin} />
          </SetupCard>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeCard({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick(): void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#16213e] px-4 py-6 text-center transition hover:border-[#1D9E75] hover:bg-[#0f3460]"
    >
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-[#64748b]">{desc}</p>
    </button>
  );
}

function SetupCard({
  title,
  error,
  onBack,
  children,
}: {
  title: string;
  error: string;
  onBack(): void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#1e3a5f] bg-[#16213e] p-6">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {error && <p className="mb-3 text-xs text-[#fc8181]">{error}</p>}
      {children}
      <button
        onClick={onBack}
        className="mt-2 w-full rounded-md border border-[#1e3a5f] py-2 text-sm text-[#a0aec0] hover:bg-[#0f3460]"
      >
        Back
      </button>
    </div>
  );
}

function ActionButton({
  label,
  loadingLabel,
  loading,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onClick(): void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-md bg-[#1D9E75] py-2 text-sm font-semibold text-white hover:bg-[#25c792] disabled:opacity-60"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
