import type { NextRequest } from 'next/server'

type TurnstilePayload = Record<string, unknown>

type TurnstileResult = {
  ok: boolean
  error?: string
  details?: unknown
}

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

function asString(value: unknown, max = 2048): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, max)
}

function realTurnstileSecret(): string | null {
  return (
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    process.env.CF_TURNSTILE_SECRET_KEY ||
    null
  )
}

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}

export async function verifyTurnstile(
  body: TurnstilePayload,
  request: NextRequest,
): Promise<TurnstileResult> {
  const secret = realTurnstileSecret()

  // No Turnstile secret configured — skip verification and pass through.
  // TODO: add TURNSTILE_SECRET_KEY to Vercel env once a real widget is created.
  if (!secret) {
    return { ok: true, details: { skipped: 'no secret configured' } }
  }

  const token = asString(
    body.turnstileToken ||
      body.cfTurnstileResponse ||
      body['cf-turnstile-response'],
  )

  if (!token) {
    return { ok: false, error: 'Human verification is required. Please refresh the page and try again.' }
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: clientIp(request),
      }),
    })

    const result = await response.json().catch(() => null)

    if (response.ok && result?.success === true) {
      return { ok: true, details: result }
    }

    return {
      ok: false,
      error: 'Human verification failed. Please refresh the page and try again.',
      details: result,
    }
  } catch {
    return { ok: false, error: 'Human verification is temporarily unavailable. Please try again.' }
  }
}
