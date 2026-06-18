/**
 * GET /api/echowin/calls
 *
 * Proxy to list echowin calls with optional filters.
 * Query params: page, limit, agentId, after (ISO date)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { listCalls } from '@/lib/echowin/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  try {
    const data = await listCalls({
      page:    searchParams.get('page')    ? parseInt(searchParams.get('page')!)    : 1,
      limit:   searchParams.get('limit')   ? parseInt(searchParams.get('limit')!)   : 25,
      agentId: searchParams.get('agentId') ?? undefined,
      after:   searchParams.get('after')   ?? undefined,
    })

    
return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)

    
return NextResponse.json({ error: msg }, { status: 500 })
  }
}
