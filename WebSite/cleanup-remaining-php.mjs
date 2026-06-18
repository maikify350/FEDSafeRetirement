/**
 * cleanup-remaining-php.mjs
 * 
 * Final pass: neutralize any remaining PHP/WP-admin references,
 * especially NinjaForms adminAjax URLs.
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

  // 1. Neutralize NinjaForms adminAjax URL
  const nfAdminAjax = /"adminAjax":"[^"]*admin-ajax[^"]*"/g;
  const nfMatches = html.match(nfAdminAjax);
  if (nfMatches) {
    html = html.replace(nfAdminAjax, '"adminAjax":""');
    fixes += nfMatches.length;
  }

  // 2. Neutralize any requireBaseUrl pointing to wp-content
  const requireBase = /"requireBaseUrl":"[^"]*wp-content[^"]*"/g;
  const reqMatches = html.match(requireBase);
  if (reqMatches) {
    html = html.replace(requireBase, '"requireBaseUrl":""');
    fixes += reqMatches.length;
  }

  // 3. Remove xmlrpc.php references
  const xmlrpc = /[^"]*xmlrpc\.php[^"]*/g;
  // Only in link/meta tags
  const xmlrpcLinks = /<link[^>]*xmlrpc\.php[^>]*>/g;
  const xmlrpcMatches = html.match(xmlrpcLinks);
  if (xmlrpcMatches) {
    html = html.replace(xmlrpcLinks, '');
    fixes += xmlrpcMatches.length;
  }

  // 4. Catch any remaining "ajaxurl" pointing to admin-ajax
  const anyAjaxUrl = /"ajaxurl"\s*:\s*"[^"]*admin-ajax[^"]*"/g;
  const aaMatches = html.match(anyAjaxUrl);
  if (aaMatches) {
    html = html.replace(anyAjaxUrl, '"ajaxurl":""');
    fixes += aaMatches.length;
  }

  if (fixes > 0) {
    fs.writeFileSync(file, html, 'utf-8');
    console.log(`✓ ${relPath}: ${fixes} fix(es)`);
    totalFixes += fixes;
  }
}

// Verification
console.log('\n── Final Verification ──');
let clean = true;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  
  const phpRefs = [...html.matchAll(/admin-ajax\.php|xmlrpc\.php|wp-admin(?!\.)/g)];
  if (phpRefs.length > 0) {
    console.log(`⚠ ${relPath}: ${phpRefs.length} ref(s) remain`);
    for (const m of phpRefs.slice(0, 3)) {
      const start = Math.max(0, m.index - 20);
      const end = Math.min(html.length, m.index + m[0].length + 20);
      console.log(`    ...${html.substring(start, end)}...`);
    }
    clean = false;
  }
}

if (clean) {
  console.log('✓ All PHP backend references neutralized!');
}
console.log(`Total fixes: ${totalFixes}`);
