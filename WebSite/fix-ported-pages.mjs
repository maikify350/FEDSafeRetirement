/**
 * fix-ported-pages.mjs
 *
 * Fixes the 3 ported pages (benefits-analysis, fegli-analysis, social-security-analysis)
 * to match the look of the rest of the Salient-themed site:
 * 1. Replaces the Elementor header with the standard Salient header/nav
 * 2. Adds the standard footer section
 * 3. Fixes all staging URLs to be relative
 * 4. Adds CSS overrides for content area blending
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('New');

const PORTED_PAGES = [
  'benefits-analysis/index.html',
  'fegli-analysis/index.html',
  'social-security-analysis/index.html',
];

// ──────── Reference: Extract header from meet-the-partners (known good page) ────────
const referencePage = fs.readFileSync(path.join(ROOT, 'meet-the-partners/index.html'), 'utf-8');

// Extract the header block from </head> to just before <div class="container-wrap">
// The Salient header includes: body tag, script, header-space, header-outer, search-outer, <header>
const bodyStartMatch = referencePage.match(/<\/head>\s*<body[^>]*>/s);
const containerWrapMatch = referencePage.match(/<div class="container-wrap">/);

if (!bodyStartMatch || !containerWrapMatch) {
  console.error('Could not find header boundaries in reference page');
  process.exit(1);
}

const bodyStart = referencePage.indexOf(bodyStartMatch[0]);
const containerWrapPos = referencePage.indexOf(containerWrapMatch[0]);

// Everything from </head><body...> to just before <div class="container-wrap">
const referenceHeader = referencePage.substring(bodyStart, containerWrapPos);

// Extract the footer section (from the footer row to end of body)
// The footer starts with the "Getting Started / FedSafe Is Easy" section
const footerStartPattern = /<div id="fws_69d504e54ffc9"/;
const footerStartMatch = referencePage.match(footerStartPattern);

// Actually let's get the footer row and everything through </body> 
// The footer row starts at the "Getting Started" section which is after the team member cards
// Let me find it by looking for the footer-outer div
const footerOuterMatch = referencePage.match(/<div id="footer-outer"/);
if (!footerOuterMatch) {
  console.error('Could not find footer-outer in reference page');
  process.exit(1);
}

// Get everything from the "Getting Started" row to </body>
// The Getting Started row is right before the footer-outer
const gettingStartedPos = referencePage.indexOf('<div id="fws_69d504e54ffc9"');
const footerOuterPos = referencePage.indexOf('<div id="footer-outer"');

// We want: the "Getting Started / Contact Us" footer row + the footer-outer + slide-out + closing scripts
const bodyEndPos = referencePage.indexOf('</body>');
const footerSection = referencePage.substring(gettingStartedPos, bodyEndPos);

console.log('Reference header extracted:', referenceHeader.length, 'chars');
console.log('Footer section extracted:', footerSection.length, 'chars');

// ──────── CSS overrides to blend Elementor content ────────
const blendingCSS = `
<style id="ported-page-blend-overrides">
/* ── Hide the Elementor header/nav since we use the Salient one ── */
.elementor-location-header,
header.elementor-location-header,
.elementor-8,
[data-elementor-type="header"] {
  display: none !important;
}

/* ── Tame the Elementor content area to sit nicely after the Salient header ── */
.container-wrap .elementor-subpage-content {
  padding-top: 0;
}

/* ══════ FONT OVERRIDES: Match original site (Manrope body, Oswald headings) ══════ */

/* ── Override ALL Elementor global typography to use site fonts ── */
.elementor-subpage-content,
.elementor-subpage-content .elementor-widget-container,
.elementor-subpage-content .elementor-widget-text-editor,
.elementor-subpage-content .elementor-section,
.elementor-subpage-content .e-con,
.elementor-subpage-content p,
.elementor-subpage-content label,
.elementor-subpage-content span,
.elementor-subpage-content li,
.elementor-subpage-content a {
  font-family: 'Manrope', sans-serif !important;
}

/* ── Headings: use Oswald to match rest of site ── */
.elementor-subpage-content h1,
.elementor-subpage-content h2,
.elementor-subpage-content h3,
.elementor-subpage-content h4,
.elementor-subpage-content h5,
.elementor-subpage-content h6,
.elementor-subpage-content .elementor-heading-title,
.elementor-subpage-content .elementor-widget-heading .elementor-heading-title {
  font-family: 'Oswald', sans-serif !important;
  text-transform: uppercase;
}

/* ── Form inputs and buttons ── */
.elementor-subpage-content .elementor-field-group .elementor-field,
.elementor-subpage-content input,
.elementor-subpage-content textarea,
.elementor-subpage-content select,
.elementor-subpage-content .elementor-field-subgroup label {
  font-family: 'Manrope', sans-serif !important;
}

.elementor-subpage-content .elementor-button,
.elementor-subpage-content .elementor-button span {
  font-family: 'Oswald', sans-serif !important;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* ── Override Elementor kit variables that set Roboto/Montserrat ── */
.elementor-subpage-content .elementor-kit-285 {
  --e-global-typography-primary-font-family: 'Oswald' !important;
  --e-global-typography-secondary-font-family: 'Oswald' !important;
  --e-global-typography-text-font-family: 'Manrope' !important;
  --e-global-typography-accent-font-family: 'Manrope' !important;
}

/* ── Make subpage hero sections respect the site's header space ── */
.elementor-subpage-content > .elementor:first-child > .elementor-section:first-child,
.elementor-subpage-content > .elementor:first-child > .e-con:first-child {
  padding-top: 0;
}

/* ── Ensure elementor container max-widths work ── */
.elementor-subpage-content .elementor-section.elementor-section-boxed > .elementor-container {
  max-width: 1140px;
}

/* ── Fix the overall page bg to match the site ── */
body .container-wrap {
  background-color: #d9dee2;
}

/* ── Footer Getting Started row spacing fix ── */
.ported-page-footer {
  margin-top: 40px;
}
</style>
`;

// ──────── Process each ported page ────────
for (const pagePath of PORTED_PAGES) {
  const fullPath = path.join(ROOT, pagePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Skipping ${pagePath} — file not found`);
    continue;
  }

  let html = fs.readFileSync(fullPath, 'utf-8');
  const pageName = path.dirname(pagePath);
  console.log(`\nProcessing: ${pagePath}`);

  // ── Step 1: Fix staging URLs to be relative ──
  // Replace https://fedsafev2.zeppelinwebsites.com/ with relative paths
  const urlReplacements = [
    // Main pages
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/benefits-analysis\/?/g, '../benefits-analysis/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/fegli-analysis\/?/g, '../fegli-analysis/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/social-security-analysis\/?/g, '../social-security-analysis/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/meet-the-partners\/?/g, '../meet-the-partners/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/resources\/?/g, '../resources/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/main-contact\/?/g, '../main-contact/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/think-youre-ready\/?/g, '../think-youre-ready/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/checklist\/?/g, '../checklist/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/for-agencies\/?/g, '../for-agencies/'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/for-agencies-contact\/?/g, '../for-agencies-contact/'],
    // Homepage (anchors)
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/#about/g, '../#about'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/#services/g, '../#services'],
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/#how/g, '../#how'],
    // Bare homepage
    [/https?:\/\/fedsafev2\.zeppelinwebsites\.com\/(?=["\s#'])/g, '../'],
    // Resources with anchors
    [/\.\.\/resources\/#faqs/g, '../resources/#faqs'],
    [/\.\.\/resources\/#testimonials/g, '../resources/#testimonials'],
  ];

  let urlFixCount = 0;
  for (const [pattern, replacement] of urlReplacements) {
    const matches = html.match(pattern);
    if (matches) {
      urlFixCount += matches.length;
      html = html.replace(pattern, replacement);
    }
  }
  console.log(`  Fixed ${urlFixCount} staging URLs → relative`);

  // ── Step 2: Inject blending CSS before </head> ──
  if (!html.includes('ported-page-blend-overrides')) {
    html = html.replace('</head>', blendingCSS + '\n</head>');
    console.log('  Injected blending CSS');
  }

  // ── Step 3: Replace the Elementor header with the Salient header ──
  // The ported pages have their body wrapped differently. Let's find the Elementor header and
  // wrap the content properly.
  
  // First, find where </head><body> is and where the subpage content starts
  const headEndMatch = html.match(/<\/head>\s*/);
  if (!headEndMatch) {
    console.log('  ⚠ Could not find </head>');
    continue;
  }
  
  // Find the Elementor header section (between body start and the actual page content)
  // The Elementor header is in a <div data-elementor-type="header"> or similar
  // For our ported pages, the content starts with <!-- Subpage Elementor Styles --> 
  // then the header content is wrapped in elementor sections, and the actual form/content
  // starts with the elementor-138 section
  
  // The approach: We need to wrap the Elementor content in the Salient shell structure
  // Check if we already processed this page
  if (html.includes('id="header-space"')) {
    console.log('  Already has Salient header — skipping header injection');
  } else {
    // Find the body tag - it's an Astra/Elementor body tag
    const bodyTagMatch = html.match(/<body[^>]*>/);
    if (bodyTagMatch) {
      const bodyTagEnd = html.indexOf(bodyTagMatch[0]) + bodyTagMatch[0].length;
      
      // Find where the Elementor page content starts
      // The actual content is after the Elementor header sections
      // Look for the main content section (elementor-138 for benefits, etc.)
      const subpageContentStart = html.indexOf('<!-- Subpage Elementor Styles -->');
      const elemContentStart = subpageContentStart !== -1 ? subpageContentStart : bodyTagEnd;
      
      // Find the Elementor header (elementor-8 section with nav)
      // It's between body and the main content
      const elemHeaderStart = html.indexOf('<div data-elementor-type="header"');
      const elemHeaderSectionStart = elemHeaderStart !== -1 ? elemHeaderStart : html.indexOf('<section class="elementor-section elementor-top-section elementor-element elementor-element-78cd6be');
      
      // Build the new structure:
      // 1. Our Salient header (up to container-wrap)
      // 2. Container-wrap > container > row wrapper
      // 3. The original Elementor content (wrapped for styling)
      // 4. Close the wrappers
      // 5. The footer
      
      // But we need to adapt the reference header to use ../ paths for this subpage
      let adaptedHeader = referenceHeader;
      // The reference header has ../assets paths which work for subpages already
      // Fix href to homepage to be relative
      adaptedHeader = adaptedHeader.replace(
        /href="https:\/\/fedsafev2\.zeppelinwebsites\.com\/"/g,
        'href="../"'
      );
      adaptedHeader = adaptedHeader.replace(
        /href="https:\/\/fedsafev2\.zeppelinwebsites\.com\/#/g, 
        'href="../#'
      );
      adaptedHeader = adaptedHeader.replace(
        /href="https:\/\/fedsafev2\.zeppelinwebsites\.com\/([^"]+)"/g,
        'href="../$1"'
      );
      adaptedHeader = adaptedHeader.replace(
        /action="https:\/\/fedsafev2\.zeppelinwebsites\.com\/"/g,
        'action="../"'
      );
      
      // Mark the current page as active in the nav
      const currentPageSlug = pageName;
      // Remove existing current-menu-item markers
      adaptedHeader = adaptedHeader.replace(/current-menu-item|current_page_item|page_item page-item-\d+/g, '');
      
      // Find where the body tag ends and insert Salient structure
      // We need to remove the old body tag and everything up to the content
      const beforeBody = html.substring(0, html.indexOf(bodyTagMatch[0]));
      const afterBodyContent = html.substring(elemContentStart);
      
      // Find where </body> is
      const bodyCloseIdx = html.lastIndexOf('</body>');
      const beforeBodyClose = html.substring(elemContentStart, bodyCloseIdx);
      const afterBodyClose = html.substring(bodyCloseIdx);
      
      // Adapt the footer section too
      let adaptedFooter = footerSection;
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
      // Remove script tags from footer (they reference external WP scripts)
      adaptedFooter = adaptedFooter.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
      adaptedFooter = adaptedFooter.replace(/<script[^>]*\/>/g, '');
      
      // Build the complete new HTML
      const newHtml = beforeBody + 
        adaptedHeader + 
        `\n<div class="container-wrap">\n` +
        `\t<div class="container main-content" role="main">\n` +
        `\t\t<div class="row">\n` +
        `\n<!-- Subpage Content Wrapper -->\n` +
        `<div class="elementor-subpage-content">\n` +
        beforeBodyClose +
        `\n</div>\n` +
        `<!-- End Subpage Content -->\n\n` +
        `<!-- Footer -->\n` +
        `<div class="ported-page-footer">\n` +
        adaptedFooter +
        `\n</div>\n` +
        `<!-- End Footer -->\n\n` +
        `\t\t</div><!--/row-->\n` +
        `\t</div><!--/container-->\n` +
        `</div><!--/container-wrap-->\n` +
        `</div><!--/ajax-content-wrap-->\n\n` +
        `</div></div>\n` +
        afterBodyClose;
      
      html = newHtml;
      console.log('  Injected Salient header + footer structure');
    }
  }

  // ── Step 4: Remove any remaining external WP script references from the Elementor content ──
  // Keep the elementor stylesheets since the content depends on them
  // But remove script tags that point to the staging server
  const wpScriptPattern = /<script[^>]*src="https?:\/\/fedsafev2\.zeppelinwebsites\.com[^"]*"[^>]*><\/script>/g;
  const wpScriptMatches = html.match(wpScriptPattern);
  if (wpScriptMatches) {
    html = html.replace(wpScriptPattern, '');
    console.log(`  Removed ${wpScriptMatches.length} external WP script references`);
  }
  
  // Also remove remaining inline fedsafev2 references in unnecessary metadata
  // Keep the CSS but clean up unnecessary RSS/oEmbed/API links
  html = html.replace(/<link rel="alternate" type="application\/rss\+xml"[^>]*>/g, '');
  html = html.replace(/<link rel="alternate" title="oEmbed[^>]*>/g, '');
  html = html.replace(/<link rel="https:\/\/api\.w\.org\/"[^>]*>/g, '');
  html = html.replace(/<link rel="alternate" title="JSON"[^>]*>/g, '');
  html = html.replace(/<link rel="EditURI"[^>]*>/g, '');
  html = html.replace(/<link rel="canonical"[^>]*fedsafev2[^>]*>/g, '');
  html = html.replace(/<link rel='shortlink'[^>]*fedsafev2[^>]*>/g, '');
  
  // Write the fixed file
  fs.writeFileSync(fullPath, html, 'utf-8');
  console.log(`  ✓ Saved: ${pagePath}`);
}

console.log('\n── Done ──');
console.log('All ported pages have been updated with:');
console.log('  • Standard Salient header/nav');
console.log('  • Standard footer (Getting Started + Logo + Contact Us)');
console.log('  • Relative URLs (staging → local)');
console.log('  • CSS overrides for visual blending');
