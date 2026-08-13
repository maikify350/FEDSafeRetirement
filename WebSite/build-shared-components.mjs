import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const rootArgIndex = process.argv.indexOf("--root");
const rootArg = rootArgIndex === -1 ? process.env.SHARED_COMPONENTS_ROOT : process.argv[rootArgIndex + 1];
const siteRoot = resolve(rootArg || "dist");
const referencePath = join(siteRoot, "index.html");
const footerOuterClose = "</div><!--/footer-outer-->";

if (!existsSync(referencePath)) {
  throw new Error(`Could not find shared-layout reference page: ${referencePath}`);
}

function indexPages(root) {
  const pages = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "assets" || entry.name === ".vercel") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === "index.html") {
        pages.push(full);
      }
    }
  }

  return pages;
}

function pagePrefix(pagePath) {
  return relative(siteRoot, pagePath).replace(/\\/g, "/") === "index.html" ? "" : "../";
}

function extractReferenceFooter(html) {
  const footerOuterStart = html.indexOf('<div id="footer-outer"');
  const footerOuterEnd = html.indexOf(footerOuterClose, footerOuterStart);
  if (footerOuterStart === -1 || footerOuterEnd === -1) {
    throw new Error("Could not find the homepage footer-outer block.");
  }

  const gettingStarted = html.lastIndexOf("Getting Started", footerOuterStart);
  const standardFooterStart = html.lastIndexOf('<div id="fws_', gettingStarted);
  if (gettingStarted === -1 || standardFooterStart === -1) {
    throw new Error("Could not find the homepage standard footer section.");
  }

  return {
    standardFooter: html.slice(standardFooterStart, footerOuterStart),
    footerOuter: html.slice(footerOuterStart, footerOuterEnd + footerOuterClose.length),
  };
}

function adaptFooterPaths(html, prefix) {
  if (!prefix) return html;

  return html
    .replace(/(["'(,\s])assets\//g, `$1${prefix}assets/`)
    .replace(/href="\.\//g, `href="${prefix}`)
    .replace(/href="privacy-policy\//g, `href="${prefix}privacy-policy/`)
    .replace(/href="terms-of-service\//g, `href="${prefix}terms-of-service/`);
}

function stripPageSpecificFooter(html) {
  let next = html.replace(/\s*<section class="fedsafe-standard-footer"[\s\S]*?<\/section>\s*/g, "\n");
  const footerOuterStart = next.indexOf('<div id="footer-outer"');
  if (footerOuterStart === -1) return next;

  const beforeFooterOuter = next.slice(0, footerOuterStart);
  const afterFooterOuter = next.slice(footerOuterStart);
  const gettingStarted = beforeFooterOuter.lastIndexOf("Getting Started");
  if (gettingStarted === -1) return next;

  const standardFooterStart = beforeFooterOuter.lastIndexOf('<div id="fws_', gettingStarted);
  if (standardFooterStart === -1) return next;

  return beforeFooterOuter.slice(0, standardFooterStart) + afterFooterOuter;
}

function replaceFooter(html, footer, prefix) {
  const footerOuterStart = html.indexOf('<div id="footer-outer"');
  const footerOuterEnd = html.indexOf(footerOuterClose, footerOuterStart);
  if (footerOuterStart === -1 || footerOuterEnd === -1) {
    return null;
  }

  const clean = stripPageSpecificFooter(html);
  const cleanFooterOuterStart = clean.indexOf('<div id="footer-outer"');
  const cleanFooterOuterEnd = clean.indexOf(footerOuterClose, cleanFooterOuterStart);
  const before = clean.slice(0, cleanFooterOuterStart);
  const after = clean.slice(cleanFooterOuterEnd + footerOuterClose.length);

  return [
    before.trimEnd(),
    "\n",
    adaptFooterPaths(footer.standardFooter, prefix).trim(),
    "\n",
    adaptFooterPaths(footer.footerOuter, prefix).trim(),
    after,
  ].join("");
}

const referenceHtml = readFileSync(referencePath, "utf8");
const footer = extractReferenceFooter(referenceHtml);

for (const page of indexPages(siteRoot)) {
  const prefix = pagePrefix(page);
  const html = readFileSync(page, "utf8");
  const next = replaceFooter(html, footer, prefix);
  if (next === null) {
    console.log(`Skipped shared footer for ${relative(siteRoot, page).replace(/\\/g, "/")}`);
    continue;
  }
  writeFileSync(page, next, "utf8");
  console.log(`Applied shared footer to ${relative(siteRoot, page).replace(/\\/g, "/")}`);
}
