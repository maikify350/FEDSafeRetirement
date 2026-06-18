/**
 * update-html-bundles.mjs
 *
 * Replaces the 18 individual <script> tags with 2 bundle references.
 * The inline config scripts (nectarLove, nectarOptions) are preserved
 * and placed between the two bundles.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('New');

// Files that are now in vendor-core.min.js
const CORE_FILES = [
  'jquery.min.js',
  'jquery-migrate.min.js',
];

// Files that are now in theme-bundle.min.js
const THEME_FILES = [
  'jquery.easing.min.js',
  'priority.js',
  'transit.min.js',
  'waypoints.js',
  'imagesLoaded.min.js',
  'hoverintent.min.js',
  'jquery.fancybox.js',
  'anime.min.js',
  'superfish.js',
  'select2.min.js',
  'touchswipe.min.js',
  'nectar-smooth-scroll.js',
  'nectar-sticky-media-sections.js',
  'js_composer_front.min.js',
  'init.js',
  'nectar-delay-javascript.js',
];

const ALL_BUNDLED = [...CORE_FILES, ...THEME_FILES];

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
      results.push(...findHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles(ROOT);

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  const depth = path.dirname(relPath).split(path.sep).filter(x => x && x !== '.').length;
  const prefix = depth > 0 ? '../' : '';
  
  let removedCount = 0;
  
  // Remove individual script tags for bundled files
  for (const jsFile of ALL_BUNDLED) {
    // Match script tags with various attributes that reference this file
    // Handle both src="assets/js/file.js" and src="../assets/js/file.js"
    const escapedName = jsFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `<script[^>]*src="[^"]*${escapedName}(?:\\?[^"]*)?(?:ver=[^"]*)?[^"]*"[^>]*>\\s*</script>\\s*`,
      'g'
    );
    
    const matches = html.match(pattern);
    if (matches) {
      html = html.replace(pattern, '');
      removedCount += matches.length;
    }
  }
  
  if (removedCount === 0) {
    console.log(`  ${relPath}: no script tags found to replace`);
    continue;
  }
  
  // Find the inline config script (nectarLove/nectarOptions) — we need to keep it
  // It should stay between the core and theme bundles  
  const configScriptMatch = html.match(/<script[^>]*id="nectar-frontend-js-extra"[^>]*>[\s\S]*?<\/script>/);
  const configScript = configScriptMatch ? configScriptMatch[0] : '';
  
  // Remove the config script from its current location (we'll re-place it)
  if (configScript) {
    html = html.replace(configScript, '');
  }
  
  // Insert the 2 bundle script tags + config right before </body>
  const bundleScripts = `
<!-- Bundled JS: ${CORE_FILES.length + THEME_FILES.length} files → 2 bundles -->
<script src="${prefix}assets/js/vendor-core.min.js"></script>
${configScript}
<script src="${prefix}assets/js/theme-bundle.min.js"></script>
`;
  
  html = html.replace('</body>', bundleScripts + '\n</body>');
  
  // Clean up any leftover empty lines from removed script tags
  html = html.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(file, html, 'utf-8');
  console.log(`✓ ${relPath}: replaced ${removedCount} script tags → 2 bundles`);
}

console.log('\nDone. All HTML files updated to use bundled JS.');
