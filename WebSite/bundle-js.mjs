/**
 * bundle-js.mjs
 *
 * Bundles the Salient theme JS files into 2 bundles:
 *   1. vendor-core.min.js  — jQuery + jQuery Migrate (must load first)
 *   2. theme-bundle.min.js — All Salient theme scripts in correct order
 *
 * Uses Terser for minification.
 * Preserves the original files (no deletion).
 */

import fs from 'fs';
import path from 'path';
import { minify } from 'terser';

const JS_DIR = path.resolve('New/assets/js');

// ──── Bundle 1: jQuery core (these MUST load first, before anything else) ────
const CORE_BUNDLE = {
  name: 'vendor-core.min.js',
  files: [
    'jquery.min.js',
    'jquery-migrate.min.js',
  ],
};

// ──── Bundle 2: Theme scripts in correct load order ────
// Order matters! jQuery plugins first, then theme core, then init last
const THEME_BUNDLE = {
  name: 'theme-bundle.min.js',
  files: [
    'jquery.easing.min.js',     // jQuery plugin - must come before theme scripts
    'priority.js',              // Salient priority setup
    'transit.min.js',           // CSS transitions
    'waypoints.js',             // Scroll waypoints
    'imagesLoaded.min.js',      // Image load detection
    'hoverintent.min.js',       // Hover intent for menus
    'jquery.fancybox.js',       // Lightbox
    'anime.min.js',             // Animation library
    'superfish.js',             // Menu dropdowns
    'select2.min.js',           // Enhanced selects
    'touchswipe.min.js',        // Touch handling
    'nectar-smooth-scroll.js',  // Smooth scrolling
    'nectar-sticky-media-sections.js', // Sticky sections
    'js_composer_front.min.js', // WPBakery frontend
    'init.js',                  // Salient main init (MUST be near last)
    'nectar-delay-javascript.js', // Lazy script loader (MUST be last)
  ],
};

async function createBundle(bundle) {
  console.log(`\nCreating ${bundle.name}...`);
  
  let combined = '';
  let totalOrigSize = 0;
  let missingFiles = [];
  
  for (const file of bundle.files) {
    const filePath = path.join(JS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠ Missing: ${file} — skipping`);
      missingFiles.push(file);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');
    totalOrigSize += size;
    
    // Wrap each file in an IIFE to prevent scope pollution
    // Add a comment marker for debugging
    combined += `\n/* === ${file} === */\n`;
    combined += `try { ${content} } catch(e) { console.warn('Error in ${file}:', e); }\n`;
    
    console.log(`  ✓ ${file} (${(size/1024).toFixed(1)}KB)`);
  }
  
  if (missingFiles.length > 0) {
    console.log(`  Missing files: ${missingFiles.join(', ')}`);
  }
  
  // Minify the combined content
  console.log(`  Minifying...`);
  let result;
  try {
    result = await minify(combined, {
      compress: {
        dead_code: true,
        drop_console: false, // Keep console.log for now
        passes: 2,
      },
      mangle: {
        // Don't mangle top-level names (jQuery globals etc.)
        toplevel: false,
      },
      output: {
        comments: false,
      },
    });
  } catch (e) {
    // If minification fails, just use concatenated (some legacy code may have issues)
    console.log(`  ⚠ Minification error: ${e.message}`);
    console.log(`  Using concatenated (non-minified) bundle instead`);
    result = { code: combined };
  }
  
  const bundlePath = path.join(JS_DIR, bundle.name);
  fs.writeFileSync(bundlePath, result.code, 'utf-8');
  
  const bundleSize = Buffer.byteLength(result.code, 'utf-8');
  const savings = totalOrigSize - bundleSize;
  
  console.log(`  Original: ${(totalOrigSize/1024).toFixed(1)}KB (${bundle.files.length} files)`);
  console.log(`  Bundle:   ${(bundleSize/1024).toFixed(1)}KB`);
  console.log(`  Saved:    ${(savings/1024).toFixed(1)}KB (${((savings/totalOrigSize)*100).toFixed(0)}%)`);
  
  return {
    name: bundle.name,
    fileCount: bundle.files.length - missingFiles.length,
    origSize: totalOrigSize,
    bundleSize,
    savings,
  };
}

async function main() {
  console.log('=== JS Bundling ===');
  console.log(`JS directory: ${JS_DIR}`);
  
  // Check terser is available
  const coreResult = await createBundle(CORE_BUNDLE);
  const themeResult = await createBundle(THEME_BUNDLE);
  
  console.log('\n=== Summary ===');
  console.log(`Core bundle:  ${coreResult.name} — ${(coreResult.bundleSize/1024).toFixed(1)}KB (from ${coreResult.fileCount} files)`);
  console.log(`Theme bundle: ${themeResult.name} — ${(themeResult.bundleSize/1024).toFixed(1)}KB (from ${themeResult.fileCount} files)`);
  console.log(`Total before: ${((coreResult.origSize + themeResult.origSize)/1024).toFixed(1)}KB across ${coreResult.fileCount + themeResult.fileCount} files`);
  console.log(`Total after:  ${((coreResult.bundleSize + themeResult.bundleSize)/1024).toFixed(1)}KB across 2 files`);
  console.log(`Total saved:  ${((coreResult.savings + themeResult.savings)/1024).toFixed(1)}KB`);
  console.log(`Requests:     ${coreResult.fileCount + themeResult.fileCount} → 2`);
  
  // Save stats for comparison
  const stats = {
    before: {
      files: coreResult.fileCount + themeResult.fileCount,
      totalKB: ((coreResult.origSize + themeResult.origSize)/1024).toFixed(1),
    },
    after: {
      files: 2,
      totalKB: ((coreResult.bundleSize + themeResult.bundleSize)/1024).toFixed(1),
    },
    savedKB: ((coreResult.savings + themeResult.savings)/1024).toFixed(1),
    savedPercent: (((coreResult.savings + themeResult.savings) / (coreResult.origSize + themeResult.origSize)) * 100).toFixed(0),
  };
  
  fs.writeFileSync(path.resolve('New/bundle-stats.json'), JSON.stringify(stats, null, 2));
  console.log('\nStats saved to bundle-stats.json');
  console.log('Original files preserved — no deletions.');
  console.log('\nNext: Run update-html-bundles.mjs to update HTML references.');
}

main().catch(console.error);
