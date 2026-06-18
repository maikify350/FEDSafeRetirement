/**
 * cleanup-scripts-and-links.mjs
 *
 * 1. Replaces external jQuery/jQuery-Migrate with local paths (same as original pages)
 * 2. Removes remaining oEmbed/RSS metadata links
 * 3. Removes any remaining WP backend script references
 * 4. Cleans up any leftover fedsafev2/fedsaferetirement.com references
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('New');

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'assets' && entry.name !== 'node_modules') {
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
  const prefix = depth > 0 ? '../' : './';
  let changes = 0;

  // 1. Replace external jQuery references with local relative paths
  //    (same pattern as the original Salient pages use)
  const jqueryPatterns = [
    [/src="https?:\/\/fedsaferetirement\.com\/wp-includes\/js\/jquery\/jquery\.min\.js[^"]*"/g,
     `src="${prefix}wp-includes/js/jquery/jquery.min.js?ver=3.7.1"`],
    [/src="https?:\/\/fedsaferetirement\.com\/wp-includes\/js\/jquery\/jquery-migrate\.min\.js[^"]*"/g,
     `src="${prefix}wp-includes/js/jquery/jquery-migrate.min.js?ver=3.4.1"`],
    [/src="https?:\/\/fedsafev2\.zeppelinwebsites\.com\/wp-includes\/js\/jquery\/jquery\.min\.js[^"]*"/g,
     `src="${prefix}wp-includes/js/jquery/jquery.min.js?ver=3.7.1"`],
    [/src="https?:\/\/fedsafev2\.zeppelinwebsites\.com\/wp-includes\/js\/jquery\/jquery-migrate\.min\.js[^"]*"/g,
     `src="${prefix}wp-includes/js/jquery/jquery-migrate.min.js?ver=3.4.1"`],
  ];

  for (const [pattern, replacement] of jqueryPatterns) {
    const m = html.match(pattern);
    if (m) {
      html = html.replace(pattern, replacement);
      changes += m.length;
    }
  }

  // 2. Remove oEmbed, RSS, EditURI, canonical links pointing to either server
  const metadataPatterns = [
    /<link rel="alternate" type="application\/rss\+xml"[^>]*>/g,
    /<link rel="alternate" title="oEmbed[^>]*>/g,
    /<link rel="https:\/\/api\.w\.org\/"[^>]*>/g,
    /<link rel="alternate" title="JSON"[^>]*>/g,
    /<link rel="EditURI"[^>]*>/g,
    /<link rel="canonical"[^>]*(?:fedsafev2|fedsaferetirement)[^>]*>/g,
    /<link rel='shortlink'[^>]*(?:fedsafev2|fedsaferetirement)[^>]*>/g,
    /<link rel="alternate" type="application\/rss[^>]*>/g,
  ];

  for (const pattern of metadataPatterns) {
    const m = html.match(pattern);
    if (m) {
      html = html.replace(pattern, '');
      changes += m.length;
    }
  }

  // 3. Remove any remaining WP backend scripts (admin-ajax, wp-content/plugins, wp-content/themes)
  //    BUT KEEP scripts that are local relative paths (../wp-content/...) — those are intentional
  const wpBackendScripts =
    /<script[^>]*src="https?:\/\/(?:fedsafev2\.zeppelinwebsites\.com|fedsaferetirement\.com)\/wp-(?:content|admin|json)[^"]*"[^>]*><\/script>/g;
  const wpBackendMatches = html.match(wpBackendScripts);
  if (wpBackendMatches) {
    html = html.replace(wpBackendScripts, '');
    changes += wpBackendMatches.length;
  }

  // 4. Clean up any remaining fedsafev2 URLs we might have missed
  //    (catch-all for anything not yet handled)
  const remainingFedsafev2 = /https?:\/\/fedsafev2\.zeppelinwebsites\.com(?:\/[^"'\s<>]*)?/g;
  const remaining = html.match(remainingFedsafev2);
  if (remaining) {
    // Replace with relative prefix
    html = html.replace(remainingFedsafev2, (match) => {
      const urlPath = match.replace(/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/?/, '');
      return urlPath ? `${prefix}${urlPath}` : prefix;
    });
    changes += remaining.length;
  }

  // 5. Similarly for production fedsaferetirement.com (non-jQuery refs)
  const remainingProd = /https?:\/\/fedsaferetirement\.com\/(?!wp-includes\/js\/jquery)[^"'\s<>]*/g;
  const remainingProdMatches = html.match(remainingProd);
  if (remainingProdMatches) {
    html = html.replace(remainingProd, (match) => {
      const urlPath = match.replace(/https?:\/\/fedsaferetirement\.com\//, '');
      return `${prefix}${urlPath}`;
    });
    changes += remainingProdMatches.length;
  }

  if (changes > 0) {
    fs.writeFileSync(file, html, 'utf-8');
    console.log(`✓ ${relPath}: ${changes} fix(es)`);
  } else {
    console.log(`  ${relPath}: clean`);
  }
}

// Final verification
console.log('\n── Final Verification ──');
let allClean = true;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  
  const staging = (html.match(/fedsafev2\.zeppelinwebsites\.com/g) || []).length;
  const prod = (html.match(/fedsaferetirement\.com/g) || []).length;
  
  if (staging > 0 || prod > 0) {
    console.log(`⚠ ${relPath}: staging=${staging}, prod=${prod}`);
    allClean = false;
  }
}

if (allClean) {
  console.log('✓ All HTML files are clean of external WP references!');
}
