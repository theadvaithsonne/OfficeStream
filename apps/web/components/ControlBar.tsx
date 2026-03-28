'use client';

import { useCallback, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { useScreenShare } from '@/hooks/useScreenShare';

interface ControlBarProps {
  onLeave(): void;
  isHost?: boolean;
  recording?: boolean;
  onRecordStart?(): void;
  onRecordStop?(): void;
}

/** Bottom control bar used in both room and call pages. */
export default function ControlBar({
  onLeave, isHost, recording, onRecordStart, onRecordStop,
}: ControlBarProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const { sharing, startShare, stopShare } = useScreenShare(localParticipant);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);

  const handleScreenClick = useCallback(async () => {
    if (sharing) { await stopShare(); return; }
    setShowAudioPrompt(true);
  }, [sharing, stopShare]);

  const handleStartShare = useCallback(async (audio: boolean) => {
    setShowAudioPrompt(false);
    await startShare(audio);
  }, [startShare]);

  const toggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCam = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  return (
    <div className="flex items-center justify-center gap-3 bg-[#0f3460] px-6 py-3 border-t border-[#1e3a5f]">
      {/* Mic */}
      <CtrlBtn
        active={isMicrophoneEnabled}
        onClick={toggleMic}
        activeIcon={<MicIcon />}
        inactiveIcon={<MicOffIcon />}
        label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
        danger={!isMicrophoneEnabled}
      />

      {/* Camera */}
      <CtrlBtn
        active={isCameraEnabled}
        onClick={toggleCam}
        activeIcon={<CamIcon />}
        inactiveIcon={<CamOffIcon />}
        label={isCameraEnabled ? 'Stop video' : 'Start video'}
        danger={!isCameraEnabled}
      />

      {/* Screen share */}
      <div className="relative">
        {showAudioPrompt && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 rounded-lg bg-[#1e3a5f] border border-[#2d5a8e] p-3 shadow-xl z-50">
            <p className="text-xs text-[#d4d4d4] mb-2 text-center">Share audio?</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleStartShare(true)}
                className="flex-1 rounded-md bg-[#6264a7] py-1.5 text-xs text-white hover:bg-[#7b83c7] transition"
              >Yes</button>
              <button
                onClick={() => handleStartShare(false)}
                className="flex-1 rounded-md bg-[#2d5a8e] py-1.5 text-xs text-white hover:bg-[#3a6fa8] transition"
              >No</button>
            </div>
            <button
              onClick={() => setShowAudioPrompt(false)}
              className="absolute top-1 right-2 text-[#9d9d9d] hover:text-white text-xs"
            >✕</button>
          </div>
        )}
        <CtrlBtn
          active={!sharing}
          onClick={handleScreenClick}
          activeIcon={<ScreenIcon />}
          inactiveIcon={<ScreenIcon />}
          label={sharing ? 'Stop sharing' : 'Share screen'}
          highlight={sharing}
        />
      </div>

      {/* Record */}
      {onRecordStart && onRecordStop && (
        <CtrlBtn
          active={!recording}
          onClick={recording ? onRecordStop : onRecordStart}
          activeIcon={<RecordIcon />}
          inactiveIcon={<RecordIcon />}
          label={recording ? 'Stop recording' : 'Record'}
          danger={recording}
        />
      )}

      {/* Leave */}
      <button
        onClick={onLeave}
        className="ml-4 flex items-center gap-1.5 rounded-lg bg-[#fc8181] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#feb2b2]"
      >
        <PhoneOffIcon /> Leave
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CtrlBtn({
  active, onClick, activeIcon, inactiveIcon, label, danger, highlight,
}: {
  active: boolean;
  onClick?: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition
        ${danger ? 'bg-[#fc8181]/20 text-[#fc8181] hover:bg-[#fc8181]/30'
          : highlight ? 'bg-[#1D9E75]/20 text-[#1D9E75] hover:bg-[#1D9E75]/30'
          : 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8e]'}`}
    >
      <span className="text-lg">{active ? activeIcon : inactiveIcon}</span>
      <span className="hidden sm:block">{label}</span>
    </button>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);
const MicOffIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <line strokeLinecap="round" x1="1" y1="1" x2="23" y2="23" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8" />
  </svg>
);
const CamIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CamOffIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
    <line strokeLinecap="round" x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const ScreenIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
    <line strokeLinecap="round" x1="8" y1="21" x2="16" y2="21" />
    <line strokeLinecap="round" x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const RecordIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" />
  </svg>
);
const PhoneOffIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.91 19.79 19.79 0 0 1 1.19 1.27 2 2 0 0 1 3.18 1a12.84 12.84 0 0 1 2.81.7 2 2 0 0 1 .45 2.11L5.17 5.08a16 16 0 0 0 2.59 3.43" />
    <line strokeLinecap="round" x1="23" y1="1" x2="1" y2="23" />
  </svg>
);
