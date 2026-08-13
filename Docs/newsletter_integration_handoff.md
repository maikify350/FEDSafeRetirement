# Newsletter Signup — Website Integration Handoff

## Scope

The server-side newsletter work is already in the portal app. The website agent should **not rebuild the backend**. Their job is to wire the static marketing website newsletter form to the dedicated newsletter endpoint and verify that submissions land in the portal.

Use this dedicated newsletter endpoint for the red homepage CTA / retirement updates signup flow:

```
POST /api/public/newsletter-signup
```

Do **not** use `/api/public/website-lead` for newsletter signups. That generic adapter is reserved for later non-newsletter forms such as contact, checklist, and agency briefing.

## Relevant Repos / Files

Portal app backend and admin UI:

```
C:\WIP\FEDSafeRetirement_App\App
```

Static marketing website:

```
C:\WIP\FEDSafeRetirement\WebSite
```

Server-side files already created:

```
C:\WIP\FEDSafeRetirement_App\App\src\app\api\public\newsletter-signup\route.ts
C:\WIP\FEDSafeRetirement_App\App\src\app\api\newsletter\route.ts
C:\WIP\FEDSafeRetirement_App\App\src\views\newsletter\
C:\WIP\FEDSafeRetirement_App\App\src\app\(dashboard)\newsletter\
C:\WIP\FEDSafeRetirement_App\App\supabase\migrations\020_newsletter_subscribers.sql
```

## Endpoint

Production:

```
POST https://fedsafe-retirement.vercel.app/api/public/newsletter-signup
```

Local portal dev server:

```
POST http://localhost:8001/api/public/newsletter-signup
```

> **CORS**: Fully open (`Access-Control-Allow-Origin: *`) — can be called from any domain.

---

## Request

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

### Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | `string` | ✅ Yes | First name from the form |
| `lastName` | `string` | ✅ Yes | Last name from the form |
| `cellPhone` | `string` | ✅ Yes | Cell phone number (any format — auto-normalized to `(XXX) XXX-XXXX`) |
| `personalEmail` | `string` | ✅ Yes | Personal email address (validated server-side) |
| `sourcePage` | `string` | No | URL of the page the form was submitted from |
| `referrer` | `string` | No | HTTP referrer value |
| `smsConsent` | `boolean` | No | SMS consent flag (defaults to `true` if omitted) |
| `website` | `string` | No | **Honeypot field** — include as a hidden field. Leave blank. If filled, the submission is silently discarded. |

> [!NOTE]
> **Field name aliases**: The endpoint also accepts `first_name`, `last_name`, `cell_phone`/`phone`, `personal_email`/`email`, and `source_page` as alternate key names.

### Example Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "cellPhone": "(703) 555-1234",
  "personalEmail": "john.doe@gmail.com",
  "sourcePage": "https://fedsaferetirement.com/newsletter",
  "smsConsent": true
}
```

---

## Responses

### ✅ Success — `200 OK`

```json
{
  "ok": true,
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### ❌ Validation Error — `400 Bad Request`

```json
{ "error": "First name is required" }
{ "error": "Last name is required" }
{ "error": "Cell phone is required" }
{ "error": "Personal email is required" }
{ "error": "Invalid email address" }
{ "error": "Invalid JSON" }
```

### ❌ Server Error — `500 Internal Server Error`

```json
{ "error": "detailed error message from Supabase" }
```

---

## Duplicate Handling

- The endpoint uses **upsert on `personal_email`**.
- If the same email is submitted again, the existing record is **updated** (not duplicated) and a `200` is returned.

---

## Honeypot (Bot Protection)

Include a **hidden field** named `website` in your form HTML:

```html
<!-- Honeypot — hidden from real users, bots will fill it -->
<div style="position: absolute; left: -9999px;" aria-hidden="true">
  <input type="text" name="website" tabindex="-1" autocomplete="off" />
</div>
```

If the `website` field contains any value, the endpoint returns `200 OK` with `{ "ok": true, "skipped": true }` — the submission is silently discarded.

---

## Success Dialog — Confetti Celebration

When the form submits successfully, show a modal overlay with an animated confetti explosion, party hat & whistle emojis, and the congratulations message. This is **drop-in vanilla JS + CSS** — no libraries required.

### 1 — Add the modal HTML (once, anywhere in the `<body>`)

```html
<!-- Newsletter Success Modal -->
<div id="newsletter-success-modal" style="display:none;" aria-modal="true" role="dialog" aria-labelledby="nsl-title">
  <div id="nsl-backdrop"></div>
  <div id="nsl-card">
    <canvas id="nsl-confetti"></canvas>
    <div id="nsl-emoji">🎉🎊</div>
    <h2 id="nsl-title">Congratulations!</h2>
    <p id="nsl-body">
      You are now on our newsletter email list!<br>
      <span id="nsl-sub">Get ready for retirement insights, benefits updates, and educational resources delivered to your inbox.</span>
    </p>
    <button id="nsl-close" onclick="closeNewsletterModal()">Got it!</button>
  </div>
</div>
```

### 2 — Add the CSS (in your `<style>` block or stylesheet)

```css
/* ── Newsletter Success Modal ───────────────────────────────────── */
#newsletter-success-modal {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
#nsl-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  animation: nslFadeIn 0.3s ease;
}
#nsl-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px 36px;
  max-width: 440px; width: 90%;
  text-align: center;
  box-shadow: 0 32px 80px rgba(0,0,0,0.25);
  animation: nslSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
}
#nsl-confetti {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
#nsl-emoji {
  font-size: 64px;
  line-height: 1;
  margin-bottom: 16px;
  animation: nslBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
  display: block;
}
#nsl-title {
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px;
}
#nsl-body {
  font-size: 16px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 28px;
}
#nsl-sub {
  display: block;
  font-size: 13px;
  color: #94a3b8;
  margin-top: 8px;
}
#nsl-close {
  background: linear-gradient(135deg, #1e3a5f, #2563eb);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px 40px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(37,99,235,0.35);
}
#nsl-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37,99,235,0.45);
}
@keyframes nslFadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes nslSlideUp  { from { opacity:0; transform:translateY(40px) scale(0.9) } to { opacity:1; transform:none } }
@keyframes nslBounce   { from { transform:scale(0) } to { transform:scale(1) } }
```

### 3 — Add the JavaScript (before `</body>` or in your JS bundle)

```javascript
/* ── Newsletter Confetti Modal ──────────────────────────────────── */

function showNewsletterModal() {
  const modal = document.getElementById('newsletter-success-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  launchConfetti();
}

function closeNewsletterModal() {
  const modal = document.getElementById('newsletter-success-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Close on backdrop click
document.getElementById('nsl-backdrop')
  .addEventListener('click', closeNewsletterModal);

// ── Confetti engine (no library needed) ─────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('nsl-confetti');
  const ctx    = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const COLORS = ['#f59e0b','#3b82f6','#10b981','#ec4899','#8b5cf6','#ef4444','#06b6d4'];
  const COUNT  = 120;

  const pieces = Array.from({ length: COUNT }, () => ({
    x:     Math.random() * canvas.width,
    y:     -Math.random() * canvas.height * 0.5,
    w:     6 + Math.random() * 8,
    h:     10 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:   Math.random() * Math.PI * 2,
    rotV:  (Math.random() - 0.5) * 0.15,
    vx:    (Math.random() - 0.5) * 3,
    vy:    2 + Math.random() * 4,
    alpha: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotV;
      p.vy  += 0.12;   // gravity
      if (p.y > canvas.height * 0.85) p.alpha -= 0.03;
      if (p.alpha <= 0) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (alive) frame = requestAnimationFrame(draw);
  }
  cancelAnimationFrame(frame);
  draw();
}

/* ── Newsletter Form Submit ─────────────────────────────────────── */

const newsletterForm = document.getElementById('newsletter-form');
const newsletterBtn  = newsletterForm?.querySelector('[type="submit"]');

newsletterForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (newsletterBtn) { newsletterBtn.disabled = true; newsletterBtn.textContent = 'Submitting…'; }

  const data = {
    firstName:     newsletterForm.querySelector('[name="firstName"]').value.trim(),
    lastName:      newsletterForm.querySelector('[name="lastName"]').value.trim(),
    cellPhone:     newsletterForm.querySelector('[name="cellPhone"]').value.trim(),
    personalEmail: newsletterForm.querySelector('[name="personalEmail"]').value.trim(),
    sourcePage:    window.location.href,
    referrer:      document.referrer,
    smsConsent:    true,
    website:       newsletterForm.querySelector('[name="website"]')?.value || '',  // honeypot
  };

  try {
    const res    = await fetch(
      'https://fedsafe-retirement.vercel.app/api/public/newsletter-signup',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    const result = await res.json();

    if (res.ok && result.ok) {
      newsletterForm.reset();
      showNewsletterModal();                          // 🎉 confetti!
    } else {
      showNewsletterError(result.error || 'Something went wrong. Please try again.');
    }
  } catch {
    showNewsletterError('Network error. Please try again.');
  } finally {
    if (newsletterBtn) { newsletterBtn.disabled = false; newsletterBtn.textContent = 'Subscribe'; }
  }
});

function showNewsletterError(msg) {
  // Replace with however the site currently shows inline errors
  const el = document.getElementById('newsletter-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else alert(msg);
}
```

### Recommended UX Behavior

- Disable the submit button while the request is in flight (shows `Submitting…`).
- On `200 OK` → reset the form, then open the confetti modal.
- On `400` → display the returned `error` text inline near the form (not an alert).
- On network failure → show: `Unable to submit right now. Please try again.`
- The modal closes on button click or backdrop click.
- Do **not** redirect the visitor away from the page.



---

## Pre-Deployment Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Run `020_newsletter_subscribers.sql` in Supabase SQL Editor | ⬜ |
| 2 | Deploy App to Vercel (`vercel --prod` or git push) | ⬜ |
| 3 | Run smoke test: `node scratch/test_newsletter_signup.mjs` | ⬜ |
| 4 | Wire up the website form to the endpoint | ⬜ |
| 5 | Confirm the submission appears in the portal `/newsletter` page | ⬜ |
| 6 | Commit and deploy the website update to Vercel | ⬜ |

---

## Website Agent Acceptance Tests

1. Submit the newsletter form with valid values.
2. Confirm the browser receives `200 OK` with `{ "ok": true, "id": "..." }`.
3. Confirm the form shows a success state and resets.
4. Submit with a missing first name and confirm the returned validation error is shown.
5. Submit with an invalid email and confirm the returned validation error is shown.
6. Submit twice with the same email and confirm only one subscriber record remains, updated by email.
7. Fill the hidden `website` honeypot field manually in DevTools and confirm the response is `{ "ok": true, "skipped": true }`.
8. Confirm the new/updated subscriber appears in the admin portal Newsletter page.

---

## Admin Portal

Once deployed, the **Newsletter** page is accessible from the left sidebar in the App portal at:

```
https://fedsafe-retirement.vercel.app/newsletter
```

Features:
- **Grid view** with search, column picker, sort, and export (CSV/JSON)
- **+Add Subscriber** button for manual entry
- **Edit** on double-click or pencil icon
- **Delete** with red trash-can icon and confirmation dialog
