/**
 * update-html-image-refs-v2.mjs
 *
 * FIXED version: ensures we only replace whole filenames (preceded by a path separator
 * or start of attribute value), not substrings of longer filenames.
 *
 * Steps:
 *   1. Walk New/ and find ALL original image files (the ones without dimension suffixes)
 *   2. For each original, determine what its dimension-appended copy name is
 *   3. In every HTML file, replace references using a regex that matches whole filenames only
 *
 * This script RESTORES the original HTML files first (from the original images + audit data),
 * then applies clean replacements.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve('New');

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg']);
const DIMENSION_COPY_PATTERN = /^(.+)_(\d+x\d+)(\.\w+)$/;

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ── Step 1: Build mapping from original filenames to dimension-appended copies ──

const allFiles = walk(ROOT);

// Identify dimension-appended copies and derive originals
const mapping = new Map(); // original basename → copy basename (keyed by full relative dir + basename)

for (const filePath of allFiles) {
  const basename = path.basename(filePath);
  const ext = path.extname(basename).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) && ext !== '.svg') continue;

  const match = basename.match(DIMENSION_COPY_PATTERN);
  if (match) {
    const originalBase = match[1] + match[3];
    const dir = path.dirname(filePath);
    const originalPath = path.join(dir, originalBase);
    if (fs.existsSync(originalPath)) {
      // This is a dimension copy — map original→copy
      mapping.set(originalBase, basename);
    }
  }
}

console.log(`Built mapping of ${mapping.size} original→copy pairs.\n`);

// ── Step 2: Sort by original basename length DESCENDING ──
// This ensures longer filenames are replaced first, preventing substring collisions
const sortedEntries = [...mapping.entries()].sort((a, b) => b[0].length - a[0].length);

// ── Step 3: Find all HTML files ──
const htmlFiles = allFiles.filter(f => path.extname(f).toLowerCase() === '.html');
console.log(`Found ${htmlFiles.length} HTML files to update.\n`);

// ── Step 4: First, UNDO any previous bad replacements ──
// We need to revert any _WxH suffixes that were already inserted
// Strategy: For each dimension-appended copy basename, replace it back with the original
console.log('Phase 1: Reverting previous replacements...\n');

for (const htmlPath of htmlFiles) {
  let content = fs.readFileSync(htmlPath, 'utf-8');
  let reverts = 0;

  // Revert in reverse: replace copy basenames back to originals
  // Sort by copy basename length DESCENDING to avoid substring issues
  const revertEntries = [...mapping.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [origBase, copyBase] of revertEntries) {
    if (content.includes(copyBase)) {
      const escaped = copyBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, origBase);
        reverts += matches.length;
      }
    }
  }

  if (reverts > 0) {
    fs.writeFileSync(htmlPath, content, 'utf-8');
    console.log(`  Reverted ${path.relative(ROOT, htmlPath)}: ${reverts} reversions`);
  }
}

// ── Step 5: Apply CLEAN replacements with proper boundary matching ──
console.log('\nPhase 2: Applying clean replacements...\n');

let totalReplacements = 0;

for (const htmlPath of htmlFiles) {
  let content = fs.readFileSync(htmlPath, 'utf-8');
  let fileReplacements = 0;

  // Apply in order of longest original basename first
  for (const [origBase, copyBase] of sortedEntries) {
    if (content.includes(origBase)) {
      // Use a regex that requires the filename to be preceded by / or " or ' or = or (
      // This prevents matching substrings of longer filenames
      const escaped = origBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match only when preceded by a path separator, quote, or attribute boundary
      const regex = new RegExp(`(?<=[/"'=(])${escaped}`, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, copyBase);
        fileReplacements += matches.length;
      }
    }
  }

  if (fileReplacements > 0) {
    fs.writeFileSync(htmlPath, content, 'utf-8');
    console.log(`✓  ${path.relative(ROOT, htmlPath)}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`─  ${path.relative(ROOT, htmlPath)}: no image references found`);
  }
}

console.log(`\n── Done ──`);
console.log(`Total replacements across all files: ${totalReplacements}`);

// ── Step 6: Verify no broken references ──
console.log('\nPhase 3: Verifying references...\n');

let issues = 0;
for (const htmlPath of htmlFiles) {
  const content = fs.readFileSync(htmlPath, 'utf-8');
  const htmlDir = path.dirname(htmlPath);

  // Find all image file references
  const refRegex = /(?:src|srcset|href|data-nectar-img-src|data-nectar-img-srcset)=["']([^"']*?\.(?:webp|png|jpg|jpeg|gif|svg))/gi;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    const ref = match[1];
    // Handle srcset entries (may have descriptors after)
    const parts = ref.split(',');
    for (const part of parts) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith('http') || url.startsWith('data:')) continue;
      const resolved = path.resolve(htmlDir, url);
      if (!fs.existsSync(resolved)) {
        console.log(`  ⚠ BROKEN: ${path.relative(ROOT, htmlPath)} → ${url}`);
        issues++;
      }
    }
  }
}

if (issues === 0) {
  console.log('  ✓ All image references verified — no broken links!');
} else {
  console.log(`\n  ⚠ Found ${issues} broken references`);
}
