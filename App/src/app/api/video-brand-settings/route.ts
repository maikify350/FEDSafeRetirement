/**
 * GET /api/video-brand-settings — Fetch brand settings and production rules
 * PUT /api/video-brand-settings — Update a specific brand setting by key
 *
 * Multi-tier storage:
 * 1. Checks public.video_brand_settings table
 * 2. Falls back to public.app_settings (key: 'video_brand_guidelines')
 * 3. Falls back to in-memory DEFAULT_BRAND_GUIDELINES
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { DEFAULT_BRAND_GUIDELINES, type BrandGuidelineItem } from '@/data/defaultBrandGuidelines'

const APP_SETTINGS_KEY = 'video_brand_guidelines'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Try video_brand_settings table
    try {
      const { data, error } = await admin
        .from('video_brand_settings')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data)
      }
    } catch {
      // ignore
    }

    // 2. Try app_settings table
    try {
      const { data: appData, error: appError } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', APP_SETTINGS_KEY)
        .maybeSingle()

      if (!appError && appData?.value && Array.isArray(appData.value)) {
        return NextResponse.json(appData.value)
      }
    } catch {
      // ignore
    }

    // 3. Return defaults
    return NextResponse.json(DEFAULT_BRAND_GUIDELINES)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const body = await request.json()

    if (!body.key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // 1. Try updating video_brand_settings
    try {
      const { data, error } = await admin
        .from('video_brand_settings')
        .update({
          value_text: body.value_text ?? '',
          value_json: body.value_json ?? {},
          label: body.label ?? undefined,
          mod_dt: now,
        })
        .eq('key', body.key)
        .select('*')
        .single()

      if (!error && data) {
        return NextResponse.json(data)
      }
    } catch {
      // fallback to app_settings
    }

    // 2. Fallback: Save in app_settings JSON blob
    try {
      const { data: current } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', APP_SETTINGS_KEY)
        .maybeSingle()

      const list: BrandGuidelineItem[] = Array.isArray(current?.value)
        ? current.value
        : [...DEFAULT_BRAND_GUIDELINES]

      const idx = list.findIndex(item => item.key === body.key)
      const updatedItem: BrandGuidelineItem = {
        key: body.key,
        label: body.label || (idx >= 0 ? list[idx].label : body.key),
        sort_order: idx >= 0 ? list[idx].sort_order : list.length + 1,
        value_text: body.value_text ?? '',
        mod_dt: now,
      }

      if (idx >= 0) {
        list[idx] = updatedItem
      } else {
        list.push(updatedItem)
      }

      await admin
        .from('app_settings')
        .upsert({
          key: APP_SETTINGS_KEY,
          value: list,
          updated_at: now,
        })

      return NextResponse.json(updatedItem)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Save failed' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
