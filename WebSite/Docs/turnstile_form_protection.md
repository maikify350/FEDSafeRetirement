# Cloudflare Turnstile Form Protection

FedSafe website forms use Cloudflare Turnstile before submitting to the portal API.

## Production Setup

Create a Cloudflare Turnstile widget in the Cloudflare dashboard.

Recommended widget mode:

- `Invisible` if Mike wants no visible widget.
- `Managed` if the team wants Cloudflare to show a checkbox only when a visitor looks risky.

Add the production site key to:

```js
C:\WIP\FEDSafeRetirement\WebSite\New\assets\js\fedsafe-turnstile.js
```

Set:

```js
var PRODUCTION_SITE_KEY = 'your-real-site-key';
```

Add the production secret key to the portal app environment:

```txt
TURNSTILE_SECRET_KEY=your-real-secret-key
```

The portal endpoint also accepts these aliases:

```txt
CLOUDFLARE_TURNSTILE_SECRET_KEY
CF_TURNSTILE_SECRET_KEY
```

## Local Testing

Localhost uses Cloudflare's official invisible test site key automatically:

```txt
1x00000000000000000000BB
```

The portal API uses Cloudflare's official always-pass test secret when `NODE_ENV` is not `production` and no real secret key is configured:

```txt
1x0000000000000000000000000000000AA
```

## Protected Forms

- `New/retirement-updates/index.html`
- `New/think-youre-ready/index.html`
- `New/main-contact/index.html`
- `New/for-agencies-contact/index.html`

## Backend Endpoints

- `POST /api/public/newsletter-signup`
- `POST /api/public/website-lead`

Both endpoints reject submissions without a valid Turnstile token after the honeypot check.
