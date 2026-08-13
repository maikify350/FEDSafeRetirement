/**
 * localize-assets.mjs
 * Downloads all external images + CSS from the New/ site,
 * converts images to WebP, and updates all HTML references.
 *
 * Assets layout:
 *   New/assets/images/   - general images
 *   New/assets/logos/    - logos, badges, icons
 *   New/assets/css/      - external stylesheets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NEW_DIR = path.join(__dirname, 'New');
const ASSETS_DIR = path.join(NEW_DIR, 'assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const LOGOS_DIR = path.join(ASSETS_DIR, 'logos');
const CSS_DIR = path.join(ASSETS_DIR, 'css');

// ─── create asset dirs ────────────────────────────────────────────────────────
for (const d of [IMAGES_DIR, LOGOS_DIR, CSS_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// ─── find all HTML files in New/ (skip backups) ───────────────────────────────
function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip backup folders and assets folder itself
      if (!entry.name.startsWith('New_') && entry.name !== 'assets' && entry.name !== 'node_modules') {
        results.push(...findHtmlFiles(full));
      }
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles(NEW_DIR);
console.log(`\n📂 Found ${htmlFiles.length} HTML files:`);
htmlFiles.forEach(f => console.log(`   ${path.relative(NEW_DIR, f)}`));

// ─── logo detection ───────────────────────────────────────────────────────────
const LOGO_PATTERNS = /logo|badge|shield|favicon|apple-touch|icon|brand/i;

function isLogo(url) {
  const fname = url.split('/').pop().split('?')[0].toLowerCase();
  return LOGO_PATTERNS.test(fname);
}

// ─── sanitize filename from URL ───────────────────────────────────────────────
function urlToFilename(url, ext) {
  const base = url.split('/').pop().split('?')[0];
  const nameNoExt = base.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  // include a short hash of the full URL to avoid collisions
  const hash = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return `${nameNoExt}_${hash}${ext}`;
}

// ─── download helper ──────────────────────────────────────────────────────────
async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AssetLocalizer/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── collect all external image URLs ─────────────────────────────────────────
// Patterns to match:
//   src="https://..."
//   data-nectar-img-src="https://..."
//   srcset="https://... Xw, https://... Yw"
//   data-nectar-img-srcset="https://... Xw, ..."
//   href="https://....(ico|png)" (favicon links)
//   url(https://...) in inline style / CSS

const IMG_ATTR_RE = /(?:src|data-nectar-img-src|href)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|svg|webp|ico)(?:\?[^"']*)?)/gi;
const SRCSET_RE = /(?:srcset|data-nectar-img-srcset)=["']([^"']+)["']/gi;
const CSS_BG_RE = /url\(["']?(https?:\/\/[^"')]+\.(?:jpg|jpeg|png|gif|svg|webp|ico)(?:\?[^"')]*)?)/gi;

// External CSS link tags
const CSS_LINK_RE = /<link[^>]+rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)['"]/gi;
const CSS_LINK_RE2 = /<link[^>]+href=['"]([^'"]+)['"'][^>]*rel=['"]stylesheet['"]/gi;

// ─── process images ───────────────────────────────────────────────────────────
// Map: originalUrl → { localPath, webpFilename }
const imageMap = new Map(); // url → { dest, relFromNew }
const cssMap = new Map();   // url → { dest, relFromNew }

function collectImgUrls(html) {
  const urls = new Set();

  // single-src attributes
  let m;
  const re1 = new RegExp(IMG_ATTR_RE.source, 'gi');
  while ((m = re1.exec(html)) !== null) urls.add(m[1]);

  // srcset (comma-separated "url descriptor" pairs)
  const re2 = new RegExp(SRCSET_RE.source, 'gi');
  while ((m = re2.exec(html)) !== null) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('http')) urls.add(u);
    }
  }

  // CSS background-image urls
  const re3 = new RegExp(CSS_BG_RE.source, 'gi');
  while ((m = re3.exec(html)) !== null) urls.add(m[1]);

  return urls;
}

function collectCssUrls(html) {
  const urls = new Set();
  let m;
  const re1 = new RegExp(CSS_LINK_RE.source, 'gi');
  while ((m = re1.exec(html)) !== null) {
    if (m[1].startsWith('http')) urls.add(m[1]);
  }
  const re2 = new RegExp(CSS_LINK_RE2.source, 'gi');
  while ((m = re2.exec(html)) !== null) {
    if (m[1].startsWith('http')) urls.add(m[1]);
  }
  return urls;
}

// ─── first pass: collect all URLs across all HTML files ───────────────────────
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const url of collectImgUrls(html)) imageMap.set(url, null);
  for (const url of collectCssUrls(html)) cssMap.set(url, null);
}

console.log(`\n📸 Unique image URLs: ${imageMap.size}`);
console.log(`🎨 Unique CSS URLs:   ${cssMap.size}`);

// ─── download + convert images ────────────────────────────────────────────────
console.log('\n⬇️  Downloading & converting images...');

const SVG_PLACEHOLDER = /data:image\/svg\+xml/i;
let imgOk = 0, imgSkip = 0, imgFail = 0;

for (const [url] of imageMap) {
  // Skip data URIs
  if (SVG_PLACEHOLDER.test(url)) {
    imageMap.delete(url);
    continue;
  }

  const logoFlag = isLogo(url);
  const targetDir = logoFlag ? LOGOS_DIR : IMAGES_DIR;
  const webpName = urlToFilename(url, '.webp');
  const destPath = path.join(targetDir, webpName);
  const relFromNew = `assets/${logoFlag ? 'logos' : 'images'}/${webpName}`;

  imageMap.set(url, { dest: destPath, relFromNew });

  if (fs.existsSync(destPath)) {
    console.log(`  ⏭  skip (exists): ${webpName}`);
    imgSkip++;
    continue;
  }

  try {
    const buf = await fetchBuffer(url);
    const isSvg = url.toLowerCase().endsWith('.svg');
    if (isSvg) {
      // Sharp can handle SVG → WebP but keep originals as SVG for icons
      const svgName = urlToFilename(url, '.svg');
      const svgDest = path.join(targetDir, svgName);
      fs.writeFileSync(svgDest, buf);
      // also keep webpName pointing to svg for now
      imageMap.set(url, { dest: svgDest, relFromNew: `assets/${logoFlag ? 'logos' : 'images'}/${svgName}` });
      console.log(`  ✅ svg: ${svgName}`);
    } else {
      await sharp(buf)
        .webp({ quality: 85, effort: 4 })
        .toFile(destPath);
      console.log(`  ✅ webp: ${webpName}`);
    }
    imgOk++;
  } catch (err) {
    console.warn(`  ❌ failed: ${url.slice(0, 80)} → ${err.message}`);
    imageMap.delete(url);
    imgFail++;
  }
}

console.log(`\n  Images: ${imgOk} converted, ${imgSkip} skipped, ${imgFail} failed`);

// ─── download CSS ─────────────────────────────────────────────────────────────
console.log('\n⬇️  Downloading CSS files...');
let cssOk = 0, cssFail = 0;

for (const [url] of cssMap) {
  const cssName = urlToFilename(url, '.css');
  const destPath = path.join(CSS_DIR, cssName);
  const relFromNew = `assets/css/${cssName}`;

  cssMap.set(url, { dest: destPath, relFromNew });

  if (fs.existsSync(destPath)) {
    console.log(`  ⏭  skip (exists): ${cssName}`);
    continue;
  }

  try {
    const buf = await fetchBuffer(url);
    fs.writeFileSync(destPath, buf);
    console.log(`  ✅ css: ${cssName}`);
    cssOk++;
  } catch (err) {
    console.warn(`  ❌ failed: ${url.slice(0, 80)} → ${err.message}`);
    cssMap.delete(url);
    cssFail++;
  }
}

console.log(`  CSS: ${cssOk} downloaded, ${cssFail} failed`);

// ─── second pass: rewrite HTML files ──────────────────────────────────────────
console.log('\n✏️  Rewriting HTML files...');

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  const depth = path.relative(NEW_DIR, path.dirname(file)).split(path.sep).filter(Boolean).length;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';

  let changes = 0;

  // ── Replace image URLs ─────────────────────────────────────────────────────
  for (const [origUrl, info] of imageMap) {
    if (!info) continue;
    const localRef = prefix + info.relFromNew;
    // escape for regex
    const escaped = origUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    const before = html;
    html = html.replace(re, localRef);
    if (html !== before) changes++;
  }

  // ── Replace CSS URLs ───────────────────────────────────────────────────────
  for (const [origUrl, info] of cssMap) {
    if (!info) continue;
    const localRef = prefix + info.relFromNew;
    const escaped = origUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    const before = html;
    html = html.replace(re, localRef);
    if (html !== before) changes++;
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log(`  ✅ ${path.relative(NEW_DIR, file)} — ${changes} URL(s) replaced`);
}

// ─── summary ──────────────────────────────────────────────────────────────────
console.log('\n🎉 Done!');
console.log(`   assets/images/ : ${fs.readdirSync(IMAGES_DIR).length} files`);
console.log(`   assets/logos/  : ${fs.readdirSync(LOGOS_DIR).length} files`);
console.log(`   assets/css/    : ${fs.readdirSync(CSS_DIR).length} files`);
