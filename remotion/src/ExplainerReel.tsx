/**
 * ExplainerReel — platform-agnostic composition driven by Explainer Studio hyperframes.
 *
 * The only two ways to animate:
 *   • "2d_kinetic"  — scene image + CSS camera move + kinetic text (DOM, deterministic)
 *   • "3d_threejs"  — @remotion/three ThreeCanvas with a real camera path (WebGL in Headless Chrome)
 *
 * Width/height/duration come from props via calculateMetadata, so one composition serves
 * 16:9 YouTube, 9:16 Shorts/Reels/TikTok and 4:5 feed posts.
 */
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { palette } from "./components/SharedComponents";
import { ExplainerScene3D } from "./ExplainerScene3D";

export const EXPLAINER_FPS = 30;

export type CameraMotion =
  | "static" | "pan_slow_right" | "push_forward" | "orbit" | "tilt_up"
  | "drone_fly_by" | "dynamic_orbit" | "fly_by_left" | "fly_by_right" | "crash_zoom" | "dolly_out"
  | "slow_dolly_in" | "tracking_shot" | "aerial_reveal" | "handheld";

export type Transition = "fade" | "slide_left" | "zoom_in" | "dissolve" | "glitch";

export interface ExplainerScene {
  image?: string;          // staticFile name or absolute URL (2D background / 3D backdrop)
  clip?: string;           // optional generated video clip (Krea/Higgsfield) — rendered via <Img> poster fallback if unsupported
  narration: string;
  onscreenText?: string;
  era?: string;
  cameraMotion: CameraMotion;
  transition: Transition;
  durationSec: number;
  animationMode?: "2d_kinetic" | "3d_threejs";
  assets3d?: { slot: string; name: string; source_url?: string }[];
}

export interface ExplainerReelProps {
  [key: string]: unknown;
  title?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  narrationAudio?: string;
  backgroundMusic?: string;
  musicVolume?: number;
  scenes?: ExplainerScene[];
  showCaptions?: boolean;
  showProgress?: boolean;
  showChapterBug?: boolean;
  accent?: string;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** CSS transform for a 2D camera move over the scene duration. */
export const cameraTransform2D = (motion: CameraMotion, p: number): string => {
  switch (motion) {
    case "pan_slow_right": return `scale(1.18) translateX(${interpolate(p, [0, 1], [4, -4])}%)`;
    case "push_forward":
    case "slow_dolly_in": return `scale(${interpolate(p, [0, 1], [1.04, 1.22])})`;
    case "dolly_out": return `scale(${interpolate(p, [0, 1], [1.24, 1.04])})`;
    case "crash_zoom": return `scale(${interpolate(ease(p), [0, 1], [1.0, 1.6])})`;
    case "tilt_up":
    case "aerial_reveal": return `scale(1.2) translateY(${interpolate(p, [0, 1], [5, -5])}%)`;
    case "orbit":
    case "dynamic_orbit": return `scale(1.22) translateX(${Math.sin(p * Math.PI) * 4}%) translateY(${Math.cos(p * Math.PI) * 2}%) rotate(${interpolate(p, [0, 1], [-1.5, 1.5])}deg)`;
    case "fly_by_left":
    case "drone_fly_by": return `scale(1.3) translateX(${interpolate(p, [0, 1], [10, -10])}%) translateY(${interpolate(p, [0, 1], [3, -2])}%)`;
    case "fly_by_right":
    case "tracking_shot": return `scale(1.3) translateX(${interpolate(p, [0, 1], [-10, 10])}%)`;
    case "handheld": return `scale(1.12) translate(${Math.sin(p * 31) * 0.6}%, ${Math.cos(p * 23) * 0.5}%)`;
    default: return "scale(1.06)";
  }
};

const Transitioner = ({ transition, frames, children }: { transition: Transition; frames: number; children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const inN = Math.min(14, Math.floor(frames / 3));
  const p = interpolate(frame, [0, inN], [0, 1], clamp);
  const out = interpolate(frame, [frames - 10, frames], [1, 0], clamp);
  let transform = "none";
  if (transition === "slide_left") transform = `translateX(${interpolate(ease(p), [0, 1], [8, 0])}%)`;
  if (transition === "zoom_in") transform = `scale(${interpolate(ease(p), [0, 1], [1.12, 1])})`;
  if (transition === "glitch") transform = `translateX(${p < 1 ? Math.sin(frame * 9) * (1 - p) * 1.5 : 0}%) skewX(${p < 1 ? (1 - p) * 3 : 0}deg)`;
  const opacity = transition === "dissolve" ? Math.min(p, out) : Math.min(interpolate(p, [0, 1], [0, 1]), out);
  return <AbsoluteFill style={{ opacity, transform }}>{children}</AbsoluteFill>;
};

const Scene2D = ({ scene, frames }: { scene: ExplainerScene; frames: number }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, frames], [0, 1], clamp);
  const src = scene.image ? (scene.image.startsWith("http") ? scene.image : staticFile(scene.image)) : null;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy, overflow: "hidden" }}>
      {src && (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: cameraTransform2D(scene.cameraMotion, p), transformOrigin: "center" }} />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

const EraBadge = ({ era, accent }: { era: string; accent: string }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = width < 1200;
  const y = interpolate(frame, [0, 14], [-30, 0], { ...clamp, easing: ease });
  const o = interpolate(frame, [0, 12], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top: vertical ? 220 : 72, left: vertical ? 60 : 90, transform: `translateY(${y}px)`, opacity: o, padding: "10px 22px", borderRadius: 999, background: accent, color: "#0b1220", fontWeight: 900, fontSize: vertical ? 40 : 34, letterSpacing: 2, fontFamily: "Inter, Arial, sans-serif", boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
      {era}
    </div>
  );
};

const OnscreenText = ({ text, accent }: { text: string; accent: string }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = width < 1200;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div style={{ position: "absolute", left: vertical ? 60 : 110, right: vertical ? 60 : 110, top: vertical ? "34%" : "auto", bottom: vertical ? "auto" : 190, display: "flex", flexWrap: "wrap", gap: "0.25em", justifyContent: vertical ? "center" : "flex-start" }}>
      {words.map((w, i) => {
        const d = i * 3;
        const o = interpolate(frame, [d, d + 8], [0, 1], clamp);
        const y = interpolate(frame, [d, d + 10], [26, 0], { ...clamp, easing: ease });
        return (
          <span key={i} style={{ display: "inline-block", opacity: o, transform: `translateY(${y}px)`, color: "#fff", fontFamily: "Inter, Arial, sans-serif", fontWeight: 900, fontSize: vertical ? 88 : 84, lineHeight: 1.05, textShadow: "0 6px 24px rgba(0,0,0,.6)", borderBottom: i === words.length - 1 ? `10px solid ${accent}` : "none" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Caption = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = width < 1200;
  const o = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: "7%", right: "7%", bottom: vertical ? "22%" : 70, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ background: "rgba(8,12,20,0.78)", color: "#f8fafc", padding: vertical ? "18px 26px" : "14px 22px", borderRadius: 18, fontSize: vertical ? 44 : 36, fontWeight: 700, textAlign: "center", lineHeight: 1.25, fontFamily: "Inter, Arial, sans-serif", border: "1px solid rgba(255,255,255,0.12)" }}>
        {text}
      </div>
    </div>
  );
};

const Progress = ({ total, accent }: { total: number; accent: string }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [0, total], [0, 100], clamp);
  return <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: `${w}%`, background: accent }} />;
};

export const ExplainerReel = ({
  title = "Explainer",
  durationSec = 60,
  narrationAudio,
  backgroundMusic,
  musicVolume = 0.05,
  scenes = [],
  showCaptions = true,
  showProgress = true,
  accent = palette.gold,
}: ExplainerReelProps) => {
  const { fps } = useVideoConfig();
  const totalFrames = Math.round(durationSec * fps);
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {narrationAudio && <Audio src={narrationAudio.startsWith("http") ? narrationAudio : staticFile(narrationAudio)} volume={2.0} />}
      {backgroundMusic && <Audio src={backgroundMusic.startsWith("http") ? backgroundMusic : staticFile(backgroundMusic)} volume={musicVolume} />}

      {scenes.map((scene, idx) => {
        const frames = Math.max(1, Math.round((scene.durationSec || durationSec / Math.max(1, scenes.length)) * fps));
        const from = cursor;
        cursor += frames;
        const use3D = scene.animationMode === "3d_threejs";
        return (
          <Sequence key={idx} from={from} durationInFrames={frames} name={`Shot ${idx + 1}${scene.era ? ` · ${scene.era}` : ""}`}>
            <Transitioner transition={scene.transition} frames={frames}>
              {use3D ? <ExplainerScene3D scene={scene} frames={frames} accent={accent} /> : <Scene2D scene={scene} frames={frames} />}
              {scene.era && <EraBadge era={scene.era} accent={accent} />}
              {scene.onscreenText && <OnscreenText text={scene.onscreenText} accent={accent} />}
              {showCaptions && scene.narration && <Caption text={scene.narration} />}
            </Transitioner>
          </Sequence>
        );
      })}

      {showProgress && <Progress total={totalFrames} accent={accent} />}
      <div style={{ position: "absolute", top: 24, right: 36, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, Arial, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{title.toUpperCase()}</div>
    </AbsoluteFill>
  );
};

/** Width/height/duration follow the platform preset sent in props. */
export const calculateExplainerMetadata: CalculateMetadataFunction<ExplainerReelProps> = ({ props }) => {
  const width = props.width || 1080;
  const height = props.height || 1920;
  const durationSec = props.durationSec || (props.scenes || []).reduce((a, s) => a + (s.durationSec || 0), 0) || 60;
  return { width, height, durationInFrames: Math.max(1, Math.round(durationSec * EXPLAINER_FPS)), fps: EXPLAINER_FPS, props };
};
