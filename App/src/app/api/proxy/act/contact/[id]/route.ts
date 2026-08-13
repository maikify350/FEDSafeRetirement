/**
 * GET /api/proxy/act/contact/[id]
 *
 * Proxies request to Act! CRM API to fetch contact data.
 * Uses master credentials on the backend to avoid exposing them in the extension.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { actRequest } from '@/lib/act-api';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Set a value at a dotted path ("birthday", "customFields.spousedob",
// "businessAddress.line1"), creating intermediate objects as needed.
function setByPath(obj: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.');
  let o = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing contact ID' },
        { status: 400, headers: CORS }
      );
    }

    const data = await actRequest(`/contacts/${id}`);

    return NextResponse.json(data, { status: 200, headers: CORS });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    console.error('[/api/proxy/act/contact] Error:', msg);

return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS }
    );
  }
}

/**
 * PUT /api/proxy/act/contact/[id]
 *
 * Compound partial update: { updates: { "<apiPath>": value, ... } }.
 * We GET the current contact, apply only the requested paths, and PUT the
 * merged object back — so unspecified fields are preserved (Act!'s PUT replaces
 * the entity). This is the API write-back path the extension uses as a fallback
 * to DOM writes (e.g. when a field's tab isn't loaded, or for headless rules).
 *
 * NOTE: validate against a throwaway contact before enabling in the extension —
 * Act!'s PUT field-name expectations (esp. customFields shape) can be picky.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing contact ID' }, { status: 400, headers: CORS });
    }

    const body = await request.json().catch(() => null);
    const updates = body && body.updates;

    if (!updates || typeof updates !== 'object' || !Object.keys(updates).length) {
      return NextResponse.json({ success: false, error: 'Missing or empty `updates`' }, { status: 400, headers: CORS });
    }

    const current = await actRequest(`/contacts/${id}`);

    for (const [path, value] of Object.entries(updates)) setByPath(current, path, value);

    const updated = await actRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(current),
      headers: { 'Content-Type': 'application/json' },
    });

    return NextResponse.json({ success: true, contact: updated, applied: Object.keys(updates) }, { status: 200, headers: CORS });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    console.error('[/api/proxy/act/contact PUT] Error:', msg);

    return NextResponse.json({ success: false, error: msg }, { status: 500, headers: CORS });
  }
}
