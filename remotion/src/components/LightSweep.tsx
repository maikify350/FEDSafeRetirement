import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Two soft light bands drifting back and forth across the frame, a quarter cycle apart so their
 * velocities never reach zero together. A cinematic device (passing light sources) that also
 * guarantees continuous visible motion on dark or flat graphics, where a camera move alone can
 * read as frozen (check_render.py fails anything still for > 1.2 s).
 */
export const LightSweep = ({ frames, strength = 0.2 }: { frames: number; strength?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const period = 7; // seconds per full back-and-forth
  const a = 50 + 62 * Math.sin((2 * Math.PI * t) / period);
  const b = 50 + 62 * Math.cos((2 * Math.PI * t) / period + 0.6);
  const fade = interpolate(frame, [0, 12, frames - 12, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const band = (x: number, deg: number, s: number) =>
    `linear-gradient(${deg}deg, rgba(255,255,255,0) ${x - 30}%, rgba(255,236,205,${s * fade}) ${x}%, rgba(255,255,255,0) ${x + 30}%)`;
  return (
    <>
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", background: band(a, 100, strength) }} />
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", background: band(b, 70, strength * 0.6) }} />
    </>
  );
};
