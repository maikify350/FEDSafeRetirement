import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEW_DIR = path.join(__dirname, 'New');

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

const IMG_RE = /https?:\/\/[^\s"'<>)]+\.(jpg|jpeg|png|gif|svg|webp|ico)(\?[^\s"'<>)]*)?/gi;

const lines = [];

for (const f of findHtmlFiles(NEW_DIR)) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(NEW_DIR, f);

  for (const m of html.matchAll(IMG_RE)) {
    lines.push(`FILE: ${rel}`);
    lines.push(`  URL: ${m[0]}`);
    lines.push('');
  }
}

fs.writeFileSync(path.join(__dirname, 'audit-output.md'), `# External Image Refs (${lines.length / 3} total)\n\n${lines.join('\n')}`, 'utf8');
console.log('Done - wrote audit-output.md');
