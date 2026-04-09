/**
 * Server-side client for the Knowly Railway API.
 * Only used in Next.js API routes — never exposed to the client.
 */

const BASE = process.env.RAILWAY_API_BASE

export async function generateNickname(): Promise<string> {
  if (!BASE) throw new Error('RAILWAY_API_BASE env var is not set')

  const res = await fetch(`${BASE}/api/v1/leaderboard/generate-nickname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Nickname generation failed')

  const json = await res.json()
  // Railway returns { nickname: string } or { data: { nickname: string } }
  return json?.data?.nickname ?? json?.nickname ?? json
}
