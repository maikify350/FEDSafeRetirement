"use client";

import { withBasePath } from "@/lib/review-utils";

export function AudioPlayer({ src, compact = false }: { src: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-[1.35rem] border border-fed-blue/10 bg-white/85 ${
        compact ? "mt-5 p-4" : "p-5"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
        Soundtrack Preview
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Local MP3 attached for short-video review.
      </p>
      <audio controls preload="none" className="mt-4 w-full">
        <source src={withBasePath(src)} type="audio/mpeg" />
        Your browser does not support MP3 playback.
      </audio>
    </div>
  );
}
