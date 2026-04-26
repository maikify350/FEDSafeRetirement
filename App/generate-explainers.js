/**
 * generate-explainers.js
 *
 * Generates voice explainer summaries for all federal forms using
 * GPT-4o-mini (with detailed form-specific prompts) + OpenAI TTS audio.
 * Uploads MP3 to Supabase 'Explainers' bucket and saves back to DB.
 *
 * These are well-known government forms — GPT-4o-mini has strong
 * training data on all of them, making metadata-driven prompts effective.
 *
 * Run from the App folder:
 *   node generate-explainers.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// ── Supabase (service role) ───────────────────────────────────────────────────
const sb = createClient(
  'https://gqarlkfmpgaotbezpkbs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'
)

// ── Resolve OpenAI key from env or .env ──────────────────────────────────────
function getOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const envFile = path.join(__dirname, '.env')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      if (line.startsWith('NEXT_PUBLIC_OPENAI_API_KEY=') || line.startsWith('OPENAI_API_KEY=')) {
        return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  }
  return null
}

// ── GPT-4o-mini summary ───────────────────────────────────────────────────────
async function generateSummary(form, apiKey) {
  const prompt = `You are a federal benefits expert writing a voice explainer for insurance agents helping federal employees.

Form Number: ${form.form_id}${form.aka ? ` (also called "${form.aka}")` : ''}
Official Title: ${form.title}
Description: ${form.description ?? 'N/A'}
Tags/Topics: ${form.tags ?? 'N/A'}
Instruction Pages: ${form.instruct_pages} | Fillable Pages: ${form.fill_pages}

Write exactly 4 sentences spoken directly to an insurance agent. Cover ALL of these:
1. What this specific form IS and its single core purpose (use the official form title)
2. The exact triggering events when an employee MUST complete it
3. The specific data fields and information the form collects (be precise: list field categories like "employee name, Social Security Number, agency code, plan enrollment code, coverage option, dependent information" etc.)
4. Who receives the completed form and the processing timeline or deadline

Hard rules:
- No bullet points, no markdown, no headers — spoken sentences only
- Start with the form number: "The ${form.form_id}..."  
- Speak to the agent: "your client", "the employee"
- Be specific to THIS form's actual fields — not generic
- Under 90 words total`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    })
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error?.message || 'GPT failed')
  return d.choices[0].message.content.trim()
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────
async function generateAudio(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: text, response_format: 'mp3' })
  })
  if (!res.ok) throw new Error(await res.text())
  return Buffer.from(await res.arrayBuffer())
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const apiKey = getOpenAIKey()
  if (!apiKey || apiKey.length < 20) {
    console.error('❌  OpenAI API key not found.'); process.exit(1)
  }
  console.log('🔑  OpenAI key found\n')

  const { data: forms, error } = await sb.from('forms')
    .select('id, form_id, aka, title, description, tags, instruct_pages, fill_pages')
    .order('form_id')
  if (error) { console.error('DB:', error.message); process.exit(1) }

  for (const form of forms) {
    console.log(`━━━ ${form.form_id}  ${form.title} ━━━`)

    // 1. Generate GPT summary
    console.log(`  🤖 Generating summary...`)
    let summary = ''
    try {
      summary = await generateSummary(form, apiKey)
      console.log(`  ✅ "${summary.slice(0, 110)}…"`)
    } catch (e) { console.error(`  ❌ GPT: ${e.message}`); continue }

    // 2. TTS audio
    console.log(`  🔊 Generating audio...`)
    let mp3
    try {
      mp3 = await generateAudio(summary, apiKey)
      console.log(`  ✅ ${mp3.length} bytes`)
    } catch (e) { console.error(`  ❌ TTS: ${e.message}`); continue }

    // 3. Upload to Explainers bucket
    const fileName = `${form.form_id.replace(/[^a-zA-Z0-9]/g, '_')}_explainer.mp3`
    const { error: upErr } = await sb.storage.from('Explainers')
      .upload(fileName, mp3, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) { console.error(`  ❌ Upload: ${upErr.message}`); continue }

    const { data: { publicUrl } } = sb.storage.from('Explainers').getPublicUrl(fileName)
    console.log(`  ☁️  ${publicUrl}`)

    // 4. Save to DB
    const { error: dbErr } = await sb.from('forms').update({
      summary,
      explainer_url: publicUrl,
      mod_by: 'system-batch',
      mod_dt: new Date().toISOString(),
    }).eq('id', form.id)

    if (dbErr) console.error(`  ❌ DB: ${dbErr.message}`)
    else console.log(`  💾 Saved ✓\n`)
  }

  console.log('🎉  All done!')
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
