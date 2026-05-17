/**
 * Tests for analytics proxy routes not covered in analytics-history.test.ts:
 *   GET /api/analytics/self
 *   GET /api/analytics/child-self
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

import { GET as getSelf }      from '@/app/api/analytics/self/route'
import { GET as getChildSelf } from '@/app/api/analytics/child-self/route'
import { WPApiError }          from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANALYTICS_PAYLOAD = {
  avg_score: 72, at_risk: false,
  weekly_trials: 3, trial_count: 12, quest_count: 5,
  trend: [{ week: '2026-W18', avg: 65 }, { week: '2026-W19', avg: 72 }],
  subjects: [{ subject: 'math', score: 78, trial_count: 5, weak_topics: 1 }],
  strengths: ['Number Patterns', 'Fractions'],
  weaknesses: ['Decimals'],
  retry_effectiveness: [],
  recent_trials: [{ session_id: 1, subject: 'math', score: 80, total: 12 }],
}

function makeGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`)
}

// ── GET /api/analytics/self ───────────────────────────────────────────────────

describe('GET /api/analytics/self', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getSelf(makeGet('/api/analytics/self'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns analytics for active child', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(ANALYTICS_PAYLOAD)
    const res = await getSelf(makeGet('/api/analytics/self'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.avg_score).toBe(72)
    expect(body.trial_count).toBe(12)
    expect(body.subjects).toHaveLength(1)
    expect(body.subjects[0].subject).toBe('math')
  })

  it('includes 4-week trend data', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(ANALYTICS_PAYLOAD)
    const res = await getSelf(makeGet('/api/analytics/self'))
    const body = await res.json()
    expect(body.trend).toHaveLength(2)
    expect(body.trend[0].week).toBe('2026-W18')
  })

  it('returns at_risk flag correctly', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ ...ANALYTICS_PAYLOAD, at_risk: true, avg_score: 45 })
    const res = await getSelf(makeGet('/api/analytics/self'))
    const body = await res.json()
    expect(body.at_risk).toBe(true)
  })

  it('returns WPApiError on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_token_invalid', 'Invalid token', 401))
    const res = await getSelf(makeGet('/api/analytics/self'))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.code).toBe('knowly_token_invalid')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getSelf(makeGet('/api/analytics/self'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/analytics/child-self ────────────────────────────────────────────

describe('GET /api/analytics/child-self', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getChildSelf(makeGet('/api/analytics/child-self'))
    expect(res.status).toBe(401)
  })

  it('returns analytics from the child\'s own perspective', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(ANALYTICS_PAYLOAD)
    const res = await getChildSelf(makeGet('/api/analytics/child-self'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.avg_score).toBe(72)
    expect(body.strengths).toContain('Fractions')
    expect(body.weaknesses).toContain('Decimals')
  })

  it('returns WPApiError on API failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_missing_profile', 'No profile set.', 422))
    const res = await getChildSelf(makeGet('/api/analytics/child-self'))
    const body = await res.json()
    expect(res.status).toBe(422)
    expect(body.code).toBe('knowly_missing_profile')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getChildSelf(makeGet('/api/analytics/child-self'))
    expect(res.status).toBe(500)
  })
})
