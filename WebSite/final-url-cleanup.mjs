/**
 * final-url-cleanup.mjs
 *
 * Replaces ALL remaining fedsafev2.zeppelinwebsites.com URLs across
 * all HTML files in New/ with relative paths.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve('New');

// Find all HTML files
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
console.log(`Found ${htmlFiles.length} HTML files\n`);

let totalFixes = 0;

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  
  // Determine depth for relative path prefix
  const depth = path.dirname(relPath).split(path.sep).filter(x => x && x !== '.').length;
  const prefix = depth > 0 ? '../' : './';
  
  const origLen = html.length;
  let fixes = 0;
  
  // Replace specific page URLs first (longer patterns first to avoid substring issues)
  const pageReplacements = [
    ['social-security-analysis/', `${prefix}social-security-analysis/`],
    ['fegli-analysis/', `${prefix}fegli-analysis/`],
    ['benefits-analysis/', `${prefix}benefits-analysis/`],
    ['for-agencies-contact/', `${prefix}for-agencies-contact/`],
    ['meet-the-partners/', `${prefix}meet-the-partners/`],
    ['think-youre-ready/', `${prefix}think-youre-ready/`],
    ['for-agencies/', `${prefix}for-agencies/`],
    ['main-contact/', `${prefix}main-contact/`],
    ['resources/', `${prefix}resources/`],
    ['checklist/', `${prefix}checklist/`],
  ];
  
  for (const [page, replacement] of pageReplacements) {
    const pattern = new RegExp(`https?://fedsafev2\\.zeppelinwebsites\\.com/${page.replace('/', '\\/')}`, 'g');
    const matches = html.match(pattern);
    if (matches) {
      html = html.replace(pattern, replacement);
      fixes += matches.length;
    }
  }
  
  // Replace homepage anchor links (#about, #services, etc.)
  const anchorPattern = /https?:\/\/fedsafev2\.zeppelinwebsites\.com\/#([a-zA-Z]+)/g;
  const anchorMatches = html.match(anchorPattern);
  if (anchorMatches) {
    html = html.replace(anchorPattern, `${prefix}#$1`);
    fixes += anchorMatches.length;
  }
  
  // Replace bare homepage URL with and without trailing slash
  // Match https://fedsafev2.zeppelinwebsites.com/ or https://fedsafev2.zeppelinwebsites.com (at end of attr)
  const bareWithSlash = /https?:\/\/fedsafev2\.zeppelinwebsites\.com\//g;
  const bareMatches1 = html.match(bareWithSlash);
  if (bareMatches1) {
    html = html.replace(bareWithSlash, `${prefix}`);
    fixes += bareMatches1.length;
  }
  
  // Bare without slash (usually in href="https://fedsafev2.zeppelinwebsites.com")
  const bareNoSlash = /https?:\/\/fedsafev2\.zeppelinwebsites\.com(?=["'\s>])/g;
  const bareMatches2 = html.match(bareNoSlash);
  if (bareMatches2) {
    html = html.replace(bareNoSlash, `${prefix}`);
    fixes += bareMatches2.length;
  }
  
  // Also catch any wp-content or wp-json references that slipped through
  const wpContentPattern = /https?:\/\/fedsafev2\.zeppelinwebsites\.com\/wp-[^"'\s>]*/g;
  const wpMatches = html.match(wpContentPattern);
  if (wpMatches) {
    // Remove these entirely (usually inside JSON or metadata blocks)
    // For href/src attributes, just blank them
    html = html.replace(wpContentPattern, '#');
    fixes += wpMatches.length;
  }
  
  if (fixes > 0) {
    fs.writeFileSync(file, html, 'utf-8');
    console.log(`✓ ${relPath}: ${fixes} URL(s) fixed`);
    totalFixes += fixes;
  } else {
    // Check if any references remain
    const remaining = (html.match(/fedsafev2\.zeppelinwebsites\.com/g) || []).length;
    if (remaining > 0) {
      console.log(`⚠ ${relPath}: ${remaining} reference(s) STILL remaining`);
    } else {
      console.log(`  ${relPath}: clean`);
    }
  }
}

console.log(`\nTotal fixes: ${totalFixes}`);

// Final verification
console.log('\n── Verification ──');
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT, file);
  const remaining = (html.match(/fedsafev2\.zeppelinwebsites\.com/g) || []).length;
  if (remaining > 0) {
    console.log(`⚠ ${relPath}: ${remaining} reference(s) still present`);
    // Show them
    const matches = html.match(/[^\n]*fedsafev2\.zeppelinwebsites\.com[^\n]*/g);
    if (matches) {
      for (const m of matches.slice(0, 3)) {
        console.log(`    ${m.trim().substring(0, 100)}`);
      }
    }
  }
}
console.log('Done.');
