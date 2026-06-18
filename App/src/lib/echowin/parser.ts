/**
 * Uses Claude to extract structured registration data from an echowin call transcript.
 *
 * Webhook payloads label transcript entries with sender: "agent" | "caller"
 * so we can focus Claude on caller speech only for accurate extraction.
 */

import OpenAI from 'openai'
import type { EchoCall } from './client'

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)!,
})

export interface ParsedRegistration {
  firstName:               string | null
  lastName:                string | null
  email:                   string | null
  phone:                   string | null
  address:                 string | null
  city:                    string | null
  state:                   string | null
  zip:                     string | null
  estimatedRetirementYear: string | null
  conferenceLocation:      'Lexington, Kentucky' | 'Greenville, South Carolina' | null
  guestName:               string | null
  guestIsFedEmployee:      boolean | null
  rawSummary:              string | null
  confidence:              'high' | 'medium' | 'low'
  notes:                   string | null
}

export async function parseCallTranscript(call: EchoCall): Promise<ParsedRegistration> {
  if (!call.transcript || call.transcript.length === 0) {
    return emptyResult(call.summary)
  }

  // echowin's API labels every entry speaker:"agent" — even the caller's responses.
  // We detect the alternating Q/A pattern: the agent always asks questions (ends with ?)
  // and short non-question lines following a question are the caller's answer.
  const lines = call.transcript.filter(t => t.text?.trim())

  // If any entry is genuinely labeled "caller", use that; otherwise infer from pattern
  const hasCaller = lines.some(t => t.speaker === 'caller')

  const dialogue = lines
    .map((t, i) => {
      let who: string
      if (hasCaller) {
        who = t.speaker === 'caller' ? 'CALLER' : 'AGENT'
      } else {
        // Infer: agent lines tend to end with ? or are longer instructional text.
        // Caller responses tend to be short and follow an agent question.
        const prev = lines[i - 1]
        const prevIsQuestion = prev?.text?.trim().endsWith('?') || prev?.text?.trim().endsWith('...')
        const isShort = t.text.trim().length < 80
        const isQuestion = t.text.trim().endsWith('?')
        who = (!isQuestion && isShort && prevIsQuestion) ? 'CALLER' : 'AGENT'
      }
      return `${who}: ${t.text.trim()}`
    })
    .join('\n')

  const prompt = `You are extracting registration data from a Federal Retirement Seminar phone call.

The call was handled by an AI agent named Mary/Lisa collecting seminar registrations.
Two seminar locations on Sunday June 14th, both 2–3:30 PM:
  • Lexington, Kentucky  — Holiday Inn Express, 1780 Sharley Way, Lexington KY 40511
  • Greenville, South Carolina — Embassy Suites, 670 Verae Blvd, Greenville SC 29607

Transcript:
${dialogue}

${call.summary ? `\nCall summary: ${call.summary}` : ''}

Extract and return ONLY a valid JSON object with these exact keys (null if not found):
{
  "firstName": string | null,
  "lastName": string | null,
  "email": string | null,
  "phone": string | null,
  "address": string | null,
  "city": string | null,
  "state": string | null,
  "zip": string | null,
  "estimatedRetirementYear": string | null,
  "conferenceLocation": "Lexington, Kentucky" | "Greenville, South Carolina" | null,
  "guestName": string | null,
  "guestIsFedEmployee": boolean | null,
  "notes": string | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- email: lowercase, reconstruct from phonetic spelling (e.g. "r g a r c i a 3 5 0 at aol dot com" → "rgarcia350@aol.com")
- phone: use caller's stated phone number if given, otherwise null
- conferenceLocation: MUST be exactly "Lexington, Kentucky" or "Greenville, South Carolina" — match any mention of Lexington/KY or Greenville/SC
- confidence: "high" = name + phone/email + conference all captured; "medium" = partial; "low" = mostly missing
- notes: any extra info (federal agency, years of service, specific questions asked)
- Return ONLY the JSON object, no explanation`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message?.content?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return emptyResult(call.summary)

    const parsed = JSON.parse(jsonMatch[0]) as ParsedRegistration
    parsed.rawSummary = call.summary
    return parsed
  } catch (err) {
    console.error('[echowin/parser] OpenAI failed:', err)
    return emptyResult(call.summary)
  }
}

function emptyResult(summary: string | null): ParsedRegistration {
  return {
    firstName: null, lastName: null, email: null, phone: null,
    address: null, city: null, state: null, zip: null,
    estimatedRetirementYear: null, conferenceLocation: null,
    guestName: null, guestIsFedEmployee: null,
    rawSummary: summary, confidence: 'low', notes: null,
  }
}
