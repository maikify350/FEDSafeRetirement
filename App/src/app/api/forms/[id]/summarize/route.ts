/**
 * POST /api/forms/[id]/summarize
 *
 * 1. Loads the form record (title, description, tags, instruct_pages)
 * 2. Sends to GPT-4o-mini → generates a plain-language voice explainer summary
 * 3. Sends summary to OpenAI TTS (tts-1, alloy voice) → MP3 bytes
 * 4. Uploads MP3 to Supabase Storage 'Explainers' bucket
 * 5. Saves summary + explainer_url back to the forms record
 * 6. Returns the updated form
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export const maxDuration = 60

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Auth: admin only ────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (userRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // ── Load the form ───────────────────────────────────────────────────────────
  const { data: form, error: formErr } = await admin
    .from('forms')
    .select('id, form_id, aka, title, description, tags, instruct_pages, fill_pages, source_url')
    .eq('id', id)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!openaiKey || openaiKey.includes('n0tr3al')) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  // ── Step 1: Generate summary via GPT-4o-mini ────────────────────────────────
  const prompt = `You are a federal benefits expert writing a short voice explainer for insurance agents helping federal employees.

Form: ${form.form_id}${form.aka ? ` (${form.aka})` : ''}
Title: ${form.title}
Description: ${form.description ?? 'N/A'}
Tags: ${form.tags ?? 'N/A'}
Instruction Pages: ${form.instruct_pages ?? 'N/A'}
Fillable Pages: ${form.fill_pages ?? 'N/A'}

Write a 3–5 sentence voice explainer that:
1. Opens with what this form IS and its core purpose — what action it accomplishes for the employee
2. States exactly WHEN an employee must complete it (triggering events: new hire, open season, qualifying life event, retirement, etc.)
3. Identifies the most important data the form collects — this is critical for field mapping — mention specific categories like employee identification, plan code, enrollment type, beneficiary designations, etc.
4. Ends with who processes it and any key deadline or consequence

Rules:
- Speak directly to the agent ("your client", "the employee")
- Use plain spoken language — no bullet points, no markdown, no headers
- Be concise and specific — avoid generic phrases like "important form" or "please read carefully"
- Focus on WHAT the form does and WHAT DATA it needs, not on how to fill it out line by line
- Agents already know how to read; make this explainer worth listening to`

  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
    }),
  })

  const chatData = await chatRes.json()
  if (!chatRes.ok) {
    return NextResponse.json({ error: `OpenAI error: ${chatData.error?.message}` }, { status: 500 })
  }

  const summary: string = chatData.choices?.[0]?.message?.content?.trim() ?? ''
  if (!summary) {
    return NextResponse.json({ error: 'Empty summary generated' }, { status: 500 })
  }

  // ── Step 2: Generate TTS audio via OpenAI ───────────────────────────────────
  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'alloy',
      input: summary,
      response_format: 'mp3',
    }),
  })

  if (!ttsRes.ok) {
    const errText = await ttsRes.text()
    return NextResponse.json({ error: `TTS error: ${errText}` }, { status: 500 })
  }

  const audioBuffer = await ttsRes.arrayBuffer()
  const audioBytes = new Uint8Array(audioBuffer)

  // ── Step 3: Upload MP3 to Supabase Storage 'Explainers' bucket ─────────────
  const fileName = `${form.form_id.replace(/[^a-zA-Z0-9]/g, '_')}_explainer.mp3`

  const { error: uploadErr } = await admin.storage
    .from('Explainers')
    .upload(fileName, audioBytes, { contentType: 'audio/mpeg', upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('Explainers').getPublicUrl(fileName)

  // ── Step 4: Save summary + explainer_url back to the form ───────────────────
  const { data: updated, error: updateErr } = await admin
    .from('forms')
    .update({
      summary,
      explainer_url: publicUrl,
      mod_by: authUser.email ?? 'system',
      mod_dt: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, form_id, summary, explainer_url, mod_by, mod_dt')
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, summary, explainer_url: publicUrl, form: updated })
}
