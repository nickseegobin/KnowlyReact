import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookie } from '@/lib/cookies'

const BASE = process.env.WP_API_BASE

/**
 * Debug route — GET /api/debug/quests?level=std_4&period=term_1&subject=math
 * Returns raw WP response so we can diagnose the quests fetching issue.
 * Remove this file once the issue is resolved.
 */
export async function GET(req: NextRequest) {
  const token = await getTokenFromCookie()
  if (!token) return NextResponse.json({ error: 'No auth token in cookie' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const level   = searchParams.get('level')   ?? 'std_4'
  const period  = searchParams.get('period')  ?? 'term_1'
  const subject = searchParams.get('subject') ?? 'math'

  const qs = new URLSearchParams({ subject, level, period })
  const wpUrl = `${BASE}/quests?${qs}`

  let wpRaw: unknown = null
  let wpStatus = 0
  let wpError: string | null = null

  try {
    const res = await fetch(wpUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    wpStatus = res.status
    wpRaw = await res.json()
  } catch (err) {
    wpError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({
    wpUrl,
    wpStatus,
    wpError,
    wpRaw,
    hasToken: !!token,
    tokenPreview: token ? token.slice(0, 20) + '…' : null,
  })
}
