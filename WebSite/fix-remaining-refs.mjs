import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEW_DIR = path.join(__dirname, 'New');

// ── Download helper ─────────────────────────────────────────────────────────
function download(url) {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? https : http;
    getter.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Assets to fix ───────────────────────────────────────────────────────────
const replacements = [
  {
    pattern: 'https://fedsaferetirement.com/wp-content/uploads/2019/12/cropped-logo-scaled-1-270x270.jpg',
    localFile: 'assets/logos/cropped-logo-scaled-1-270x270.jpg',
    downloadUrl: 'https://fedsaferetirement.com/wp-content/uploads/2019/12/cropped-logo-scaled-1-270x270.jpg',
  },
  {
    pattern: 'https://fedsaferetirement.com/wp-content/plugins/gravityforms/images/spinner.svg',
    localFile: 'assets/images/spinner.svg',
    downloadUrl: 'https://fedsaferetirement.com/wp-content/plugins/gravityforms/images/spinner.svg',
  },
  {
    pattern: 'https://www.ffeba.com/wp-content/uploads/2019/01/Help.gif',
    localFile: 'assets/images/Help.gif',
    downloadUrl: 'https://www.ffeba.com/wp-content/uploads/2019/01/Help.gif',
  },
];

// ── Find HTML files ─────────────────────────────────────────────────────────
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

async function main() {
  // 1. Download each asset
  for (const r of replacements) {
    const dest = path.join(NEW_DIR, r.localFile);
    if (fs.existsSync(dest)) {
      console.log(`  SKIP (exists): ${r.localFile}`);
      continue;
    }
    try {
      console.log(`  Downloading: ${r.downloadUrl}`);
      const buf = await download(r.downloadUrl);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  SAVED: ${r.localFile} (${buf.length} bytes)`);
    } catch (err) {
      console.log(`  FAILED: ${r.downloadUrl} - ${err.message}`);
      // Create a tiny placeholder so the path exists
    }
  }

  // 2. Rewrite HTML files
  const htmlFiles = findHtmlFiles(NEW_DIR);
  let totalFixed = 0;

  for (const f of htmlFiles) {
    let html = fs.readFileSync(f, 'utf8');
    let changed = false;
    const rel = path.relative(NEW_DIR, f);
    const depth = rel.split(path.sep).length - 1; // e.g. benefits-analysis/index.html => depth 1
    const prefix = depth > 0 ? '../'.repeat(depth) : './';

    for (const r of replacements) {
      if (html.includes(r.pattern)) {
        const localPath = prefix + r.localFile.replace(/\\/g, '/');
        const count = html.split(r.pattern).length - 1;
        html = html.replaceAll(r.pattern, localPath);
        console.log(`  [${rel}] Replaced ${count}x: ${r.pattern.substring(0, 60)}...`);
        totalFixed += count;
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(f, html, 'utf8');
  }

  console.log(`\nDone! Fixed ${totalFixed} external references.`);
}

main().catch(console.error);
