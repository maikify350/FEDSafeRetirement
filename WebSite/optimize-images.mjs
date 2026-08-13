/**
 * optimize-images.mjs
 *
 * Phase 1: Analyze all images used in HTML, create optimized + responsive variants
 * Phase 2: Generate report with savings
 *
 * Breakpoints:
 *   - Desktop: max 1200px wide (most screens don't need full 1600px)
 *   - Tablet:  max 768px wide
 *   - Mobile:  max 480px wide
 *
 * Compression: WebP quality 80 (good balance of size vs quality)
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve('New');
const QUALITY = 80;
const BREAKPOINTS = [
  { suffix: 'desktop', maxWidth: 1200 },
  { suffix: 'tablet',  maxWidth: 768 },
  { suffix: 'mobile',  maxWidth: 480 },
];

// Minimum file size to bother optimizing (50KB)
const MIN_SIZE_BYTES = 50 * 1024;

// ──── Step 1: Find all images actually referenced in HTML ────
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

function findReferencedImages() {
  const htmlFiles = findHtmlFiles(ROOT);
  const images = new Set();
  
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf-8');
    // Match any image reference ending in .webp, .jpg, .png
    const matches = html.matchAll(/(?:src|srcset|data-nectar-img-src|data-img-src|href)="([^"]*\.(?:webp|jpg|png))"/gi);
    for (const m of matches) {
      let imgPath = m[1];
      // Resolve relative to the HTML file's directory
      const htmlDir = path.dirname(file);
      const absPath = path.resolve(htmlDir, imgPath);
      if (fs.existsSync(absPath)) {
        images.add(absPath);
      }
    }
    
    // Also check <picture><source srcset="...">
    const sourceMatches = html.matchAll(/srcset="([^"]*\.(?:webp|jpg|png))"/gi);
    for (const m of sourceMatches) {
      const htmlDir = path.dirname(file);
      const absPath = path.resolve(htmlDir, m[1]);
      if (fs.existsSync(absPath)) {
        images.add(absPath);
      }
    }
  }
  
  return [...images].sort();
}

// ──── Step 2: Analyze and optimize ────
async function optimizeImage(absPath) {
  const stats = fs.statSync(absPath);
  const origSizeKB = stats.size / 1024;
  
  // Skip small files
  if (stats.size < MIN_SIZE_BYTES) {
    return { file: absPath, skipped: true, reason: `${origSizeKB.toFixed(1)}KB < ${MIN_SIZE_BYTES/1024}KB threshold` };
  }
  
  const ext = path.extname(absPath).toLowerCase();
  const basename = path.basename(absPath, ext);
  const dir = path.dirname(absPath);
  
  // Get original dimensions
  let metadata;
  try {
    metadata = await sharp(absPath).metadata();
  } catch (e) {
    return { file: absPath, skipped: true, reason: `Cannot read: ${e.message}` };
  }
  
  const origWidth = metadata.width;
  const origHeight = metadata.height;
  
  const results = {
    file: path.relative(ROOT, absPath),
    origSizeKB: origSizeKB.toFixed(1),
    origDimensions: `${origWidth}x${origHeight}`,
    variants: [],
  };
  
  // First: re-compress the original at quality 80 (in-place optimization)
  try {
    const optimizedBuffer = await sharp(absPath)
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();
    
    const savingsKB = (stats.size - optimizedBuffer.length) / 1024;
    if (savingsKB > 5) {
      // Only save if we actually save meaningful space
      fs.writeFileSync(absPath, optimizedBuffer);
      results.variants.push({
        type: 'recompressed',
        width: origWidth,
        height: origHeight,
        sizeKB: (optimizedBuffer.length / 1024).toFixed(1),
        savingsKB: savingsKB.toFixed(1),
      });
    }
  } catch (e) {
    // Skip non-webp files or errors
  }
  
  // Then: create responsive variants
  for (const bp of BREAKPOINTS) {
    if (origWidth <= bp.maxWidth) continue; // Skip if image is already smaller
    
    const ratio = bp.maxWidth / origWidth;
    const newHeight = Math.round(origHeight * ratio);
    const variantName = `${basename}_${bp.suffix}${ext}`;
    const variantPath = path.join(dir, variantName);
    
    // Skip if variant already exists
    if (fs.existsSync(variantPath)) {
      const variantStats = fs.statSync(variantPath);
      results.variants.push({
        type: bp.suffix,
        width: bp.maxWidth,
        height: newHeight,
        sizeKB: (variantStats.size / 1024).toFixed(1),
        savingsKB: 0,
        exists: true,
      });
      continue;
    }
    
    try {
      const variantBuffer = await sharp(absPath)
        .resize(bp.maxWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();
      
      fs.writeFileSync(variantPath, variantBuffer);
      
      results.variants.push({
        type: bp.suffix,
        width: bp.maxWidth,
        height: newHeight,
        file: variantName,
        sizeKB: (variantBuffer.length / 1024).toFixed(1),
        savingsKB: ((stats.size - variantBuffer.length) / 1024).toFixed(1),
      });
    } catch (e) {
      results.variants.push({
        type: bp.suffix,
        error: e.message,
      });
    }
  }
  
  return results;
}

// ──── Main ────
async function main() {
  console.log('Scanning HTML files for image references...');
  const images = findReferencedImages();
  console.log(`Found ${images.length} unique image references\n`);
  
  const allResults = [];
  let totalOrigKB = 0;
  let totalSavedKB = 0;
  
  for (const img of images) {
    const result = await optimizeImage(img);
    allResults.push(result);
    
    if (!result.skipped) {
      totalOrigKB += parseFloat(result.origSizeKB);
      for (const v of result.variants) {
        if (v.savingsKB && !v.exists) {
          totalSavedKB += parseFloat(v.savingsKB);
        }
      }
      console.log(`✓ ${result.file} (${result.origSizeKB}KB → variants created)`);
      for (const v of result.variants) {
        if (v.error) {
          console.log(`    ⚠ ${v.type}: ${v.error}`);
        } else if (v.exists) {
          console.log(`    ${v.type}: ${v.sizeKB}KB (already exists)`);
        } else {
          console.log(`    ${v.type}: ${v.width}x${v.height} = ${v.sizeKB}KB (saved ${v.savingsKB}KB)`);
        }
      }
    }
  }
  
  // ──── Generate report ────
  let report = `# Image Optimization Report\n\n`;
  report += `**Total images analyzed:** ${images.length}\n`;
  report += `**Images optimized:** ${allResults.filter(r => !r.skipped).length}\n`;
  report += `**Total original size:** ${totalOrigKB.toFixed(1)} KB\n`;
  report += `**Estimated savings from recompression:** see individual entries\n\n`;
  report += `## Breakpoints\n`;
  report += `| Breakpoint | Max Width | Use Case |\n`;
  report += `|-----------|-----------|----------|\n`;
  report += `| Desktop | 1200px | Standard displays |\n`;
  report += `| Tablet | 768px | iPad, small laptops |\n`;
  report += `| Mobile | 480px | Phones |\n\n`;
  
  report += `## Optimized Images\n\n`;
  
  for (const r of allResults) {
    if (r.skipped) continue;
    report += `### ${r.file}\n`;
    report += `Original: ${r.origDimensions} / ${r.origSizeKB} KB\n\n`;
    
    if (r.variants.length > 0) {
      report += `| Variant | Dimensions | Size (KB) | Filename |\n`;
      report += `|---------|-----------|-----------|----------|\n`;
      for (const v of r.variants) {
        if (!v.error) {
          report += `| ${v.type} | ${v.width}x${v.height} | ${v.sizeKB} | ${v.file || 'in-place'} |\n`;
        }
      }
      report += `\n`;
    }
  }
  
  report += `## Skipped (under ${MIN_SIZE_BYTES/1024}KB)\n\n`;
  for (const r of allResults) {
    if (r.skipped) {
      report += `- ${path.relative(ROOT, r.file)}: ${r.reason}\n`;
    }
  }
  
  // ──── Generate mapping file for HTML update script ────
  const mapping = {};
  for (const r of allResults) {
    if (r.skipped || r.variants.length === 0) continue;
    
    const desktopVariant = r.variants.find(v => v.type === 'desktop' && v.file);
    const tabletVariant = r.variants.find(v => v.type === 'tablet' && v.file);
    const mobileVariant = r.variants.find(v => v.type === 'mobile' && v.file);
    
    if (desktopVariant || tabletVariant || mobileVariant) {
      mapping[r.file] = {
        desktop: desktopVariant?.file || null,
        tablet: tabletVariant?.file || null,
        mobile: mobileVariant?.file || null,
      };
    }
  }
  
  fs.writeFileSync(path.join(ROOT, 'responsive-image-map.json'), JSON.stringify(mapping, null, 2));
  fs.writeFileSync(path.join(ROOT, 'image-optimization-report.md'), report);
  
  console.log(`\n── Summary ──`);
  console.log(`Images processed: ${allResults.filter(r => !r.skipped).length}`);
  console.log(`Images skipped (small): ${allResults.filter(r => r.skipped).length}`);
  console.log(`Responsive variants created: ${allResults.reduce((acc, r) => acc + (r.variants?.filter(v => !v.exists && !v.error && v.type !== 'recompressed').length || 0), 0)}`);
  console.log(`Reports saved to:`);
  console.log(`  image-optimization-report.md`);
  console.log(`  responsive-image-map.json`);
}

main().catch(console.error);
