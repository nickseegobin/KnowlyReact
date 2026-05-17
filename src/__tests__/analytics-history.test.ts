/**
 * Tests for GET /api/analytics/history
 *
 * Covers: auth guard, query-param forwarding, WPApiError pass-through,
 * unexpected error fallback.
 */

import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockWpFetch = jest.fn()
const mockGetToken = jest.fn()

jest.mock('@/lib/wp-api', () => ({
  wpFetch: (...args: unknown[]) => mockWpFetch(...args),
  WPApiError: class WPApiError extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code   = code
      this.status = status
    }
  },
}))

jest.mock('@/lib/cookies', () => ({
  getTokenFromCookie: () => mockGetToken(),
}))

// Import after mocks are registered
import { GET } from '@/app/api/analytics/history/route'
import { WPApiError } from '@/lib/wp-api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(search: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/analytics/history')
  Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const HISTORY_PAYLOAD = {
  items: [
    { type: 'trial',  session_id: 1,         content_id: 'ext-1', subject: 'math', score: 18, total: 20, percentage: 90.0,  completed_at: '2026-05-10 14:00:00' },
    { type: 'quest',  session_id: 'uuid-abc', content_id: 'q-001', subject: null,   score: 4,  total: 5,  percentage: 80.0,  completed_at: '2026-05-09 10:00:00' },
    { type: 'lesson', session_id: 'uuid-xyz', content_id: 'l-001', subject: null,   score: 3,  total: 4,  percentage: 75.0,  completed_at: '2026-05-08 09:00:00' },
  ],
  total: 3,
  page: 1,
  per_page: 20,
  type: 'all',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/history', () => {
  it('returns 401 when no token is present', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.message).toBe('Unauthenticated')
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns the unified history payload from WP', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(HISTORY_PAYLOAD)

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toHaveLength(3)
    expect(body.items[0].type).toBe('trial')
    expect(body.items[1].type).toBe('quest')
    expect(body.items[2].type).toBe('lesson')
  })

  it('forwards type=trials filter to WP', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 20, type: 'trials' })

    await GET(makeRequest({ type: 'trials' }))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('type=trials')
  })

  it('forwards page and per_page to WP', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue({ items: [], total: 0, page: 2, per_page: 5, type: 'all' })

    await GET(makeRequest({ page: '2', per_page: '5' }))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('page=2')
    expect(path).toContain('per_page=5')
  })

  it('returns WPApiError status and message on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_forbidden', 'Forbidden', 403))

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.message).toBe('Forbidden')
    expect(body.code).toBe('knowly_forbidden')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new Error('Network failure'))

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})
