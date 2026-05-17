/**
 * Tests for the trial results proxy routes:
 *   GET /api/results
 *   GET /api/results/stats
 *   GET /api/results/[session_id]
 */

import { NextRequest } from 'next/server'

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

import { GET as getHistory }   from '@/app/api/results/route'
import { GET as getStats }     from '@/app/api/results/stats/route'
import { GET as getDetail }    from '@/app/api/results/[session_id]/route'
import { WPApiError }          from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSIONS_PAYLOAD = {
  sessions: [
    { session_id: 1, subject: 'math', score: 18, total: 20, percentage: 90.0, completed_at: '2026-05-10 14:00:00' },
    { session_id: 2, subject: 'english', score: 14, total: 20, percentage: 70.0, completed_at: '2026-05-08 11:00:00' },
  ],
  total: 2,
  page: 1,
  per_page: 20,
  total_pages: 1,
}

const STATS_PAYLOAD = {
  exams_completed:    12,
  average_pct:        78.5,
  total_time_seconds: 7200,
  strongest_topic:    'Fractions',
  weakest_topic:      'Algebra',
  topics: [],
}

const DETAIL_PAYLOAD = {
  session: { session_id: 1, subject: 'math', score: 18, total: 20, percentage: 90.0 },
  answers: [
    { question_id: 'q1', selected_answer: 'A', correct_answer: 'A', is_correct: 1, topic: 'Fractions' },
    { question_id: 'q2', selected_answer: 'B', correct_answer: 'C', is_correct: 0, topic: 'Algebra' },
  ],
  topic_breakdown: [
    { topic: 'Fractions', correct: 1, total: 1, pct: 100.0 },
    { topic: 'Algebra',   correct: 0, total: 1, pct: 0.0 },
  ],
}

// ── GET /api/results ──────────────────────────────────────────────────────────

describe('GET /api/results', () => {
  function makeRequest(search: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/results')
    Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, v))
    return new NextRequest(url)
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getHistory(makeRequest())
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns paginated trial session list', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(SESSIONS_PAYLOAD)

    const res = await getHistory(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sessions).toHaveLength(2)
    expect(body.sessions[0].subject).toBe('math')
  })

  it('forwards page, per_page and child_id params', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(SESSIONS_PAYLOAD)

    await getHistory(makeRequest({ page: '2', per_page: '10', child_id: '99' }))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('page=2')
    expect(path).toContain('per_page=10')
    expect(path).toContain('child_id=99')
  })

  it('returns WPApiError status on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_forbidden', 'Forbidden', 403))

    const res = await getHistory(makeRequest())
    expect(res.status).toBe(403)
  })
})

// ── GET /api/results/stats ────────────────────────────────────────────────────

describe('GET /api/results/stats', () => {
  function makeRequest(search: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/results/stats')
    Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, v))
    return new NextRequest(url)
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getStats(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns aggregate stats', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(STATS_PAYLOAD)

    const res = await getStats(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.exams_completed).toBe(12)
    expect(body.average_pct).toBe(78.5)
    expect(body.strongest_topic).toBe('Fractions')
  })

  it('forwards child_id param for parent view', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(STATS_PAYLOAD)

    await getStats(makeRequest({ child_id: '42' }))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('child_id=42')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new Error('DB timeout'))

    const res = await getStats(makeRequest())
    expect(res.status).toBe(500)
  })
})

// ── GET /api/results/[session_id] ─────────────────────────────────────────────

describe('GET /api/results/[session_id]', () => {
  function makeParams(session_id: string) {
    return { params: Promise.resolve({ session_id }) }
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getDetail(new Request('http://localhost'), makeParams('1'))
    expect(res.status).toBe(401)
  })

  it('returns full session detail with answers and topic breakdown', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(DETAIL_PAYLOAD)

    const res = await getDetail(new Request('http://localhost'), makeParams('1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session.score).toBe(18)
    expect(body.answers).toHaveLength(2)
    expect(body.topic_breakdown).toHaveLength(2)
  })

  it('calls WP with the correct session_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(DETAIL_PAYLOAD)

    await getDetail(new Request('http://localhost'), makeParams('42'))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/results/42')
  })

  it('returns 404 when session not found', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Session not found.', 404))

    const res = await getDetail(new Request('http://localhost'), makeParams('999'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.message).toBe('Session not found.')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new Error('crash'))

    const res = await getDetail(new Request('http://localhost'), makeParams('1'))
    expect(res.status).toBe(500)
  })
})
