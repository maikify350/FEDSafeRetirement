/**
 * Act! CRM API Utility (Server-side only)
 * Handles authentication and requests to apius.act.com.
 * Uses master credentials from .env.
 */

const ACT_API_BASE = process.env.ACT_API_BASE || 'https://apius.act.com/act.web.api';
const ACT_USERNAME = process.env.ACT_USERNAME;
const ACT_PASSWORD = process.env.ACT_PASSWORD;
const ACT_DATABASE = process.env.ACT_DATABASE;

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getActToken(): Promise<string> {
  // Refresh if missing or expiring in less than 5 seconds
  if (cachedToken && Date.now() < tokenExpiry - 5000) {
    return cachedToken;
  }

  if (!ACT_USERNAME || !ACT_PASSWORD || !ACT_DATABASE) {
    throw new Error('Missing Act! credentials in environment variables.');
  }

  const authUrl = `${ACT_API_BASE}/authorize`;
  const creds = Buffer.from(`${ACT_USERNAME}:${ACT_PASSWORD}`).toString('base64');

  const resp = await fetch(authUrl, {
    headers: {
      'Authorization': `Basic ${creds}`,
      'Act-Database-Name': ACT_DATABASE,
    },
  });

  if (!resp.ok) {
    throw new Error(`Act! Auth failed: ${resp.status} ${resp.statusText}`);
  }

  // Token is raw JWT string
  const raw = await resp.text();

  cachedToken = raw.replace(/^"|"$/g, '').trim();
  tokenExpiry = Date.now() + 55000; // Act! tokens usually last 60s

  return cachedToken;
}

export async function actRequest(path: string, options: RequestInit = {}) {
  const token = await getActToken();

  const url = path.startsWith('http') ? path : `${ACT_API_BASE}/api${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(options.headers);

  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Act-Database-Name', ACT_DATABASE!);
  headers.set('Accept', 'application/json');

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => 'No body');

    throw new Error(`Act! API error [${resp.status}]: ${errorBody}`);
  }

  return resp.json();
}
