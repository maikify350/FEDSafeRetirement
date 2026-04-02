/**
 * DELETE /api/leads/favorites – Clear all favorites
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function DELETE() {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ is_favorite: false })
    .eq('is_favorite', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
