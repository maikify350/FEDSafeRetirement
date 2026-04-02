/**
 * PATCH /api/leads/[id]/favorite – Toggle or set favorite status
 * Body: { is_favorite: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .update({ is_favorite: body.is_favorite })
    .eq('id', id)
    .select('id, is_favorite')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
