#!/usr/bin/env node
/**
 * Render an Explainer Studio plan with the ExplainerReel composition, then check it.
 *
 *   node scripts/render_explainer.mjs <plan.json> [--draft] [--stills 1.2,3.4] [--guides] [--out file.mp4] [--gl swangle|angle] [--no-check]
 *
 * <plan.json> is the plan exported from /explainer-studio (or the response of /api/explainer/generate|voice).
 * Draft  = half size, 30 fps, stamped DRAFT, never delivered.
 * Final  = platform size, then check_render.py + loudness.py --fix (the .loud.mp4 replaces the render).
 * The voice MP3 (plan.voice.audio_url) is downloaded into public/explainer/<slug>/ so Remotion can bundle it.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const args = process.argv.slice(2);
const planPath = args[0];
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
if (!planPath || !fs.existsSync(planPath)) {
  console.error("usage: node scripts/render_explainer.mjs <plan.json> [--draft] [--stills s,s] [--guides] [--out file] [--gl swangle] [--no-check]");
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));
const brief = plan.brief || {};
const TARGETS = { youtube_long: [1920, 1080], youtube_shorts: [1080, 1920], instagram_reel: [1080, 1920], instagram_feed: [1080, 1350], tiktok: [1080, 1920] };
const [W, H] = TARGETS[brief.target] || [1080, 1920];
const slug = (brief.title || plan.publishing?.title_options?.[0] || "explainer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "explainer";
const draft = args.includes("--draft");

// voice → public/explainer/<slug>/voice.mp3
let narrationAudio;
if (plan.voice?.audio_url) {
  const dir = path.join(root, "public", "explainer", slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "voice.mp3");
  const r = spawnSync("curl", ["-sSL", "-o", file, plan.voice.audio_url]);
  if (r.status === 0 && fs.existsSync(file)) narrationAudio = `explainer/${slug}/voice.mp3`;
  else console.warn("voice download failed; rendering without narration");
}

const scenes = (plan.shots || []).map((s) => ({
  image: s.scene_image || undefined,
  clip: s.asset_url || undefined,
  narration: s.narration,
  onscreenText: s.onscreen_text || undefined,
  era: s.era || undefined,
  cameraMotion: s.camera_motion || "push_forward",
  transition: s.transition || "fade",
  durationSec: Math.max(0.5, Number(s.timestamp_end) - Number(s.timestamp_start)),
  animationMode: s.animation_mode || brief.animationMode || "2d_kinetic",
  assets3d: s.assets_3d || [],
}));
const durationSec = plan.voice?.duration || scenes.reduce((a, s) => a + s.durationSec, 0) || brief.durationSec;
const props = {
  title: brief.title || plan.publishing?.title_options?.[0] || "Explainer",
  width: draft ? Math.round(W / 2) : W,
  height: draft ? Math.round(H / 2) : H,
  durationSec,
  narrationAudio,
  backgroundMusic: plan.music || undefined,
  musicVolume: plan.music_volume ?? 0.05,
  scenes,
  words: plan.voice?.words,
  captionBlocks: plan.voice?.caption_blocks,
  showCaptions: true,
  guides: args.includes("--guides"),
  draft,
};

const outDir = path.join(root, "out", "explainer");
fs.mkdirSync(outDir, { recursive: true });
const propsFile = path.join(outDir, `${slug}.props.json`);
fs.writeFileSync(propsFile, JSON.stringify(props, null, 2));
const out = path.resolve(opt("--out") || path.join(outDir, `${slug}${draft ? "-DRAFT" : ""}.mp4`));

const common = ["remotion", "render", "src/index.tsx", "ExplainerReel", "--props=" + propsFile, "--codec=h264", "--pixel-format=yuv420p", "--log=error"];
const needsGL = scenes.some((s) => s.animationMode === "3d_threejs");
if (opt("--gl")) common.push("--gl=" + opt("--gl"));
else if (needsGL) common.push("--gl=" + (process.env.REMOTION_GL || "angle"));
if (process.env.CHROME) common.push("--browser-executable=" + process.env.CHROME);

const run = (cmd, a, label) => {
  console.log(`▶ ${label}`);
  const r = spawnSync(cmd, a, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  return r.status === 0;
};

if (opt("--stills")) {
  const fps = 30;
  for (const sec of opt("--stills").split(",").map(Number)) {
    const png = path.join(outDir, `${slug}-t${sec.toFixed(2)}.png`);
    run("npx", ["remotion", "still", "src/index.tsx", "ExplainerReel", png, "--props=" + propsFile, `--frame=${Math.round(sec * fps)}`, "--log=error", ...(needsGL ? ["--gl=" + (opt("--gl") || process.env.REMOTION_GL || "angle")] : []), ...(process.env.CHROME ? ["--browser-executable=" + process.env.CHROME] : [])], `still ${sec}s`);
    console.log(png);
  }
  process.exit(0);
}

if (!run("npx", [...common, out], draft ? "DRAFT render" : "final render")) process.exit(1);
console.log(out);
if (draft || args.includes("--no-check")) process.exit(0);

const shotsFile = path.join(outDir, `${slug}.shots.json`);
fs.writeFileSync(shotsFile, JSON.stringify(plan.shots || []));
const py = process.env.PYTHON || "python3";
const okRender = run(py, [path.join(here, "check_render.py"), out, "--shots", shotsFile], "check_render");
let okLoud = true;
if (narrationAudio) {
  okLoud = run(py, [path.join(here, "loudness.py"), out, "--fix"], "loudness --fix");
  const fixed = out.replace(/\.mp4$/, ".loud.mp4");
  if (fs.existsSync(fixed)) fs.renameSync(fixed, out);
}
console.log(okRender && okLoud ? "ALL CHECKS PASS" : "CHECKS FAILED (see above)");
process.exit(okRender && okLoud ? 0 : 1);
