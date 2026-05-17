/**
 * Tests for leaderboard proxy routes:
 *   GET /api/leaderboard/[level]/[period]/[subject]
 *   GET /api/leaderboard/me
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

import { GET as getBoard }  from '@/app/api/leaderboard/[level]/[period]/[subject]/route'
import { GET as getMe }     from '@/app/api/leaderboard/me/route'
import { WPApiError }       from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BOARD = {
  board_key: 'std_4-term_1-math-2026-05-17',
  standard: 'std_4', term: 'term_1', subject: 'math', date: '2026-05-17',
  total_participants: 42,
  entries: [
    { rank: 1, nickname: 'StarPupil', points: 95, is_current_user: false },
    { rank: 2, nickname: 'Alex',      points: 90, is_current_user: true },
  ],
  my_position: 2,
  my_points: 90,
}

const MY_BOARDS = [
  { subject: 'math', board_key: 'std_4-term_1-math-2026-05-17', my_position: 2, my_points: 90 },
]

function makeGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`)
}

function boardParams(level: string, period: string, subject: string) {
  return { params: Promise.resolve({ level, period, subject }) }
}

// ── GET /api/leaderboard/[level]/[period]/[subject] ───────────────────────────

describe('GET /api/leaderboard/[level]/[period]/[subject]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getBoard(makeGet('/api/leaderboard/std_4/term_1/math'), boardParams('std_4', 'term_1', 'math'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns daily leaderboard', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(BOARD)
    const res = await getBoard(makeGet('/api/leaderboard/std_4/term_1/math'), boardParams('std_4', 'term_1', 'math'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.total_participants).toBe(42)
    expect(body.entries).toHaveLength(2)
    expect(body.my_position).toBe(2)
  })

  it('calls WP with level, period, subject in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(BOARD)
    await getBoard(makeGet('/api/leaderboard/std_5/term_2/english'), boardParams('std_5', 'term_2', 'english'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/leaderboard/std_5/term_2/english')
  })

  it('includes level and period as query params', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(BOARD)
    await getBoard(makeGet('/api/leaderboard/std_4/term_1/math'), boardParams('std_4', 'term_1', 'math'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('level=std_4')
    expect(path).toContain('period=term_1')
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Board not found.', 404))
    const res = await getBoard(makeGet('/api/leaderboard/std_4/term_1/math'), boardParams('std_4', 'term_1', 'math'))
    expect(res.status).toBe(404)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getBoard(makeGet('/api/leaderboard/std_4/term_1/math'), boardParams('std_4', 'term_1', 'math'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/leaderboard/me ───────────────────────────────────────────────────

describe('GET /api/leaderboard/me', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getMe(makeGet('/api/leaderboard/me'))
    expect(res.status).toBe(401)
  })

  it('returns boards the current child appears on today', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ boards: MY_BOARDS })
    const res = await getMe(makeGet('/api/leaderboard/me'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.boards).toHaveLength(1)
    expect(body.boards[0].subject).toBe('math')
  })

  it('returns empty boards array when child has no entries today', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ boards: [] })
    const res = await getMe(makeGet('/api/leaderboard/me'))
    const body = await res.json()
    expect(body.boards).toHaveLength(0)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getMe(makeGet('/api/leaderboard/me'))
    expect(res.status).toBe(500)
  })
})
