/**
 * Explainer routes accept either a signed-in Supabase user (browser) or a
 * service bearer token (EXPLAINER_SERVICE_KEY) used by the MCP server / Claude Code.
 */
import type { NextRequest } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export async function authorizeExplainerRequest(request: NextRequest): Promise<{ ok: boolean; actor: string }> {
  const auth = request.headers.get('authorization') || ''
  const serviceKey = process.env.EXPLAINER_SERVICE_KEY

  if (serviceKey && auth === `Bearer ${serviceKey}`) return { ok: true, actor: 'explainer-mcp' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) return { ok: true, actor: user.email || user.id }
  
return { ok: false, actor: '' }
}
