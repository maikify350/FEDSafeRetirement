// ingest-web-pages.mjs
// Fetches OPM web pages, extracts clean text, chunks, embeds, and upserts into rag_documents

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const OPENAI_KEY = process.env.OPENAI_API_KEY || ''
const CHUNK_SIZE = 800   // characters per chunk
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 50    // supabase insert batch

const URLS = [
  'https://www.opm.gov/retirement-center/apply/quick-guide/',
  'https://retire.opm.gov/help',
  'https://www.opm.gov/retirement-center/federal-employees/',
  'https://www.opm.gov/retirement-center/publications-forms/benefits-administration-letters/',
  'https://www.opm.gov/healthcare-insurance/pshb/',
  'https://www.opm.gov/retirement-center/fers-information/',
  'https://www.opm.gov/healthcare-insurance/healthcare/',
  'https://www.opm.gov/healthcare-insurance/life-insurance/',
  'https://www.opm.gov/retirement-center/survivor-benefits/',
  'https://www.opm.gov/retirement-center/my-annuity-and-benefits/life-events/#url=Designating-Beneficiary',
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── HTML → plain text ────────────────────────────────────────────────────────
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Split into overlapping chunks ────────────────────────────────────────────
function chunkText(text, source) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    const content = text.slice(start, end).trim()
    if (content.length > 100) chunks.push({ source, content })
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

// ── Embed a batch of texts ────────────────────────────────────────────────────
async function embedBatch(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  })
  const data = await res.json()
  if (!data.data) throw new Error('Embedding failed: ' + JSON.stringify(data))
  return data.data.map(d => d.embedding)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  let totalChunks = 0

  for (const url of URLS) {
    const sourceName = url.replace('https://', '').replace(/\/$/, '').replace(/#.*$/, '')
    process.stdout.write(`\nFetching: ${url} ... `)

    let html
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FEDSafe-Indexer/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      html = await res.text()
    } catch (e) {
      console.log(`❌ Fetch failed: ${e.message}`)
      continue
    }

    const text = htmlToText(html)
    if (text.length < 200) { console.log('❌ Too little content, skipping'); continue }

    const chunks = chunkText(text, sourceName)
    console.log(`${chunks.length} chunks (${text.length} chars)`)

    // Delete old chunks for this source first
    await supabase.from('rag_documents').delete().eq('source', sourceName)

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await embedBatch(batch.map(c => c.content))
      const rows = batch.map((c, j) => ({
        source: c.source,
        content: c.content,
        embedding: embeddings[j],
        chunk_index: i + j,
      }))
      const { error } = await supabase.from('rag_documents').insert(rows)
      if (error) console.error('  Insert error:', error.message)
      else process.stdout.write(`  ✅ Inserted batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(chunks.length/BATCH_SIZE)}\n`)
    }

    totalChunks += chunks.length
    // Be polite to OPM servers
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\n🎉 Done! Added ${totalChunks} new chunks across ${URLS.length} OPM pages.`)

  // Print new totals
  const { count } = await supabase.from('rag_documents').select('*', { count: 'exact', head: true })
  console.log(`📊 Total rag_documents now: ${count}`)
}

run().catch(console.error)
