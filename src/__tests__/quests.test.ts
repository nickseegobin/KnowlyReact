/**
 * Tests for all quest proxy routes:
 *   GET  /api/quests
 *   GET  /api/quests/[quest_id]
 *   GET  /api/quests/[quest_id]/questions
 *   POST /api/quests/start
 *   POST /api/quests/submit-questions
 *   POST /api/quests/complete
 *   GET  /api/quests/teacher/catalogue
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

import { GET as getCatalogue }       from '@/app/api/quests/route'
import { GET as getQuest }           from '@/app/api/quests/[quest_id]/route'
import { GET as getQuestions }       from '@/app/api/quests/[quest_id]/questions/route'
import { POST as startQuest }        from '@/app/api/quests/start/route'
import { POST as submitQuestions }   from '@/app/api/quests/submit-questions/route'
import { POST as completeQuest }     from '@/app/api/quests/complete/route'
import { GET as teacherCatalogue }   from '@/app/api/quests/teacher/catalogue/route'
import { WPApiError }                from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const QUEST_LIST = {
  quests: [
    { quest_id: 'q-001', module_number: 1, module_title: 'Number Patterns', topic: 'Sequences', subject: 'math', gem_cost: 3, is_completed: false },
  ],
}

const QUEST_DETAIL = {
  quest_id: 'q-001', module_number: 1, module_title: 'Number Patterns',
  topic: 'Sequences', sections: [], worked_examples: [], knowledge_checks: [], gem_cost: 3, is_completed: false,
}

const QUEST_QUESTIONS = {
  questions: [
    { id: 'qq-1', sort_order: 1, difficulty: 'easy', question: 'What is a sequence?', options: { A: '...', B: '...', C: '...', D: '...' } },
    { id: 'qq-2', sort_order: 2, difficulty: 'easy', question: 'Next term?', options: { A: '...', B: '...', C: '...', D: '...' } },
    { id: 'qq-3', sort_order: 3, difficulty: 'medium', question: 'Identify pattern', options: { A: '...', B: '...', C: '...', D: '...' } },
  ],
}

const START_RESPONSE  = { session_id: 'qs_abc', gem_cost: 3, balance_after: 12, is_first_attempt: true }
const SUBMIT_RESPONSE = { score: 2, total: 3, percentage: 67, results: [{ question_id: 'qq-1', is_correct: true, correct_answer: 'A', explanation: '...' }] }
const COMPLETE_RESPONSE = { completed: true, badge_awarded: true, badge: { badge_id: 'b-1', title: 'Sequences Master', description: '...', icon_url: '...' } }

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

// ── GET /api/quests ───────────────────────────────────────────────────────────

describe('GET /api/quests', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getCatalogue(makeGet('/api/quests'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns quest catalogue', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_LIST)
    const res = await getCatalogue(makeGet('/api/quests'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.quests).toHaveLength(1)
    expect(body.quests[0].quest_id).toBe('q-001')
  })

  it('normalises Mathematics subject slug to math', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_LIST)
    await getCatalogue(makeGet('/api/quests', { subject: 'Mathematics' }))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('subject=math')
  })

  it('passes through raw subject slug when not in map', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_LIST)
    await getCatalogue(makeGet('/api/quests', { subject: 'math' }))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('subject=math')
  })

  it('returns WPApiError on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_token_invalid', 'Invalid token', 401))
    const res = await getCatalogue(makeGet('/api/quests'))
    expect(res.status).toBe(401)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getCatalogue(makeGet('/api/quests'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/quests/[quest_id] ────────────────────────────────────────────────

describe('GET /api/quests/[quest_id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getQuest(makeGet('/api/quests/q-001'), questParams('q-001'))
    expect(res.status).toBe(401)
  })

  it('returns full quest detail', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_DETAIL)
    const res = await getQuest(makeGet('/api/quests/q-001'), questParams('q-001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.quest_id).toBe('q-001')
    expect(body.module_title).toBe('Number Patterns')
  })

  it('calls WP with the correct quest_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_DETAIL)
    await getQuest(makeGet('/api/quests/q-special'), questParams('q-special'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/quests/q-special')
  })

  it('returns 404 when quest not found', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Quest not found.', 404))
    const res = await getQuest(makeGet('/api/quests/bad'), questParams('bad'))
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.message).toBe('Quest not found.')
  })
})

// ── GET /api/quests/[quest_id]/questions ──────────────────────────────────────

describe('GET /api/quests/[quest_id]/questions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getQuestions(makeGet('/api/quests/q-001/questions'), questParams('q-001'))
    expect(res.status).toBe(401)
  })

  it('returns 3 MCQs without correct_answer', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_QUESTIONS)
    const res = await getQuestions(makeGet('/api/quests/q-001/questions'), questParams('q-001'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.questions).toHaveLength(3)
  })

  it('calls WP with quest_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(QUEST_QUESTIONS)
    await getQuestions(makeGet('/api/quests/q-abc/questions'), questParams('q-abc'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/quests/q-abc/questions')
  })

  it('returns 404 when quest has no questions', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_no_questions', 'No questions available.', 404))
    const res = await getQuestions(makeGet('/api/quests/q-001/questions'), questParams('q-001'))
    expect(res.status).toBe(404)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('db down'))
    const res = await getQuestions(makeGet('/api/quests/q-001/questions'), questParams('q-001'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/quests/start ────────────────────────────────────────────────────

describe('POST /api/quests/start', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await startQuest(makePost('/api/quests/start', { quest_id: 'q-001', source: 'direct' }))
    expect(res.status).toBe(401)
  })

  it('returns session data on success', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(START_RESPONSE)
    const res = await startQuest(makePost('/api/quests/start', { quest_id: 'q-001', source: 'direct' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.session_id).toBe('qs_abc')
    expect(body.gem_cost).toBe(3)
  })

  it('returns 402 when gems are insufficient', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_insufficient_gems', 'Not enough gems.', 402))
    const res = await startQuest(makePost('/api/quests/start', { quest_id: 'q-001', source: 'direct' }))
    const body = await res.json()
    expect(res.status).toBe(402)
    expect(body.code).toBe('knowly_insufficient_gems')
  })

  it('forwards body to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(START_RESPONSE)
    await startQuest(makePost('/api/quests/start', { quest_id: 'q-002', source: 'assignment' }))
    const [, , body] = mockWpFetch.mock.calls[0]
    expect(body).toEqual({ quest_id: 'q-002', source: 'assignment' })
  })
})

// ── POST /api/quests/submit-questions ────────────────────────────────────────

describe('POST /api/quests/submit-questions', () => {
  const ANSWERS_BODY = {
    session_id: 'qs_abc',
    quest_id: 'q-001',
    answers: { 'qq-1': 'A', 'qq-2': 'B', 'qq-3': 'C' },
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await submitQuestions(makePost('/api/quests/submit-questions', ANSWERS_BODY))
    expect(res.status).toBe(401)
  })

  it('returns score and per-question results', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESPONSE)
    const res = await submitQuestions(makePost('/api/quests/submit-questions', ANSWERS_BODY))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.score).toBe(2)
    expect(body.total).toBe(3)
    expect(body.percentage).toBe(67)
    expect(body.results).toHaveLength(1)
  })

  it('calls WP at /quests/submit-questions', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(SUBMIT_RESPONSE)
    await submitQuestions(makePost('/api/quests/submit-questions', ANSWERS_BODY))
    const [path, method] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/quests/submit-questions')
    expect(method).toBe('POST')
  })

  it('returns 422 on invalid answers', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_invalid_answers', 'Answers must be an object.', 422))
    const res = await submitQuestions(makePost('/api/quests/submit-questions', { session_id: 'qs_abc', answers: null }))
    expect(res.status).toBe(422)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('timeout'))
    const res = await submitQuestions(makePost('/api/quests/submit-questions', ANSWERS_BODY))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/quests/complete ─────────────────────────────────────────────────

describe('POST /api/quests/complete', () => {
  const COMPLETE_BODY = { session_id: 'qs_abc', sections_completed: 3, sections_total: 3 }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await completeQuest(makePost('/api/quests/complete', COMPLETE_BODY))
    expect(res.status).toBe(401)
  })

  it('returns completion status and badge when awarded', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(COMPLETE_RESPONSE)
    const res = await completeQuest(makePost('/api/quests/complete', COMPLETE_BODY))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.completed).toBe(true)
    expect(body.badge_awarded).toBe(true)
    expect(body.badge.badge_id).toBe('b-1')
  })

  it('forwards body to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(COMPLETE_RESPONSE)
    await completeQuest(makePost('/api/quests/complete', COMPLETE_BODY))
    const [, , body] = mockWpFetch.mock.calls[0]
    expect(body).toEqual(COMPLETE_BODY)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await completeQuest(makePost('/api/quests/complete', COMPLETE_BODY))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/quests/teacher/catalogue ────────────────────────────────────────

describe('GET /api/quests/teacher/catalogue', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await teacherCatalogue(makeGet('/api/quests/teacher/catalogue'))
    expect(res.status).toBe(401)
  })

  it('returns teacher catalogue', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ quests: [QUEST_LIST.quests[0]] })
    const res = await teacherCatalogue(makeGet('/api/quests/teacher/catalogue'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.quests).toHaveLength(1)
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_forbidden', 'Forbidden', 403))
    const res = await teacherCatalogue(makeGet('/api/quests/teacher/catalogue'))
    expect(res.status).toBe(403)
  })
})
