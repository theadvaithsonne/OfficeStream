'use client';

import { use } from 'react';
import Link from 'next/link';

/** Placeholder for the live-stream viewer page (RTMP ingress + HLS/WebRTC egress — coming soon). */
export default function StreamPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = use(params);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-4xl">📺</div>
      <h1 className="text-xl font-semibold text-white">Live Stream</h1>
      <p className="text-sm text-[#9d9d9d]">Stream: <span className="font-mono text-[#6264a7]">{streamId}</span></p>
      <p className="text-xs text-[#5a5a5a]">RTMP ingress + HLS/WebRTC egress coming soon</p>
      <Link href="/dashboard" className="mt-2 rounded-md bg-[#6264a7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7b83c7]">
        Back to Dashboard
      </Link>
    </div>
  );
}
