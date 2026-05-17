/**
 * Tests for all lesson proxy routes:
 *   GET  /api/lessons
 *   GET  /api/lessons/[quest_id]
 *   GET  /api/lessons/[quest_id]/questions
 *   POST /api/lessons/start
 *   POST /api/lessons/submit-questions
 *   POST /api/lessons/complete
 *   GET  /api/lessons/teacher/catalogue
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

import { GET as getLessons }          from '@/app/api/lessons/route'
import { GET as getLesson }           from '@/app/api/lessons/[quest_id]/route'
import { GET as getLessonQuestions }  from '@/app/api/lessons/[quest_id]/questions/route'
import { POST as startLesson }        from '@/app/api/lessons/start/route'
import { POST as submitLessonQs }     from '@/app/api/lessons/submit-questions/route'
import { POST as completeLesson }     from '@/app/api/lessons/complete/route'
import { GET as teacherCatalogue }    from '@/app/api/lessons/teacher/catalogue/route'
import { WPApiError }                 from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LESSON_LIST = {
  lessons: [
    { quest_id: 'q-001', module_number: 1, module_title: 'Number Patterns', topic: 'Sequences', subject: 'math', status: 'approved' },
  ],
}

const LESSON_DETAIL = {
  quest_id: 'q-001', module_number: 1, module_title: 'Number Patterns',
  topic: 'Sequences', sections: [], worked_examples: [], knowledge_checks: [],
}

const LESSON_QUESTIONS = {
  questions: [
    { id: 'lq-1', sort_order: 1, difficulty: 'medium', question: 'Analyse the pattern', options: { A: '...', B: '...', C: '...', D: '...' } },
    { id: 'lq-2', sort_order: 2, difficulty: 'hard',   question: 'Apply to real context', options: { A: '...', B: '...', C: '...', D: '...' } },
    { id: 'lq-3', sort_order: 3, difficulty: 'hard',   question: 'Evaluate the claim', options: { A: '...', B: '...', C: '...', D: '...' } },
  ],
}

const START_RESPONSE    = { session_id: 'ls_xyz', is_first_attempt: true, gem_cost: 3, balance_after: 9 }
const SUBMIT_RESPONSE   = { recorded: true }
const COMPLETE_RESPONSE = { completed: true }

function makeGet(url: string, search: Record<string, string> = {}): NextRequest {
  const u = new URL(`http://localhost${url}`)
  Object.entries(search).forEach(([k, v]) => u.searchParams.set(k, v))
  return new NextRequest(u)
}

function makePost(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function questParams(quest_id: string) {
  return { params: Promise.resolve({ quest_id }) }
}

// ── GET /api/lessons ──────────────────────────────────────────────────────────

describe('GET /api/lessons', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getLessons(makeGet('/api/lessons'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns lesson catalogue', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_LIST)
    const res = await getLessons(makeGet('/api/lessons'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.lessons).toHaveLength(1)
    expect(body.lessons[0].quest_id).toBe('q-001')
  })

  it('forwards subject, level, period query params', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_LIST)
    await getLessons(makeGet('/api/lessons', { subject: 'math', level: 'std_4', period: 'term_1' }))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('subject=math')
    expect(path).toContain('level=std_4')
    expect(path).toContain('period=term_1')
  })

  it('calls WP at /lessons with no query when no params given', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_LIST)
    await getLessons(makeGet('/api/lessons'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/lessons')
  })

  it('returns WPApiError on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_token_invalid', 'Expired', 401))
    const res = await getLessons(makeGet('/api/lessons'))
    expect(res.status).toBe(401)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getLessons(makeGet('/api/lessons'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/lessons/[quest_id] ───────────────────────────────────────────────

describe('GET /api/lessons/[quest_id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getLesson(makeGet('/api/lessons/q-001'), questParams('q-001'))
    expect(res.status).toBe(401)
  })

  it('returns lesson content', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_DETAIL)
    const res = await getLesson(makeGet('/api/lessons/q-001'), questParams('q-001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.quest_id).toBe('q-001')
  })

  it('calls WP with the correct quest_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_DETAIL)
    await getLesson(makeGet('/api/lessons/q-special'), questParams('q-special'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/lessons/q-special')
  })

  it('returns 404 when lesson not found', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Not found.', 404))
    const res = await getLesson(makeGet('/api/lessons/bad'), questParams('bad'))
    expect(res.status).toBe(404)
  })
})

// ── GET /api/lessons/[quest_id]/questions ─────────────────────────────────────

describe('GET /api/lessons/[quest_id]/questions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getLessonQuestions(makeGet('/api/lessons/q-001/questions'), questParams('q-001'))
    expect(res.status).toBe(401)
  })

  it('returns 3 lesson MCQs', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_QUESTIONS)
    const res = await getLessonQuestions(makeGet('/api/lessons/q-001/questions'), questParams('q-001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.questions).toHaveLength(3)
  })

  it('calls WP with quest_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(LESSON_QUESTIONS)
    await getLessonQuestions(makeGet('/api/lessons/q-abc/questions'), questParams('q-abc'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/lessons/q-abc/questions')
  })

  it('returns 404 when no questions generated yet', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_no_questions', 'No questions available.', 404))
    const res = await getLessonQuestions(makeGet('/api/lessons/q-001/questions'), questParams('q-001'))
    expect(res.status).toBe(404)
  })
})

// ── POST /api/lessons/start ───────────────────────────────────────────────────

describe('POST /api/lessons/start', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await startLesson(makePost('/api/lessons/start', { quest_id: 'q-001', source: 'direct' }))
    expect(res.status).toBe(401)
  })

  it('returns session_id and gem cost', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(START_RESPONSE)
    const res = await startLesson(makePost('/api/lessons/start', { quest_id: 'q-001', source: 'direct' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.session_id).toBe('ls_xyz')
    expect(body.gem_cost).toBe(3)
  })

  it('forwards body to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(START_RESPONSE)
    await startLesson(makePost('/api/lessons/start', { quest_id: 'q-001', source: 'assignment' }))
    const [, , body] = mockWpFetch.mock.calls[0]
    expect(body).toEqual({ quest_id: 'q-001', source: 'assignment' })
  })

  it('returns 402 when gems are insufficient', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_insufficient_gems', 'Not enough gems.', 402))
    const res = await startLesson(makePost('/api/lessons/start', { quest_id: 'q-001', source: 'direct' }))
    expect(res.status).toBe(402)
  })
})

// ── POST /api/lessons/submit-questions ────────────────────────────────────────

describe('POST /api/lessons/submit-questions', () => {
  const ANSWERS_BODY = {
    session_id: 'ls_xyz',
    quest_id: 'q-001',
    answers: { 'lq-1': 'B', 'lq-2': 'A', 'lq-3': 'D' },
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await submitLessonQs(makePost('/api/lessons/submit-questions', ANSWERS_BODY))
    expect(res.status).toBe(401)
  })

  it('returns { recorded: true } — no score exposed to client', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESPONSE)
    const res = await submitLessonQs(makePost('/api/lessons/submit-questions', ANSWERS_BODY))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.recorded).toBe(true)
    expect(body).not.toHaveProperty('score')
    expect(body).not.toHaveProperty('percentage')
  })

  it('calls WP at /lessons/submit-questions', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESPONSE)
    await submitLessonQs(makePost('/api/lessons/submit-questions', ANSWERS_BODY))
    const [path, method] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/lessons/submit-questions')
    expect(method).toBe('POST')
  })

  it('returns 422 on invalid answers', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_invalid_answers', 'Answers must be an object.', 422))
    const res = await submitLessonQs(makePost('/api/lessons/submit-questions', { ...ANSWERS_BODY, answers: [] }))
    expect(res.status).toBe(422)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('timeout'))
    const res = await submitLessonQs(makePost('/api/lessons/submit-questions', ANSWERS_BODY))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/lessons/complete ────────────────────────────────────────────────

describe('POST /api/lessons/complete', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await completeLesson(makePost('/api/lessons/complete', { session_id: 'ls_xyz' }))
    expect(res.status).toBe(401)
  })

  it('returns { completed: true }', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(COMPLETE_RESPONSE)
    const res = await completeLesson(makePost('/api/lessons/complete', { session_id: 'ls_xyz' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.completed).toBe(true)
    expect(body).not.toHaveProperty('badge')
  })

  it('forwards body to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(COMPLETE_RESPONSE)
    await completeLesson(makePost('/api/lessons/complete', { session_id: 'ls_xyz' }))
    const [, , body] = mockWpFetch.mock.calls[0]
    expect(body).toEqual({ session_id: 'ls_xyz' })
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await completeLesson(makePost('/api/lessons/complete', { session_id: 'ls_xyz' }))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/lessons/teacher/catalogue ───────────────────────────────────────

describe('GET /api/lessons/teacher/catalogue', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await teacherCatalogue(makeGet('/api/lessons/teacher/catalogue'))
    expect(res.status).toBe(401)
  })

  it('returns teacher lesson catalogue', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ lessons: [LESSON_LIST.lessons[0]] })
    const res = await teacherCatalogue(makeGet('/api/lessons/teacher/catalogue'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.lessons).toHaveLength(1)
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_forbidden', 'Forbidden', 403))
    const res = await teacherCatalogue(makeGet('/api/lessons/teacher/catalogue'))
    expect(res.status).toBe(403)
  })
})
