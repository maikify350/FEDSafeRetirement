import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEW_DIR = path.join(__dirname, 'New');

function findHtmlFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('New_') && e.name !== 'assets' && e.name !== 'node_modules') {
      results.push(...findHtmlFiles(full));
    } else if (e.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const IMG_RE = /https?:\/\/[^\s"'<>)]+\.(jpg|jpeg|png|gif|svg|webp|ico)(\?[^\s"'<>)]*)?/gi;
const CSS_RE = /https?:\/\/[^\s"'<>)]+\.css(\?[^\s"'<>)]*)?/gi;

const imgRemaining = [];
const cssRemaining = [];

for (const f of findHtmlFiles(NEW_DIR)) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(NEW_DIR, f);

  for (const m of html.matchAll(IMG_RE)) {
    imgRemaining.push({ file: rel, url: m[0] });
  }
  for (const m of html.matchAll(CSS_RE)) {
    // skip local/relative refs that accidentally matched
    if (m[0].startsWith('http')) cssRemaining.push({ file: rel, url: m[0] });
  }
}

// ── Images ──────────────────────────────────────────────────────────────────
console.log(`\n📸 Remaining external IMAGE refs: ${imgRemaining.length}`);
if (imgRemaining.length === 0) {
  console.log('   ✅ None — all images are local!');
} else {
  imgRemaining.forEach(r => console.log(`  [${r.file}]\n    ${r.url}`));
}

// ── CSS ─────────────────────────────────────────────────────────────────────
console.log(`\n🎨 Remaining external CSS refs: ${cssRemaining.length}`);
if (cssRemaining.length === 0) {
  console.log('   ✅ None — all CSS is local!');
} else {
  cssRemaining.forEach(r => console.log(`  [${r.file}]\n    ${r.url}`));
}

// ── Local asset counts ───────────────────────────────────────────────────────
const ASSETS = path.join(NEW_DIR, 'assets');
const counts = {
  images: fs.existsSync(path.join(ASSETS, 'images')) ? fs.readdirSync(path.join(ASSETS, 'images')).length : 0,
  logos:  fs.existsSync(path.join(ASSETS, 'logos'))  ? fs.readdirSync(path.join(ASSETS, 'logos')).length  : 0,
  css:    fs.existsSync(path.join(ASSETS, 'css'))    ? fs.readdirSync(path.join(ASSETS, 'css')).length    : 0,
};
console.log(`\n📦 Local assets on disk:`);
console.log(`   assets/images/ : ${counts.images} files`);
console.log(`   assets/logos/  : ${counts.logos} files`);
console.log(`   assets/css/    : ${counts.css} files`);
