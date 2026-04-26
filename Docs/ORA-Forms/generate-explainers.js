/**
 * generate-explainers.js
 *
 * Reads each local PDF, extracts instruction-page text,
 * generates a GPT-4o-mini voice summary + OpenAI TTS audio,
 * uploads the MP3 to Supabase 'Explainers' bucket, and
 * saves both fields back to the forms table.
 *
 * Run from the repo root:
 *   node Docs/ORA-Forms/generate-explainers.js
 */

'use strict'
const fs   = require('fs')
const path = require('path')
const pdf  = require('pdf-parse')
const { createClient } = require('@supabase/supabase-js')

// ── Supabase (service role) ───────────────────────────────────────────────────
const sb = createClient(
  'https://gqarlkfmpgaotbezpkbs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8'
)

const FORMS_DIR = path.join(__dirname)  // Docs\ORA-Forms\

// ── PDF filename per form_id ──────────────────────────────────────────────────
const PDF_MAP = {
  'SF-2809':   'sf2809.pdf',
  'SF-2818':   'sf2818.pdf',
  'SF-2823':   'sf2823.pdf',
  'SF-3102':   'sf3102_2022_10_508.pdf',
  'SF-3107-2': 'sf3107.pdf',
  'W4P':       'fw4p.pdf',
}

// ── Resolve OpenAI key ────────────────────────────────────────────────────────
function getOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const envFile = path.join(__dirname, '..', '..', 'App', '.env.local')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      if (line.startsWith('NEXT_PUBLIC_OPENAI_API_KEY=') || line.startsWith('OPENAI_API_KEY=')) {
        return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  }
  return null
}

// ── Parse "1-3, 5" → [1,2,3,5] ───────────────────────────────────────────────
function parsePageRanges(str) {
  if (!str) return []
  const pages = new Set()
  for (const part of str.split(',').map(s => s.trim())) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number)
      for (let i = a; i <= b; i++) pages.add(i)
    } else {
      const n = Number(part)
      if (!isNaN(n) && n > 0) pages.add(n)
    }
  }
  return [...pages].sort((a, b) => a - b)
}

// ── Extract text from specific pages ─────────────────────────────────────────
async function extractPages(pdfPath, pageNums) {
  const wanted = new Set(pageNums)
  let idx = 0
  const chunks = []
  await pdf(fs.readFileSync(pdfPath), {
    pagerender(pageData) {
      idx++
      if (!wanted.has(idx)) return Promise.resolve('')
      return pageData.getTextContent().then(tc => {
        const text = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()
        if (text) chunks.push(`[Page ${idx}]\n${text}`)
        return text
      })
    }
  })
  return chunks.join('\n\n')
}

// ── GPT summary ───────────────────────────────────────────────────────────────
async function generateSummary(pdfText, form, apiKey) {
  const prompt = `You are a federal benefits expert writing a voice explainer for insurance agents.

Form: ${form.form_id}${form.aka ? ` (${form.aka})` : ''}
Title: ${form.title}
Instruction pages: ${form.instruct_pages}

Actual form instruction text:
---
${pdfText.slice(0, 6000)}
---

Write 3–5 sentences spoken directly to an agent. Cover:
1. What this form IS and its core purpose
2. When the employee must complete it (triggering events)
3. The key data it collects (be specific: employee ID, plan codes, coverage type, dates, beneficiary info, etc.)
4. Who processes it and any deadline

No bullets, no markdown. Plain spoken sentences only. Be specific to this form's actual content.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 400 })
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
  if (!apiKey || apiKey.includes('n0tr3al') || apiKey.length < 20) {
    console.error('❌  OpenAI API key not found. Set OPENAI_API_KEY env var or check .env.local')
    process.exit(1)
  }
  console.log('🔑  OpenAI key found\n')

  const { data: forms, error } = await sb.from('forms')
    .select('id, form_id, aka, title, tags, instruct_pages')
    .order('form_id')
  if (error) { console.error('DB:', error.message); process.exit(1) }

  for (const form of forms) {
    const pdfFile = PDF_MAP[form.form_id]
    if (!pdfFile) { console.log(`⚠️  ${form.form_id} — no PDF mapped, skipping`); continue }

    const pdfPath = path.join(FORMS_DIR, pdfFile)
    if (!fs.existsSync(pdfPath)) { console.log(`⚠️  ${form.form_id} — file not found (${pdfFile}), skipping`); continue }

    console.log(`━━━ ${form.form_id}  ${form.title} ━━━`)

    // 1. Extract instruction pages
    const pages = parsePageRanges(form.instruct_pages)
    console.log(`  📄 Pages: ${pages.join(', ')}`)
    let pdfText = ''
    try {
      pdfText = await extractPages(pdfPath, pages)
      console.log(`  ✅ ${pdfText.length} chars extracted`)
    } catch (e) { console.error(`  ❌ PDF error: ${e.message}`); continue }

    if (!pdfText.trim()) {
      console.log(`  ⚠️  No text extracted (scanned PDF?) — using form metadata only`)
    }

    // 2. Generate summary
    console.log(`  🤖 Generating summary...`)
    let summary = ''
    try {
      summary = await generateSummary(pdfText, form, apiKey)
      console.log(`  ✅ "${summary.slice(0, 100)}…"`)
    } catch (e) { console.error(`  ❌ GPT error: ${e.message}`); continue }

    // 3. TTS audio
    console.log(`  🔊 Generating audio...`)
    let mp3
    try {
      mp3 = await generateAudio(summary, apiKey)
      console.log(`  ✅ ${mp3.length} bytes`)
    } catch (e) { console.error(`  ❌ TTS error: ${e.message}`); continue }

    // 4. Upload to Explainers bucket
    const fileName = `${form.form_id.replace(/[^a-zA-Z0-9]/g, '_')}_explainer.mp3`
    const { error: upErr } = await sb.storage.from('Explainers').upload(fileName, mp3, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) { console.error(`  ❌ Upload error: ${upErr.message}`); continue }
    const { data: { publicUrl } } = sb.storage.from('Explainers').getPublicUrl(fileName)
    console.log(`  ☁️  ${publicUrl}`)

    // 5. Save to DB
    const { error: dbErr } = await sb.from('forms').update({
      summary,
      explainer_url: publicUrl,
      mod_by: 'system-batch',
      mod_dt: new Date().toISOString(),
    }).eq('id', form.id)

    if (dbErr) console.error(`  ❌ DB error: ${dbErr.message}`)
    else console.log(`  💾 Saved ✓\n`)
  }

  console.log('🎉  All done!')
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
