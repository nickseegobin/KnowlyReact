/**
 * Tests for GET /api/analytics/history/lessons/[session_id]
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

import { GET } from '@/app/api/analytics/history/lessons/[session_id]/route'
import { WPApiError } from '@/lib/wp-api'

function makeParams(session_id: string) {
  return { params: Promise.resolve({ session_id }) }
}

const LESSON_DETAIL = {
  session: {
    session_id:   'uuid-xyz',
    quest_id:     'l-numbers-001',
    source:       'assignment',
    state:        'completed',
    started_at:   '2026-05-08 08:50:00',
    completed_at: '2026-05-08 09:10:00',
  },
  summary: { correct: 3, total: 4, percentage: 75.0 },
  questions: [
    { question_id: 'lq1', selected_answer: 'A', is_correct: true,  answered_at: '2026-05-08 08:55:00' },
    { question_id: 'lq2', selected_answer: 'B', is_correct: false, answered_at: '2026-05-08 09:00:00' },
    { question_id: 'lq3', selected_answer: 'C', is_correct: true,  answered_at: '2026-05-08 09:05:00' },
    { question_id: 'lq4', selected_answer: 'A', is_correct: true,  answered_at: '2026-05-08 09:08:00' },
  ],
}

describe('GET /api/analytics/history/lessons/[session_id]', () => {
  it('returns 401 when no token is present', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost'), makeParams('uuid-xyz'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.message).toBe('Unauthenticated')
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns lesson session detail including questions', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(LESSON_DETAIL)

    const res = await GET(new Request('http://localhost'), makeParams('uuid-xyz'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session.quest_id).toBe('l-numbers-001')
    expect(body.session.source).toBe('assignment')
    expect(body.summary.correct).toBe(3)
    expect(body.summary.percentage).toBe(75.0)
    expect(body.questions).toHaveLength(4)
  })

  it('calls WP with the correct session_id in the path', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(LESSON_DETAIL)

    await GET(new Request('http://localhost'), makeParams('uuid-xyz'))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/analytics/history/lessons/uuid-xyz')
  })

  it('returns null percentage when no questions were answered', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue({
      ...LESSON_DETAIL,
      summary: { correct: 0, total: 0, percentage: null },
      questions: [],
    })

    const res = await GET(new Request('http://localhost'), makeParams('uuid-xyz'))
    const body = await res.json()

    expect(body.summary.percentage).toBeNull()
    expect(body.questions).toHaveLength(0)
  })

  it('returns 404 when the session is not found', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Lesson session not found.', 404))

    const res = await GET(new Request('http://localhost'), makeParams('no-such-session'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.message).toBe('Lesson session not found.')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new Error('timeout'))

    const res = await GET(new Request('http://localhost'), makeParams('uuid-xyz'))
    expect(res.status).toBe(500)
  })
})
