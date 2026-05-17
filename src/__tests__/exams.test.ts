/**
 * Tests for exam (trial) proxy routes:
 *   GET    /api/exams            (catalogue — level/period filtered)
 *   GET    /api/exams/active
 *   POST   /api/exams/start
 *   POST   /api/exams/[session_id]/resume
 *   POST   /api/exams/[session_id]/checkpoint
 *   POST   /api/exams/[session_id]/submit
 *   POST   /api/exams/[session_id]/cancel
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
      this.code = code
      this.status = status
    }
  },
}))

jest.mock('@/lib/cookies', () => ({
  getTokenFromCookie: () => mockGetToken(),
}))

import { GET as getCatalogue }  from '@/app/api/exams/route'
import { GET as getActive }    from '@/app/api/exams/active/route'
import { POST as startExam }   from '@/app/api/exams/start/route'
import { POST as resumeExam }  from '@/app/api/exams/[session_id]/resume/route'
import { POST as checkpoint }  from '@/app/api/exams/[session_id]/checkpoint/route'
import { POST as submitExam }  from '@/app/api/exams/[session_id]/submit/route'
import { POST as cancelExam }  from '@/app/api/exams/[session_id]/cancel/route'
import { WPApiError }          from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  user_id: 42,
  role: 'parent',
  active_child_id: 7,
  children: [
    { child_id: 7, display_name: 'Alex', level: 'std_4', period: 'term_1', age: 9, avatar_index: 2 },
  ],
}

const EXAM_PACKAGE = {
  session_id: 123,
  external_session_id: 'uuid-ext',
  balance_after: 4,
  package: {
    package_id: 'pkg-uuid',
    meta: { level: 'std_4', period: 'term_1', subject: 'Mathematics', difficulty: 'medium', topics_covered: [] },
    questions: [{ question_id: 'q1', question: 'What is 2+2?', options: { A: '3', B: '4', C: '5', D: '6' } }],
  },
}

const SUBMIT_RESULT = {
  score: 18, total: 20, percentage: 90.0,
  topic_breakdown: [{ topic: 'Arithmetic', correct: 18, total: 20 }],
  leaderboard_update: { rank: 3, points: 90 },
}

function makePost(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function sessionParams(session_id: string) {
  return { params: Promise.resolve({ session_id }) }
}

// ── GET /api/exams/active ─────────────────────────────────────────────────────

describe('GET /api/exams/active', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getActive()
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns null session when no active exam', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ session: null })
    const res = await getActive()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.session).toBeNull()
  })

  it('returns active session when one exists', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ session: { session_id: 123, subject: 'math' } })
    const res = await getActive()
    const body = await res.json()
    expect(body.session.session_id).toBe(123)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getActive()
    expect(res.status).toBe(500)
  })
})

// ── POST /api/exams/start ─────────────────────────────────────────────────────

describe('POST /api/exams/start', () => {
  const START_BODY = { subject: 'Mathematics', difficulty: 'medium' }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await startExam(makePost('/api/exams/start', START_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 422 when no active child profile on account', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ ...MOCK_USER, children: [], active_child_id: null })
    const res = await startExam(makePost('/api/exams/start', START_BODY))
    expect(res.status).toBe(422)
  })

  it('enriches body with level and period from active child before calling WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch
      .mockResolvedValueOnce(MOCK_USER)
      .mockResolvedValueOnce(EXAM_PACKAGE)

    await startExam(makePost('/api/exams/start', START_BODY))

    const [, , enrichedBody] = mockWpFetch.mock.calls[1]
    expect(enrichedBody.level).toBe('std_4')
    expect(enrichedBody.period).toBe('term_1')
    expect(enrichedBody.subject).toBe('Mathematics')
  })

  it('returns 201 with exam package on success', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch
      .mockResolvedValueOnce(MOCK_USER)
      .mockResolvedValueOnce(EXAM_PACKAGE)

    const res = await startExam(makePost('/api/exams/start', START_BODY))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.session_id).toBe(123)
    expect(body.package.questions).toHaveLength(1)
  })

  it('returns 402 when no exam tokens', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch
      .mockResolvedValueOnce(MOCK_USER)
      .mockRejectedValueOnce(new WPApiError('noey_insufficient_tokens', 'No tokens.', 402))

    const res = await startExam(makePost('/api/exams/start', START_BODY))
    expect(res.status).toBe(402)
  })

  it('falls back to first child when active_child_id is null', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch
      .mockResolvedValueOnce({ ...MOCK_USER, active_child_id: null })
      .mockResolvedValueOnce(EXAM_PACKAGE)

    const res = await startExam(makePost('/api/exams/start', START_BODY))
    expect(res.status).toBe(201)
  })
})

// ── POST /api/exams/[session_id]/resume ───────────────────────────────────────

describe('POST /api/exams/[session_id]/resume', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await resumeExam(makePost('/api/exams/123/resume'), sessionParams('123'))
    expect(res.status).toBe(401)
  })

  it('calls WP at /exams/{session_id}/resume', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ session_id: 123, remaining_questions: [] })
    await resumeExam(makePost('/api/exams/123/resume'), sessionParams('123'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/exams/123/resume')
  })

  it('returns resumed session data', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ session_id: 99, remaining_questions: [{ question_id: 'q2' }] })
    const res = await resumeExam(makePost('/api/exams/99/resume'), sessionParams('99'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.session_id).toBe(99)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await resumeExam(makePost('/api/exams/123/resume'), sessionParams('123'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/exams/[session_id]/checkpoint ───────────────────────────────────

describe('POST /api/exams/[session_id]/checkpoint', () => {
  const CHECKPOINT_BODY = { state: { currentIdx: 5, answers: { q1: 'A' }, timings: [] } }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await checkpoint(makePost('/api/exams/123/checkpoint', CHECKPOINT_BODY), sessionParams('123'))
    expect(res.status).toBe(401)
  })

  it('saves checkpoint and returns saved state', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ saved: true })
    const res = await checkpoint(makePost('/api/exams/123/checkpoint', CHECKPOINT_BODY), sessionParams('123'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.saved).toBe(true)
  })

  it('calls WP with session_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ saved: true })
    await checkpoint(makePost('/api/exams/55/checkpoint', CHECKPOINT_BODY), sessionParams('55'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/exams/55/checkpoint')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await checkpoint(makePost('/api/exams/123/checkpoint', CHECKPOINT_BODY), sessionParams('123'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/exams/[session_id]/submit ───────────────────────────────────────

describe('POST /api/exams/[session_id]/submit', () => {
  const ANSWERS_BODY = {
    answers: [
      { question_id: 'q1', selected_answer: 'A', correct_answer: 'A', is_correct: true },
      { question_id: 'q2', selected_answer: 'B', correct_answer: 'C', is_correct: false },
    ],
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await submitExam(makePost('/api/exams/123/submit', ANSWERS_BODY), sessionParams('123'))
    expect(res.status).toBe(401)
  })

  it('returns score and leaderboard update', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESULT)
    const res = await submitExam(makePost('/api/exams/123/submit', ANSWERS_BODY), sessionParams('123'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.score).toBe(18)
    expect(body.percentage).toBe(90.0)
    expect(body.leaderboard_update.rank).toBe(3)
  })

  it('calls WP at /exams/{session_id}/submit', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESULT)
    await submitExam(makePost('/api/exams/77/submit', ANSWERS_BODY), sessionParams('77'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/exams/77/submit')
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_missing_fields', 'Answers required.', 422))
    const res = await submitExam(makePost('/api/exams/123/submit', {}), sessionParams('123'))
    expect(res.status).toBe(422)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await submitExam(makePost('/api/exams/123/submit', ANSWERS_BODY), sessionParams('123'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/exams/[session_id]/cancel ───────────────────────────────────────

describe('POST /api/exams/[session_id]/cancel', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await cancelExam(makePost('/api/exams/123/cancel'), sessionParams('123'))
    expect(res.status).toBe(401)
  })

  it('calls WP DELETE /exams/{session_id}', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ cancelled: true })
    await cancelExam(makePost('/api/exams/42/cancel'), sessionParams('42'))
    const [path, method] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/exams/42')
    expect(method).toBe('DELETE')
  })

  it('returns cancelled confirmation', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ cancelled: true })
    const res = await cancelExam(makePost('/api/exams/123/cancel'), sessionParams('123'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.cancelled).toBe(true)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await cancelExam(makePost('/api/exams/123/cancel'), sessionParams('123'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/exams (catalogue) ────────────────────────────────────────────────

const MOCK_CATALOGUE = {
  catalogue: [
    { subject: 'Mathematics',           difficulty: 'easy',   pool_count: 12 },
    { subject: 'Mathematics',           difficulty: 'medium', pool_count: 8  },
    { subject: 'English Language Arts', difficulty: 'easy',   pool_count: 5  },
    { subject: 'Social Studies',        difficulty: 'easy',   pool_count: 0  },
  ],
}

function makeGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

describe('GET /api/exams (catalogue)', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getCatalogue(makeGet('/api/exams'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('forwards level param to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(MOCK_CATALOGUE)
    await getCatalogue(makeGet('/api/exams?level=std_4'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('level=std_4')
  })

  it('forwards period param to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(MOCK_CATALOGUE)
    await getCatalogue(makeGet('/api/exams?level=std_4&period=term_1'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('period=term_1')
  })

  it('forwards no params when none provided', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(MOCK_CATALOGUE)
    await getCatalogue(makeGet('/api/exams'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/exams')
  })

  it('returns catalogue payload from WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(MOCK_CATALOGUE)
    const res = await getCatalogue(makeGet('/api/exams?level=std_4&period=term_1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.catalogue).toHaveLength(4)
    expect(body.catalogue[0].subject).toBe('Mathematics')
    expect(body.catalogue[0].pool_count).toBe(12)
  })

  it('returns 401 with WPApiError status 401', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('unauthorized', 'Token invalid', 401))
    const res = await getCatalogue(makeGet('/api/exams'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Token invalid')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('network failure'))
    const res = await getCatalogue(makeGet('/api/exams'))
    expect(res.status).toBe(500)
  })
})
