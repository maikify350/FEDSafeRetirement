/**
 * FEGLI RAG Ingestion Script
 * 
 * Reads all PDFs from ../Resources, chunks them, embeds with OpenAI,
 * and upserts into Supabase rag_documents table.
 *
 * Run:  node ingest.mjs
 * Prereqs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_OPENAI_API_KEY in App/.env
 */

import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

// pdf-parse uses CJS internally — use createRequire to load it safely
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../App/.env') })

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY       = process.env.NEXT_PUBLIC_OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars. Check App/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

const RESOURCES_DIR  = path.join(__dirname, 'Resources')
const CHUNK_SIZE     = 800   // characters per chunk
const CHUNK_OVERLAP  = 150   // overlap to preserve context at boundaries
const EMBED_BATCH    = 20    // embed this many chunks at once

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    chunks.push(text.slice(start, end).trim())
    start += size - overlap
  }
  return chunks.filter(c => c.length > 50) // drop tiny trailing fragments
}

async function embedBatch(texts) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return res.data.map(d => d.embedding)
}

async function upsertChunks(source, chunks) {
  const rows = []
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH)
    const embeddings = await embedBatch(batch)
    batch.forEach((content, j) => {
      rows.push({
        source,
        chunk_index: i + j,
        content,
        embedding: embeddings[j],
        metadata: { source_type: 'pdf' },
      })
    })
    process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length} chunks\r`)
  }

  // Delete existing chunks for this source before re-inserting
  await supabase.from('rag_documents').delete().eq('source', source)

  // Insert in batches of 50 to avoid Supabase statement timeouts
  const INSERT_BATCH = 50
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH)
    const { error } = await supabase.from('rag_documents').insert(batch)
    if (error) throw error
    process.stdout.write(`  inserted ${Math.min(i + INSERT_BATCH, rows.length)}/${rows.length} rows\r`)
  }
  console.log(`  ✅ Upserted ${rows.length} chunks for "${source}"`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const files = fs.readdirSync(RESOURCES_DIR).filter(f => f.endsWith('.pdf'))
console.log(`\nFound ${files.length} PDFs in Resources/\n`)

for (const file of files) {
  const filePath = path.join(RESOURCES_DIR, file)
  console.log(`📄 Processing: ${file}`)
  try {
    const buffer = fs.readFileSync(filePath)
    const parsed = await pdfParse(buffer)
    const chunks = chunkText(parsed.text)
    console.log(`   ${chunks.length} chunks from ${parsed.numpages} pages`)
    await upsertChunks(file, chunks)
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`)
  }
}

console.log('\n✅ Ingestion complete.')
