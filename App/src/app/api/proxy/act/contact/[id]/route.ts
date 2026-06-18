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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
