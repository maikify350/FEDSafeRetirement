/**
 * copy-images-with-dimensions.mjs
 *
 * Walks the New/ directory tree, finds every image file (webp, png, jpg, jpeg, gif, bmp, svg),
 * reads its actual pixel dimensions, and creates a COPY of the file with the dimensions
 * appended to the name:  original_WxH.ext
 *
 * The original files are kept untouched.
 *
 * For SVG files it parses width/height or viewBox attributes.
 * For raster images it uses the `sharp` library.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve('New');

const IMAGE_EXTENSIONS = new Set([
  '.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp',
]);
const SVG_EXT = '.svg';

// ── Helpers ──────────────────────────────────────────────────────

async function getImageDimensions(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === SVG_EXT) {
    return getSvgDimensions(filePath);
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width, height: meta.height };
  }

  return null; // not an image we handle
}

function getSvgDimensions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Try width / height attributes on <svg>
  const wMatch = content.match(/<svg[^>]*\swidth=["'](\d+(?:\.\d+)?)/i);
  const hMatch = content.match(/<svg[^>]*\sheight=["'](\d+(?:\.\d+)?)/i);
  if (wMatch && hMatch) {
    return { width: Math.round(parseFloat(wMatch[1])), height: Math.round(parseFloat(hMatch[1])) };
  }

  // Fallback: viewBox
  const vbMatch = content.match(/<svg[^>]*\sviewBox=["'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  if (vbMatch) {
    return { width: Math.round(parseFloat(vbMatch[1])), height: Math.round(parseFloat(vbMatch[2])) };
  }

  return null;
}

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext) || ext === SVG_EXT) {
        results.push(full);
      }
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const files = walk(ROOT);
  console.log(`Found ${files.length} image files.\n`);

  const report = [];

  for (const filePath of files) {
    try {
      const dims = await getImageDimensions(filePath);
      if (!dims || !dims.width || !dims.height) {
        console.log(`⚠  Could not read dimensions: ${filePath}`);
        report.push({ file: filePath, width: '?', height: '?', sizeKB: (fs.statSync(filePath).size / 1024).toFixed(1) });
        continue;
      }

      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const dir = path.dirname(filePath);
      const newName = `${base}_${dims.width}x${dims.height}${ext}`;
      const destPath = path.join(dir, newName);

      // Copy the file (keeping original)
      fs.copyFileSync(filePath, destPath);

      const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
      console.log(`✓  ${path.relative(ROOT, destPath)}  (${sizeKB} KB)`);

      report.push({
        file: path.relative(ROOT, filePath),
        copy: path.relative(ROOT, destPath),
        width: dims.width,
        height: dims.height,
        sizeKB,
      });
    } catch (err) {
      console.error(`✗  Error processing ${filePath}: ${err.message}`);
    }
  }

  // Write a summary report
  console.log('\n── Summary Report ──');
  console.log(`Total images processed: ${report.length}`);

  // Sort by size descending to highlight the big ones
  const sorted = [...report].sort((a, b) => parseFloat(b.sizeKB) - parseFloat(a.sizeKB));
  console.log('\nTop 20 largest images:');
  console.log('─'.repeat(100));
  console.log('Size (KB)'.padEnd(12) + 'Dimensions'.padEnd(15) + 'File');
  console.log('─'.repeat(100));
  for (const r of sorted.slice(0, 20)) {
    console.log(
      String(r.sizeKB).padEnd(12) +
      `${r.width}x${r.height}`.padEnd(15) +
      r.file
    );
  }

  // Also write report to a file
  const reportLines = [
    '# Image Dimension Audit',
    '',
    `Total images: ${report.length}`,
    '',
    '## All Images (sorted by size, largest first)',
    '',
    '| Size (KB) | Dimensions | File |',
    '|-----------|-----------|------|',
  ];
  for (const r of sorted) {
    reportLines.push(`| ${r.sizeKB} | ${r.width}x${r.height} | ${r.file} |`);
  }
  fs.writeFileSync(path.join(ROOT, 'image-audit-report.md'), reportLines.join('\n'), 'utf-8');
  console.log(`\nReport written to New/image-audit-report.md`);
}

main().catch(console.error);
