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

export interface WordTiming { w: string; t: number; e: number }
export interface CaptionBlock { shot: number; words: number[]; key: number }

export interface ExplainerReelProps {
  [key: string]: unknown;
  title?: string;
  /** Word timings from the ElevenLabs take; with captionBlocks they drive the word-synced caption. */
  words?: WordTiming[];
  captionBlocks?: CaptionBlock[];
  /** Draw layout bands and the zones platform UI covers (for stills). */
  guides?: boolean;
  /** Stamp the output DRAFT (half-size preview, never delivered). */
  draft?: boolean;
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
  // Amplitudes are sized for 8–15 s long-form shots: every move must stay visibly alive for the
  // whole shot (check_render.py fails anything frozen > 1.2 s), so even "static" drifts slowly.
  switch (motion) {
    case "pan_slow_right": return `scale(1.28) translateX(${interpolate(p, [0, 1], [9, -9])}%) translateY(${interpolate(p, [0, 1], [1.5, -1.5])}%)`;
    case "push_forward":
    case "slow_dolly_in": return `scale(${interpolate(p, [0, 1], [1.02, 1.42])}) translateY(${interpolate(p, [0, 1], [0, -2])}%)`;
    case "dolly_out": return `scale(${interpolate(p, [0, 1], [1.44, 1.04])})`;
    case "crash_zoom": return `scale(${interpolate(ease(p), [0, 1], [1.0, 1.7])})`;
    case "tilt_up":
    case "aerial_reveal": return `scale(1.32) translateY(${interpolate(p, [0, 1], [10, -10])}%) translateX(${interpolate(p, [0, 1], [-1.5, 1.5])}%)`;
    case "orbit":
    case "dynamic_orbit": return `scale(1.3) translateX(${Math.sin(p * Math.PI) * 7}%) translateY(${Math.cos(p * Math.PI) * 3.5}%) rotate(${interpolate(p, [0, 1], [-2, 2])}deg)`;
    case "fly_by_left":
    case "drone_fly_by": return `scale(1.38) translateX(${interpolate(p, [0, 1], [13, -13])}%) translateY(${interpolate(p, [0, 1], [3, -2])}%)`;
    case "fly_by_right":
    case "tracking_shot": return `scale(1.38) translateX(${interpolate(p, [0, 1], [-13, 13])}%)`;
    case "handheld": return `scale(1.14) translate(${Math.sin(p * 31) * 0.8}%, ${Math.cos(p * 23) * 0.6}%)`;
    default: return `scale(${interpolate(p, [0, 1], [1.04, 1.26])}) translate(${interpolate(p, [0, 1], [2.5, -2.5])}%, ${interpolate(p, [0, 1], [-2, 2])}%)`;
  }
};

/** Frames the incoming shot overlaps the outgoing one, so no cut ever dips to black. */
export const TRANSITION_OVERLAP = 14;

/** Overlay text (era badge, kinetic headline) of the outgoing shot fades during the overlap so two headlines never stack. */
const OverlayFade = ({ frames, children }: { frames: number; children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [frames - 4, frames + 6], [1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>{children}</AbsoluteFill>;
};

const Transitioner = ({ transition, frames, fadeOut, children }: { transition: Transition; frames: number; fadeOut?: boolean; children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const inN = Math.min(TRANSITION_OVERLAP, Math.floor(frames / 3));
  const p = interpolate(frame, [0, inN], [0, 1], clamp);
  const out = fadeOut ? interpolate(frame, [frames - 12, frames], [1, 0], clamp) : 1;
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
    <div style={{ position: "absolute", left: vertical ? 60 : 110, right: vertical ? 60 : 110, top: vertical ? "34%" : "auto", bottom: vertical ? "auto" : 190, display: "flex", flexWrap: "wrap", fontSize: vertical ? 88 : 84, columnGap: "0.28em", rowGap: "0.05em", justifyContent: vertical ? "center" : "flex-start" }}>
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

/** Word-synced caption: a word appears when it is spoken; the word being said is bold, said words turn grey, the key word keeps full ink with a marker. */
const WordCaption = ({ words, blocks, accent }: { words: WordTiming[]; blocks: CaptionBlock[]; accent: string }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const vertical = width < 1200;
  const t = frame / fps;
  const bi = blocks.findIndex((b, i) => {
    const first = words[b.words[0]];
    const last = words[b.words[b.words.length - 1]];
    const next = blocks[i + 1];
    const to = next && words[next.words[0]] ? words[next.words[0]].t - 0.05 : Infinity;
    return first && last && t >= first.t - 0.12 && t < Math.min(to, last.e + 0.6);
  });
  if (bi < 0) return null;
  const block = blocks[bi];
  return (
    <div style={{ position: "absolute", left: "6%", right: "6%", bottom: vertical ? "22%" : 70, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.32em", fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: vertical ? 52 : 40, lineHeight: 1.25, textShadow: "0 4px 18px rgba(0,0,0,.7)" }}>
      {block.words.map((wi, k) => {
        const w = words[wi];
        if (!w) return null;
        const spoken = t >= w.t - 0.12;
        const saying = spoken && t < w.e + 0.08;
        const isKey = k === block.key;
        const blur = interpolate(t, [w.t - 0.12, w.t + 0.04], [6, 0], clamp);
        return (
          <span key={wi} style={{ opacity: spoken ? 1 : 0, filter: `blur(${spoken ? blur : 0}px)`, color: isKey || saying ? "#fff" : "rgba(255,255,255,0.62)", fontWeight: isKey || saying ? 900 : 700, padding: isKey ? "0 0.25em" : 0, borderRadius: 12, background: isKey && spoken ? `${accent}33` : "transparent", boxShadow: isKey && spoken ? `inset 0 0 0 3px ${accent}` : "none" }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

/** Per-shot caption fallback (used until word timings exist): shows the active shot's narration. */
const ShotCaptions = ({ scenes, fps }: { scenes: ExplainerScene[]; fps: number }) => {
  const frame = useCurrentFrame();
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const frames = Math.max(1, Math.round(scenes[i].durationSec * fps));
    if (frame >= cursor && frame < cursor + frames) {
      return scenes[i].narration ? (
        <Sequence key={i} from={cursor} durationInFrames={frames} layout="none">
          <Caption text={scenes[i].narration} />
        </Sequence>
      ) : null;
    }
    cursor += frames;
  }
  return null;
};

const Guides = () => {
  const { width, height } = useVideoConfig();
  const vertical = width < 1200;
  return (
    <AbsoluteFill style={{ fontFamily: "monospace", fontSize: 22, color: "#ff3b7f", pointerEvents: "none" }}>
      {vertical ? (
        <>
          <div style={{ position: "absolute", top: height * 0.12, left: 0, right: 0, borderTop: "2px dashed #ff3b7f" }}>&nbsp;safe top (12%)</div>
          <div style={{ position: "absolute", top: height * 0.78, bottom: 0, left: 0, right: 0, background: "rgba(255,59,127,0.16)" }}>&nbsp;platform caption + buttons (bottom 22%)</div>
          <div style={{ position: "absolute", top: height * 0.55, bottom: height * 0.22, right: 0, width: 130, background: "rgba(255,59,127,0.16)" }} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 60, border: "2px dashed #ff3b7f" }}>&nbsp;60 px padding</div>
          <div style={{ position: "absolute", right: 60, bottom: 60, width: 480, height: 336, background: "rgba(255,59,127,0.16)" }}>&nbsp;camera box (keep empty)</div>
        </>
      )}
    </AbsoluteFill>
  );
};

const DraftStamp = () => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 54, background: "rgba(220,30,30,0.85)", color: "#fff", fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>DRAFT · not checked yet</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Inter, Arial Black, sans-serif", fontWeight: 900, fontSize: width * 0.22, letterSpacing: 8, WebkitTextStroke: "4px rgba(220,30,30,0.6)" }}>DRAFT</div>
    </AbsoluteFill>
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
  words,
  captionBlocks,
  guides = false,
  draft = false,
}: ExplainerReelProps) => {
  const wordSynced = Boolean(words && words.length && captionBlocks && captionBlocks.length);
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
        const isLast = idx === scenes.length - 1;
        // Later shots render on top; extend each by the overlap so the outgoing shot stays under the incoming fade.
        const span = isLast ? frames : frames + TRANSITION_OVERLAP;
        return (
          <Sequence key={idx} from={from} durationInFrames={span} name={`Shot ${idx + 1}${scene.era ? ` · ${scene.era}` : ""}`}>
            <Transitioner transition={scene.transition} frames={span} fadeOut={isLast}>
              {use3D ? <ExplainerScene3D scene={scene} frames={frames} accent={accent} /> : <Scene2D scene={scene} frames={frames} />}
              <OverlayFade frames={frames}>
                {scene.era && <EraBadge era={scene.era} accent={accent} />}
                {scene.onscreenText && <OnscreenText text={scene.onscreenText} accent={accent} />}
              </OverlayFade>
            </Transitioner>
          </Sequence>
        );
      })}

      {showCaptions && !wordSynced && <ShotCaptions scenes={scenes} fps={fps} />}
      {showCaptions && wordSynced && words && captionBlocks && <WordCaption words={words} blocks={captionBlocks} accent={accent} />}
      {showProgress && <Progress total={totalFrames} accent={accent} />}
      {guides && <Guides />}
      {draft && <DraftStamp />}
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
