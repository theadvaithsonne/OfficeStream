'use client';

interface OutgoingKnock {
  name: string;
  onCancel(): void;
}

interface IncomingKnock {
  fromName: string;
  onAccept(): void;
  onDecline(): void;
}

/** Floating overlay shown while waiting for the callee to respond to an outgoing knock. */
export function OutgoingKnockOverlay({ name, onCancel }: OutgoingKnock) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-xl border border-[#1e3a5f] bg-[#16213e] px-5 py-4 shadow-2xl">
      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-[#1D9E75] text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Calling {name}…</p>
        <p className="text-xs text-[#64748b]">Waiting for answer</p>
      </div>
      <button
        onClick={onCancel}
        aria-label="Cancel call"
        className="ml-2 rounded-full bg-[#fc8181] p-2 text-white transition hover:bg-[#feb2b2]"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}

/** Floating overlay shown when another user is knocking on the current user. */
export function IncomingKnockOverlay({ fromName, onAccept, onDecline }: IncomingKnock) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-[#1D9E75] bg-[#16213e] px-6 py-4 shadow-2xl">
      <div className="flex h-10 w-10 animate-bounce items-center justify-center rounded-full bg-[#1D9E75] text-sm font-bold text-white">
        {fromName.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">📞 {fromName} is calling you</p>
        <p className="text-xs text-[#64748b]">Incoming call</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="rounded-full bg-[#1D9E75] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#25c792]"
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="rounded-full bg-[#fc8181] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#feb2b2]"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
