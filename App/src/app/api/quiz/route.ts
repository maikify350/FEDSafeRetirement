import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const maxDuration = 60 // seconds — needed for embed → vector search → GPT chain

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY! })

const QUIZ_TOPICS = [
  'FEGLI Basic Life Insurance coverage and calculations',
  'FEGLI Option A, B, and C details and age reductions',
  'FEGLI coverage in retirement and cancellation rules',
  'FERS retirement eligibility and annuity calculation',
  'CSRS retirement system rules and annuity',
  'Federal Open Season rules and enrollment changes',
  'FERS survivor benefit options and elections',
  'FEHB health insurance in retirement',
  'Thrift Savings Plan (TSP) and federal retirement',
  'FERS Special Retirement Supplement',
  'Minimum Retirement Age (MRA) under FERS',
  'FEGLI premiums for annuitants',
]

export interface QuizQuestion {
  id: number
  question: string
  choices: string[]          // exactly 4 choices
  correctIndex: number       // 0-3
  explanation: string        // why the answer is correct
  topic: string
}

export async function POST(req: NextRequest) {
  try {
    const { topic: requestedTopic } = await req.json().catch(() => ({}))

    // Pick a random topic if none supplied
    const topic = requestedTopic
      ?? QUIZ_TOPICS[Math.floor(Math.random() * QUIZ_TOPICS.length)]

    // 1. Embed the topic to retrieve relevant chunks
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: topic,
    })
    const queryEmbedding = embRes.data[0].embedding

    // 2. Retrieve top-8 chunks for richer context
    const { data: chunks } = await supabase.rpc('match_rag_documents', {
      query_embedding: queryEmbedding,
      match_count: 8,
      match_threshold: 0.35,
    })

    const context = chunks && chunks.length > 0
      ? chunks.map((c: { source: string; content: string }) =>
          `[${c.source}]\n${c.content}`).join('\n\n---\n\n')
      : 'Use general federal retirement knowledge.'

    // 3. Ask GPT to generate 5 quiz questions as strict JSON
    const systemPrompt = `You are a federal retirement training expert creating quiz questions for FEDSafe Retirement consulting staff.
Generate exactly 5 multiple-choice questions about: "${topic}"

Use the provided document context to ground your questions in authoritative facts.

You MUST respond with ONLY a valid JSON array — no markdown fences, no extra text.
Each element must have this exact shape:
{
  "question": "string",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctIndex": 0,
  "explanation": "string (1-2 sentences explaining why this is correct)"
}

Rules:
- correctIndex is 0-3 (index into choices array)
- All 4 choices must be plausible — avoid obviously wrong answers
- Questions should test real knowledge, not trivial facts
- Vary difficulty (2 easy, 2 medium, 1 hard)
- Base questions on the context provided`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `DOCUMENT CONTEXT:\n${context}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    let raw = completion.choices[0].message.content ?? '[]'

    // GPT may wrap in an object — unwrap if needed
    let questions: QuizQuestion[]
    try {
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? parsed.quiz ?? Object.values(parsed)[0])
      questions = (arr as QuizQuestion[]).slice(0, 5).map((q, i) => ({
        ...q,
        id: i,
        topic,
      }))
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz questions' }, { status: 500 })
    }

    return NextResponse.json({ topic, questions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[quiz] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  // Return available topics for the topic picker
  return NextResponse.json({ topics: QUIZ_TOPICS })
}
