import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const maxDuration = 60 // seconds — needed for embed → vector search → GPT stream chain

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
})

const SYSTEM_PROMPT = `You are FEDSafe AI, an expert Federal Retirement Planning Assistant for FEDSafe Retirement.
You specialize in FEGLI (Federal Employees' Group Life Insurance), FERS, CSRS, OPM regulations, survivor benefits, 
and all aspects of federal employee retirement planning.

Answer questions accurately and clearly based on the provided context from authoritative OPM documents.
If the context doesn't cover the question, say so honestly and suggest the user consult OPM.gov or a FEDSafe advisor.
Always be professional, clear, and helpful. Format answers with bullet points or numbered lists when appropriate.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const userMessage = messages[messages.length - 1]?.content as string
    if (!userMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    // 1. Embed the user query
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMessage,
    })
    const queryEmbedding = embeddingRes.data[0].embedding

    // 2. Retrieve top-5 relevant chunks from Supabase
    const { data: chunks, error: matchError } = await supabase.rpc('match_rag_documents', {
      query_embedding: queryEmbedding,
      match_count: 5,
      match_threshold: 0.4,
    })

    if (matchError) {
      console.error('RAG match error:', matchError)
    }

    // 3. Build context block from retrieved chunks
    const context = chunks && chunks.length > 0
      ? chunks
          .map((c: { source: string; content: string; similarity: number }) =>
            `[Source: ${c.source}]\n${c.content}`
          )
          .join('\n\n---\n\n')
      : 'No specific document context found. Answer based on general federal retirement knowledge.'

    // 4. Build the full message array for GPT-4o-mini
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `CONTEXT FROM AUTHORITATIVE DOCUMENTS:\n\n${context}`,
      },
      ...messages.slice(0, -1),  // prior conversation history
      { role: 'user', content: userMessage },
    ]

    // 5. Stream the response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    })

    // 6. Return a ReadableStream for real-time SSE streaming
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: unknown) {
    console.error('[chat/rag] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
