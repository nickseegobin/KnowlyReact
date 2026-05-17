/**
 * Tests for GET /api/analytics/history/quests/[session_id]
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

import { GET } from '@/app/api/analytics/history/quests/[session_id]/route'
import { WPApiError } from '@/lib/wp-api'

function makeParams(session_id: string) {
  return { params: Promise.resolve({ session_id }) }
}

const QUEST_DETAIL = {
  session: {
    session_id: 'uuid-abc',
    quest_id:   'q-math-001',
    source:     'direct',
    task_id:    null,
    state:      'completed',
    started_at:   '2026-05-09 09:55:00',
    completed_at: '2026-05-09 10:10:00',
  },
  summary: { correct: 4, total: 5, percentage: 80.0 },
  questions: [
    { question_id: 'q1', selected_answer: 'A', is_correct: true,  answered_at: '2026-05-09 09:57:00' },
    { question_id: 'q2', selected_answer: 'B', is_correct: true,  answered_at: '2026-05-09 09:59:00' },
    { question_id: 'q3', selected_answer: 'C', is_correct: false, answered_at: '2026-05-09 10:01:00' },
    { question_id: 'q4', selected_answer: 'A', is_correct: true,  answered_at: '2026-05-09 10:03:00' },
    { question_id: 'q5', selected_answer: 'D', is_correct: true,  answered_at: '2026-05-09 10:05:00' },
  ],
}

describe('GET /api/analytics/history/quests/[session_id]', () => {
  it('returns 401 when no token is present', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost'), makeParams('uuid-abc'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.message).toBe('Unauthenticated')
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns quest session detail including questions', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(QUEST_DETAIL)

    const res = await GET(new Request('http://localhost'), makeParams('uuid-abc'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session.quest_id).toBe('q-math-001')
    expect(body.summary.correct).toBe(4)
    expect(body.summary.percentage).toBe(80.0)
    expect(body.questions).toHaveLength(5)
  })

  it('calls WP with the correct session_id in the path', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockResolvedValue(QUEST_DETAIL)

    await GET(new Request('http://localhost'), makeParams('uuid-abc'))

    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/analytics/history/quests/uuid-abc')
  })

  it('returns 404 when the session does not belong to the child', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Quest session not found.', 404))

    const res = await GET(new Request('http://localhost'), makeParams('no-such-session'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.message).toBe('Quest session not found.')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt-token')
    mockWpFetch.mockRejectedValue(new Error('timeout'))

    const res = await GET(new Request('http://localhost'), makeParams('uuid-abc'))
    expect(res.status).toBe(500)
  })
})
