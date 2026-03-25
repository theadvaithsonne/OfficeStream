'use client';
import { useMemo } from 'react';
import type { Participant } from 'livekit-client';

/** Computes responsive CSS grid columns based on participant count. */
export function useVideoGrid(participants: Participant[]) {
  const count = participants.length;

  const gridStyle = useMemo<React.CSSProperties>(() => {
    if (count <= 1) return { gridTemplateColumns: '1fr' };
    if (count === 2) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    if (count <= 4) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    return { gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' };
  }, [count]);

  return { gridStyle, count };
}
