/**
 * Tests for notification proxy routes:
 *   GET  /api/notifications
 *   GET  /api/notifications/count
 *   POST /api/notifications/read-all
 *   POST /api/notifications/[id]/read
 *   POST /api/notifications/[id]/respond
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

import { GET as getNotifications }  from '@/app/api/notifications/route'
import { GET as getCount }          from '@/app/api/notifications/count/route'
import { POST as readAll }          from '@/app/api/notifications/read-all/route'
import { POST as markRead }         from '@/app/api/notifications/[id]/read/route'
import { POST as respond }          from '@/app/api/notifications/[id]/respond/route'
import { WPApiError }               from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOTIFICATIONS = [
  { id: 1, type: 'class_invite', message: 'You have been invited to Class A', is_read: false, created_at: '2026-05-15 10:00:00' },
  { id: 2, type: 'task_assigned', message: 'New lesson assigned', is_read: true, created_at: '2026-05-14 09:00:00' },
]

function makeGet(url: string, search: Record<string, string> = {}): NextRequest {
  const u = new URL(`http://localhost${url}`)
  Object.entries(search).forEach(([k, v]) => u.searchParams.set(k, v))
  return new NextRequest(u)
}

function makePost(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function idParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ── GET /api/notifications ────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getNotifications(makeGet('/api/notifications'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns notification list', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ notifications: NOTIFICATIONS })
    const res = await getNotifications(makeGet('/api/notifications'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.notifications).toHaveLength(2)
  })

  it('forwards unread_only, limit, offset params to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ notifications: [] })
    await getNotifications(makeGet('/api/notifications', { unread_only: 'true', limit: '10', offset: '20' }))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('unread_only=true')
    expect(path).toContain('limit=10')
    expect(path).toContain('offset=20')
  })

  it('defaults to unread_only=false, limit=50, offset=0', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ notifications: [] })
    await getNotifications(makeGet('/api/notifications'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('unread_only=false')
    expect(path).toContain('limit=50')
    expect(path).toContain('offset=0')
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_token_invalid', 'Invalid token', 401))
    const res = await getNotifications(makeGet('/api/notifications'))
    expect(res.status).toBe(401)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getNotifications(makeGet('/api/notifications'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/notifications/count ─────────────────────────────────────────────
// This route is intentionally fail-open: returns { unread: 0 } (200) when
// unauthenticated or on error, so the unread badge never crashes the UI.

describe('GET /api/notifications/count', () => {
  it('returns { unread: 0 } with 200 when unauthenticated (fail-open)', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getCount()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.unread).toBe(0)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns unread count from WP when authenticated', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ unread_count: 3 })
    const res = await getCount()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.unread_count).toBe(3)
  })

  it('returns 0 when no unread notifications', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ unread_count: 0 })
    const res = await getCount()
    const body = await res.json()
    expect(body.unread_count).toBe(0)
  })

  it('returns { unread: 0 } with 200 on unexpected error (fail-open)', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getCount()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.unread).toBe(0)
  })
})

// ── POST /api/notifications/read-all ─────────────────────────────────────────

describe('POST /api/notifications/read-all', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await readAll(makePost('/api/notifications/read-all'))
    expect(res.status).toBe(401)
  })

  it('marks all notifications as read', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ updated: 5 })
    const res = await readAll(makePost('/api/notifications/read-all'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.updated).toBe(5)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await readAll(makePost('/api/notifications/read-all'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/notifications/[id]/read ────────────────────────────────────────

describe('POST /api/notifications/[id]/read', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await markRead(makePost('/api/notifications/1/read'), idParams('1'))
    expect(res.status).toBe(401)
  })

  it('marks a single notification as read', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ updated: true })
    const res = await markRead(makePost('/api/notifications/1/read'), idParams('1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.updated).toBe(true)
  })

  it('calls WP with notification id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ updated: true })
    await markRead(makePost('/api/notifications/42/read'), idParams('42'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/notifications/42/read')
  })

  it('returns 404 when notification not found', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_not_found', 'Not found.', 404))
    const res = await markRead(makePost('/api/notifications/999/read'), idParams('999'))
    expect(res.status).toBe(404)
  })
})

// ── POST /api/notifications/[id]/respond ─────────────────────────────────────

describe('POST /api/notifications/[id]/respond', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await respond(makePost('/api/notifications/1/respond', { response: 'accept' }), idParams('1'))
    expect(res.status).toBe(401)
  })

  it('forwards accept response to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ accepted: true })
    const res = await respond(makePost('/api/notifications/1/respond', { response: 'accept' }), idParams('1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.accepted).toBe(true)
  })

  it('forwards decline response to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ declined: true })
    await respond(makePost('/api/notifications/1/respond', { response: 'decline' }), idParams('1'))
    const [, , body] = mockWpFetch.mock.calls[0]
    expect(body).toEqual({ response: 'decline' })
  })

  it('calls WP with notification id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ accepted: true })
    await respond(makePost('/api/notifications/7/respond', { response: 'accept' }), idParams('7'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/notifications/7/respond')
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_missing_fields', 'Response required.', 422))
    const res = await respond(makePost('/api/notifications/1/respond', {}), idParams('1'))
    expect(res.status).toBe(422)
  })
})
