/**
 * inject-footer.mjs
 * 
 * Injects the standard site footer into the ported pages that are missing it.
 * The footer is extracted from meet-the-partners (a known-good original page).
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('New');

const PORTED_PAGES = [
  'benefits-analysis/index.html',
  'fegli-analysis/index.html',
  'social-security-analysis/index.html',
];

// ──── Extract footer from reference page ────
const referencePage = fs.readFileSync(path.join(ROOT, 'meet-the-partners/index.html'), 'utf-8');

// The footer section starts at the "Getting Started" row
const gettingStartedPos = referencePage.indexOf('<div id="fws_69d504e54ffc9"');
const footerOuterEnd = referencePage.indexOf('</div><!--/footer-outer-->');

if (gettingStartedPos === -1) {
  console.error('Could not find Getting Started section in reference page');
  process.exit(1);
}

// Get the footer row (Getting Started + Contact Us + Logo) and the footer-outer wrapper
const footerEnd = footerOuterEnd !== -1 
  ? footerOuterEnd + '</div><!--/footer-outer-->'.length
  : referencePage.indexOf('<div id="slide-out-widget-area-bg"');

const footerHTML = referencePage.substring(gettingStartedPos, footerEnd);
console.log('Footer extracted:', footerHTML.length, 'chars');

// Adapt footer URLs to relative
let adaptedFooter = footerHTML;
adaptedFooter = adaptedFooter.replace(
  /href="https:\/\/fedsafev2\.zeppelinwebsites\.com\/([^"#]*)"/g,
  'href="../$1"'
);
adaptedFooter = adaptedFooter.replace(
  /href="https:\/\/fedsafev2\.zeppelinwebsites\.com\/#/g,
  'href="../#'
);
adaptedFooter = adaptedFooter.replace(
  /href="https:\/\/fedsafev2\.zeppelinwebsites\.com"/g,
  'href="../"'
);

// ──── Process each ported page ────
for (const pagePath of PORTED_PAGES) {
  const fullPath = path.join(ROOT, pagePath);
  let html = fs.readFileSync(fullPath, 'utf-8');
  
  // Check if footer already exists
  if (html.includes('Getting Started') && html.includes('Chesterfield')) {
    console.log(`${pagePath}: Footer already present — skipping`);
    continue;
  }
  
  // Find the insertion point: just before the closing wrappers at the end
  // The ported pages end with:
  //   </div><!-- End Subpage Content -->
  //   </div><!--/row-->
  //   </div><!--/container-->
  //   </div><!--/container-wrap-->
  
  const endSubpageComment = html.indexOf('<!-- End Subpage Content -->');
  if (endSubpageComment !== -1) {
    // Insert footer right after <!-- End Subpage Content -->
    const insertPos = endSubpageComment + '<!-- End Subpage Content -->'.length;
    html = html.substring(0, insertPos) + 
      '\n\n<!-- Standard Site Footer -->\n' +
      adaptedFooter +
      '\n<!-- End Standard Site Footer -->\n' +
      html.substring(insertPos);
    
    fs.writeFileSync(fullPath, html, 'utf-8');
    console.log(`✓ ${pagePath}: Footer injected`);
  } else {
    // Alternative: insert before </body>
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose !== -1) {
      html = html.substring(0, bodyClose) +
        '\n<!-- Standard Site Footer -->\n' +
        adaptedFooter +
        '\n<!-- End Standard Site Footer -->\n\n' +
        html.substring(bodyClose);
      
      fs.writeFileSync(fullPath, html, 'utf-8');
      console.log(`✓ ${pagePath}: Footer injected (before </body>)`);
    } else {
      console.log(`⚠ ${pagePath}: Could not find insertion point`);
    }
  }
}

console.log('\nDone — footer injected into all ported pages.');
