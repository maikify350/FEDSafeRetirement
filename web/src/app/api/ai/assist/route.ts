import { NextRequest, NextResponse } from 'next/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const MODEL       = 'grok-beta'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant not configured (XAI_API_KEY missing)' }, { status: 503 })
  }

  const { action, context, prompt, appliesTo } = await req.json()

  // Build a system prompt appropriate for a field-service template editor
  const systemPrompt = `You are a professional business writing assistant integrated into a field-service management application called JobMaster.
You help users write and improve document templates (letters, emails, quotes, invoices, etc.).
Templates use [[token]] placeholders like [[customer_name]], [[job_date]], [[company_name]] etc.
IMPORTANT: Always preserve any [[token]] placeholders exactly as-is — never modify, remove, or paraphrase them.
Write in clear, professional, business English unless asked otherwise.
Return only the document content — no explanations, no markdown code fences, no commentary.
The template applies to: ${appliesTo ?? 'general'}.`

  let userMessage = ''
  switch (action) {
    case 'write':
      userMessage = `Write a professional document template based on this description:\n${prompt}\n\nInclude relevant [[token]] placeholders where appropriate.`
      break
    case 'improve':
      userMessage = `Improve the following text — make it more professional, clear, and concise while preserving all [[token]] placeholders:\n\n${context}`
      break
    case 'shorten':
      userMessage = `Make the following text shorter and more concise while preserving all [[token]] placeholders:\n\n${context}`
      break
    case 'expand':
      userMessage = `Expand and enrich the following text with more professional detail while preserving all [[token]] placeholders:\n\n${context}`
      break
    case 'formal':
      userMessage = `Rewrite the following text in a more formal, professional tone while preserving all [[token]] placeholders:\n\n${context}`
      break
    case 'friendly':
      userMessage = `Rewrite the following text in a warmer, friendlier tone while preserving all [[token]] placeholders:\n\n${context}`
      break
    case 'custom':
      userMessage = `${prompt}\n\nDocument content:\n${context}`
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI assist] xAI error:', err)
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[AI assist] fetch error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
  }
}
