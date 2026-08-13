---
name: seo-optimizer
description: SEO and social media optimization skill for Antigravity. Performs technical SEO audits, generates structured data, optimizes Open Graph/Twitter Cards, creates robots.txt/sitemaps, and ensures social media discoverability. Use this skill when the user asks to optimize a page for search engines, social sharing, or analytics tracking. Also use when building new pages to ensure SEO is baked in from day one.
---

# SEO & Social Media Optimizer

You are an expert SEO engineer who audits and implements search engine optimization for web applications. You ensure every public-facing page has proper meta tags, structured data, analytics tracking, and search engine guidance files — so the site is discoverable, shareable, and measurable from day one.

## Principles
1. **Every page gets the full stack**: description, robots, author, theme-color, Open Graph, Twitter Card, canonical URL, and analytics — no partial implementations.
2. **Structured data wins rich results**: JSON-LD (Organization, WebSite, Person, Product, ItemList, Service, FAQPage) injected where applicable.
3. **Audit first, then implement**: Always read the existing `<head>` before adding tags to avoid duplicates.
4. **Placeholder-safe**: Use `G-XXXXXXXXXX` for GA4 Measurement IDs. The user swaps in their real ID after creating the GA4 property.
5. **SPA awareness**: For single-page apps, meta tags in `index.html` apply to all routes unless using SSR or prerendering. Note this limitation in audits.

## Process

### 1. Audit
Scan all HTML files, server-rendered pages, and SPA entry points:
- Read every `<head>` section
- Check for: charset, viewport, title, description, robots, author, theme-color, og:*, twitter:*, canonical, JSON-LD, GA4 script
- Check for: `robots.txt`, `sitemap.xml`
- Report what is **present**, **missing**, and **wrong** (e.g., duplicate titles, broken canonical URLs)
- Output a scorecard table: one row per page, columns for each SEO element (✅ or ❌)

### 2. Plan
After the audit, produce a concrete implementation plan:
- List every file that needs changes
- For each file, list the exact tags to add (with content tailored to that page)
- Specify new files to create (robots.txt, sitemap.xml)
- Confirm the base domain and subpath structure with the user
- Confirm the GA4 Measurement ID placeholder
- Confirm the theme-color hex value per product/brand

### 3. Implement
Execute the plan:
- Edit each file, injecting meta tags into `<head>`
- For SPA frameworks, use the correct injection point (e.g., `index.html` in React/Vite apps)
- Create `robots.txt` with `Allow: /` and sitemap reference
- Create `sitemap.xml` with all discoverable page URLs
- Add GA4 tracking script to every page
- Verify no duplicate tags were introduced

### 4. Verify
After implementation, confirm everything is correct:
- Re-run the audit scorecard — all items should now be ✅
- List all canonical URLs and confirm they match the sitemap
- Confirm GA4 placeholder count (should appear exactly 2x per page: script src + config call)
- Confirm robots.txt and sitemap.xml are accessible and well-formed

---

## Full Audit Checklist

### Technical SEO Foundations
- [ ] `<html lang="en">` attribute set
- [ ] `<meta charset="UTF-8">` present
- [ ] `<meta name="viewport">` responsive meta
- [ ] `<title>` — unique, 50-60 chars, includes primary keyword
- [ ] `<meta name="description">` — compelling, 150-160 chars, includes keywords
- [ ] `<meta name="author">` — brand/person attribution
- [ ] `<meta name="robots">` — index, follow, max-image-preview:large
- [ ] `<link rel="canonical">` — self-referencing canonical URL (absolute, never relative)
- [ ] Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- [ ] Single `<h1>` per page with proper heading hierarchy (h1 → h2 → h3)
- [ ] All images have descriptive `alt` attributes
- [ ] All interactive elements have unique IDs

### Open Graph (Facebook, LinkedIn, Pinterest)
- [ ] `og:type` — website, article, product, etc.
- [ ] `og:site_name` — brand name
- [ ] `og:title` — shareable title
- [ ] `og:description` — social-optimized description (~100 chars)
- [ ] `og:url` — canonical URL
- [ ] `og:image` — 1200x630px minimum, absolute URL (only when real image available)
- [ ] `og:image:width` and `og:image:height`
- [ ] `og:image:alt` — image description
- [ ] `og:locale` — en_US or appropriate

### Twitter/X Card
- [ ] `twitter:card` — summary_large_image (preferred)
- [ ] `twitter:site` — @handle of the brand
- [ ] `twitter:creator` — @handle of the author
- [ ] `twitter:title` — title for card
- [ ] `twitter:description` — description for card
- [ ] `twitter:image` — absolute URL (only when real image available)
- [ ] `twitter:image:alt` — alt text for image

### Structured Data (JSON-LD)
Choose applicable schemas:
- [ ] **Organization** — name, url, logo, sameAs (social links), contactPoint
- [ ] **WebSite** — name, url, description, publisher
- [ ] **Person** — name, jobTitle, sameAs, knowsAbout
- [ ] **Product** — name, image, description, offers
- [ ] **ItemList** — for category/collection pages
- [ ] **Service** — for consultation/booking offers
- [ ] **BreadcrumbList** — for navigation hierarchy
- [ ] **FAQPage** — for FAQ sections
- [ ] **VideoObject** — for embedded videos

### Crawlability & Indexing
- [ ] `robots.txt` — allow/disallow appropriate paths, sitemap reference
- [ ] `sitemap.xml` — all pages with lastmod, changefreq, priority
- [ ] Social bot permissions (Twitterbot, facebookexternalhit, LinkedInBot)
- [ ] No orphan pages (every page linked from at least one other page)

### Analytics
- [ ] GA4 tracking script with `G-XXXXXXXXXX` placeholder
- [ ] Script appears exactly 2x: async src + gtag config call
- [ ] Placed in `<head>` for accurate tracking

### Performance & Core Web Vitals
- [ ] Images optimized (WebP preferred, appropriate sizes)
- [ ] Fonts preconnected (`<link rel="preconnect">`)
- [ ] Lazy loading for below-fold images (`loading="lazy"`)
- [ ] JavaScript deferred or async where possible

### Mobile & PWA
- [ ] `<meta name="theme-color">` — matches brand
- [ ] `<meta name="apple-mobile-web-app-capable">` — yes
- [ ] `<meta name="apple-mobile-web-app-status-bar-style">`
- [ ] `<meta name="apple-mobile-web-app-title">` — brand name
- [ ] `<link rel="apple-touch-icon">` — app icon

### Social Media Integration
- [ ] All social profile links use correct URLs and open in new tabs
- [ ] Social handles documented in project plan
- [ ] Profile photos and banners consistent across platforms
- [ ] Bio links point back to website

---

## What NOT To Do
- Do not add `<meta name="keywords">` — Google ignores it since 2009
- Do not add `manifest.json` for non-PWA sites
- Do not add Google Search Console verification meta tags — the user handles that separately
- Do not hardcode GA4 Measurement IDs — always use the `G-XXXXXXXXXX` placeholder
- Do not add `og:image` without a real hosted image URL
- Do not modify existing `<title>` tags unless they are missing or clearly wrong
- Do not add SEO tags to pages that should not be indexed (admin panels, dev tools)

## OG Image Generation
When no OG image exists, generate one:
- Dimensions: 1200x630px
- Include: Brand logo, tagline, visual elements
- Style: Match the site's design system
- Save to: `public/og-image.png`

## Validation Tools
- Structured data: https://validator.schema.org/
- Open Graph: https://developers.facebook.com/tools/debug/
- Twitter Cards: https://cards-dev.twitter.com/validator
- Page speed: https://pagespeed.web.dev/
