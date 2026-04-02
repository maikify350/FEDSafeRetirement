import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an array of { id, sort_order }' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Supabase doesn't have a single bulk update query by default that is safe from RPC unless using upsert
  // Since we only want to update sort_order, upsert is okay if we pass id and sort_order,
  // but it's simpler and robust to do a Promise.all for updates in bulk since it's server-side, 
  // or use the Supabase JS client's upsert if all required fields aren't strictly needed.
  // Actually, standard postgres bulk update using upsert requires all NOT NULL columns.
  // To avoid fetching all data, we will just do Promise.all on the server side which is still
  // much faster and uses a single connection pool on the server, avoiding 52 HTTP requests from the browser.

  const promises = body.map(item => 
    supabase
      .from('lookup')
      .update({ sort_order: item.sort_order, mod_by: user?.email ?? 'system', mod_at: new Date().toISOString() })
      .eq('id', item.id)
  )

  const results = await Promise.all(promises)
  
  const hasErrors = results.some(r => r.error)
  if (hasErrors) {
    return NextResponse.json({ error: 'Some updates failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: body.length })
}
