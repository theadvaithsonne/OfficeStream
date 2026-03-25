'use client';

import { Participant, Track } from 'livekit-client';
import { ParticipantTile, useTracks } from '@livekit/components-react';
import { useVideoGrid } from '@/hooks/useVideoGrid';

interface VideoGridProps {
  /** Whether there is an active screen share to prioritise. */
  hasScreenShare?: boolean;
}

/**
 * Responsive video grid that auto-reflows based on participant count.
 * 1 person → full width, 2 → side by side, 3-4 → 2×2, 5+ → auto-fill.
 */
export default function VideoGrid({ hasScreenShare }: VideoGridProps) {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  const participants = cameraTracks.map((t) => t.participant) as Participant[];
  const { gridStyle } = useVideoGrid(participants);

  if (hasScreenShare && screenTracks.length > 0) {
    return (
      <div className="flex h-full gap-2 overflow-hidden">
        {/* Main screen share area */}
        <div className="flex-1 rounded-xl overflow-hidden bg-[#0f3460]">
          <ParticipantTile trackRef={screenTracks[0]} />
        </div>
        {/* Camera strip on right */}
        <div className="flex w-48 flex-col gap-2 overflow-y-auto">
          {cameraTracks.map((track) => (
            <div key={track.participant.sid} className="aspect-video rounded-lg overflow-hidden bg-[#0f3460] shrink-0">
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid h-full gap-2 overflow-hidden"
      style={gridStyle}
    >
      {cameraTracks.map((track) => (
        <div key={track.participant.sid} className="relative rounded-xl overflow-hidden bg-[#0f3460] min-h-[180px]">
          <ParticipantTile trackRef={track} />
        </div>
      ))}
    </div>
  );
}
