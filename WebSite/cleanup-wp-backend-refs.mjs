/**
 * cleanup-wp-backend-refs.mjs
 *
 * Removes dead WordPress backend references from static HTML:
 * 1. nectarLove.ajaxurl → neutralized (set to empty)
 * 2. speculationrules script → removed (WP-specific prefetching)
 * 3. wpbCustomElement script → removed (WPBakery boilerplate)
 * 4. Any remaining admin-ajax.php, wp-admin, xmlrpc.php references
 * 5. Empty <script></script> tags
 *
 * KEEPS: nectarOptions, nectar_front_i18n (needed by theme JS)
 * KEEPS: local asset JS files (jQuery, init.js, etc.)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('New');

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
let totalFixes = 0;

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  let fixes = 0;

  // 1. Neutralize ajaxurl in nectarLove (set to empty string instead of admin-ajax.php)
  //    Keep the variable since init.js may reference it
  const ajaxUrlPattern = /"ajaxurl":"[^"]*admin-ajax\.php"/g;
  const ajaxMatches = html.match(ajaxUrlPattern);
  if (ajaxMatches) {
    html = html.replace(ajaxUrlPattern, '"ajaxurl":""');
    fixes += ajaxMatches.length;
  }

  // 2. Neutralize rooturl that may point to staging server
  const rootUrlPattern = /"rooturl":"https?:\/\/[^"]*"/g;
  const rootMatches = html.match(rootUrlPattern);
  if (rootMatches) {
    html = html.replace(rootUrlPattern, '"rooturl":"/"');
    fixes += rootMatches.length;
  }

  // 3. Remove speculationrules script (WP-specific prefetching)
  const specRulesPattern = /<script type="speculationrules">[\s\S]*?<\/script>/g;
  const specMatches = html.match(specRulesPattern);
  if (specMatches) {
    html = html.replace(specRulesPattern, '');
    fixes += specMatches.length;
  }

  // 4. Remove wpbCustomElement script (WPBakery boilerplate)
  const wpbPattern = /<script id="wpb-modifications">[\s\S]*?<\/script>/g;
  const wpbMatches = html.match(wpbPattern);
  if (wpbMatches) {
    html = html.replace(wpbPattern, '');
    fixes += wpbMatches.length;
  }

  // 5. Remove empty script tags
  const emptyScript = /<script>\s*<\/script>/g;
  const emptyMatches = html.match(emptyScript);
  if (emptyMatches) {
    html = html.replace(emptyScript, '');
    fixes += emptyMatches.length;
  }

  // 6. Remove WordPress generator meta tag
  const wpGenerator = /<meta name="generator" content="WordPress[^"]*"\s*\/?>/g;
  const genMatches = html.match(wpGenerator);
  if (genMatches) {
    html = html.replace(wpGenerator, '');
    fixes += genMatches.length;
  }

  // 7. Remove WPBakery generator meta tag
  const wpbGenerator = /<meta name="generator" content="Powered by WPBakery[^"]*"\s*\/?>/g;
  const wpbGenMatches = html.match(wpbGenerator);
  if (wpbGenMatches) {
    html = html.replace(wpbGenerator, '');
    fixes += wpbGenMatches.length;
  }

  // 8. Remove any action="..." pointing to WP search/admin
  const wpActionPattern = /action="[^"]*admin-ajax\.php[^"]*"/g;
  const actionMatches = html.match(wpActionPattern);
  if (actionMatches) {
    html = html.replace(wpActionPattern, 'action="#"');
    fixes += actionMatches.length;
  }

  // 9. Remove noscript wpb_animate fallback (WPBakery)
  const noscriptWpb = /<noscript><style>\s*\.wpb_animate_when_almost_visible\s*\{[^}]*\}\s*<\/style><\/noscript>/g;
  const noscriptMatches = html.match(noscriptWpb);
  if (noscriptMatches) {
    html = html.replace(noscriptWpb, '');
    fixes += noscriptMatches.length;
  }

  // 10. Clean up search form action pointing to WP
  const searchFormAction = /action="\.\/"/g;
  // This is fine for a static site (relative to current page), so leave it

  if (fixes > 0) {
    fs.writeFileSync(file, html, 'utf-8');
    console.log(`✓ ${relPath}: ${fixes} WP backend ref(s) cleaned`);
    totalFixes += fixes;
  } else {
    console.log(`  ${relPath}: clean`);
  }
}

// Final verification: check for any remaining PHP or WP-admin references
console.log('\n── Verification ──');
let issues = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  
  const phpRefs = (html.match(/\.php/g) || []).length;
  const adminRefs = (html.match(/wp-admin/g) || []).length;
  const ajaxRefs = (html.match(/admin-ajax/g) || []).length;
  
  if (phpRefs > 0 || adminRefs > 0 || ajaxRefs > 0) {
    console.log(`⚠ ${relPath}: php=${phpRefs}, wp-admin=${adminRefs}, admin-ajax=${ajaxRefs}`);
    issues++;
  }
}

if (issues === 0) {
  console.log('✓ No PHP/WP-admin/admin-ajax references remain in any HTML file!');
}

console.log(`\nTotal fixes: ${totalFixes}`);
