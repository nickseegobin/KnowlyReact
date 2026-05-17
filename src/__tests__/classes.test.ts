/**
 * Tests for class proxy routes:
 *   GET  /api/classes/my
 *   GET  /api/classes/[id]/members
 *   GET  /api/classes/[id]/tasks
 *   POST /api/classes/[id]/tasks
 *   GET  /api/classes/[id]/my-tasks
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

import { GET as getMyClasses }    from '@/app/api/classes/my/route'
import { DELETE as removeMember } from '@/app/api/classes/[id]/members/[child_id]/route'
import { GET as getTasks,
         POST as createTask }     from '@/app/api/classes/[id]/tasks/route'
import { GET as getMyTasks }      from '@/app/api/classes/[id]/my-tasks/route'
import { WPApiError }             from '@/lib/wp-api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MY_CLASSES = [
  { class_id: 1, name: 'Class 4A', level: 'std_4', member_count: 25 },
]

const MEMBERS = [
  { child_id: 7, display_name: 'Alex', level: 'std_4', avatar_index: 2 },
  { child_id: 8, display_name: 'Sam',  level: 'std_4', avatar_index: 5 },
]

const TASKS = [
  { task_id: 1, title: 'Number Patterns', type: 'lesson', reference_id: 'q-001', subject: 'math', due_date: '2026-06-01', status: 'pending' },
]

const CREATED_TASK = { task_id: 2, title: 'Sequences', type: 'lesson', reference_id: 'q-002', subject: 'math', due_date: '2026-06-15' }

const MY_TASKS = [
  { task_id: 1, title: 'Number Patterns', type: 'lesson', reference_id: 'q-001', subject: 'math', due_date: '2026-06-01', completed: false },
]

function makeGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`)
}

function makePost(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function classParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function memberParams(id: string, child_id: string) {
  return { params: Promise.resolve({ id, child_id }) }
}

// ── GET /api/classes/my ───────────────────────────────────────────────────────

describe('GET /api/classes/my', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getMyClasses(makeGet('/api/classes/my'))
    expect(res.status).toBe(401)
    expect(mockWpFetch).not.toHaveBeenCalled()
  })

  it('returns list of teacher classes', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ classes: MY_CLASSES })
    const res = await getMyClasses(makeGet('/api/classes/my'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.classes).toHaveLength(1)
    expect(body.classes[0].class_id).toBe(1)
  })

  it('returns empty array when teacher has no classes', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ classes: [] })
    const res = await getMyClasses(makeGet('/api/classes/my'))
    const body = await res.json()
    expect(body.classes).toHaveLength(0)
  })

  it('returns WPApiError on failure', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_forbidden', 'Forbidden', 403))
    const res = await getMyClasses(makeGet('/api/classes/my'))
    expect(res.status).toBe(403)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getMyClasses(makeGet('/api/classes/my'))
    expect(res.status).toBe(500)
  })
})

// ── DELETE /api/classes/[id]/members/[child_id] ───────────────────────────────

describe('DELETE /api/classes/[id]/members/[child_id]', () => {
  function makeDelete(url: string): Request {
    return new Request(`http://localhost${url}`, { method: 'DELETE' })
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await removeMember(makeDelete('/api/classes/1/members/7'), memberParams('1', '7'))
    expect(res.status).toBe(401)
  })

  it('removes a student from the class', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ removed: true })
    const res = await removeMember(makeDelete('/api/classes/1/members/7'), memberParams('1', '7'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.removed).toBe(true)
  })

  it('calls WP DELETE with class id and child_id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ removed: true })
    await removeMember(makeDelete('/api/classes/5/members/99'), memberParams('5', '99'))
    const [path, method] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/classes/5/members/99')
    expect(method).toBe('DELETE')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await removeMember(makeDelete('/api/classes/1/members/7'), memberParams('1', '7'))
    expect(res.status).toBe(401)
  })
})

// ── GET /api/classes/[id]/tasks ───────────────────────────────────────────────

describe('GET /api/classes/[id]/tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getTasks(makeGet('/api/classes/1/tasks'), classParams('1'))
    expect(res.status).toBe(401)
  })

  it('returns task list for class', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ tasks: TASKS })
    const res = await getTasks(makeGet('/api/classes/1/tasks'), classParams('1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tasks).toHaveLength(1)
    expect(body.tasks[0].type).toBe('lesson')
  })

  it('calls WP with class id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ tasks: TASKS })
    await getTasks(makeGet('/api/classes/99/tasks'), classParams('99'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/classes/99/tasks')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getTasks(makeGet('/api/classes/1/tasks'), classParams('1'))
    expect(res.status).toBe(500)
  })
})

// ── POST /api/classes/[id]/tasks ──────────────────────────────────────────────

describe('POST /api/classes/[id]/tasks', () => {
  const TASK_BODY = {
    title: 'Sequences', type: 'lesson', reference_id: 'q-002', subject: 'math', due_date: '2026-06-15',
  }

  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await createTask(makePost('/api/classes/1/tasks', TASK_BODY), classParams('1'))
    expect(res.status).toBe(401)
  })

  it('creates a task and returns 201', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(CREATED_TASK)
    const res = await createTask(makePost('/api/classes/1/tasks', TASK_BODY), classParams('1'))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.task_id).toBe(2)
    expect(body.type).toBe('lesson')
  })

  it('forwards body and class id to WP', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue(CREATED_TASK)
    await createTask(makePost('/api/classes/5/tasks', TASK_BODY), classParams('5'))
    const [path, , body] = mockWpFetch.mock.calls[0]
    expect(path).toBe('/classes/5/tasks')
    expect(body).toEqual(TASK_BODY)
  })

  it('returns 402 when teacher has no red gems', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new WPApiError('knowly_insufficient_gems', 'No red gems.', 402))
    const res = await createTask(makePost('/api/classes/1/tasks', TASK_BODY), classParams('1'))
    expect(res.status).toBe(402)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await createTask(makePost('/api/classes/1/tasks', TASK_BODY), classParams('1'))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/classes/[id]/my-tasks ───────────────────────────────────────────

describe('GET /api/classes/[id]/my-tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await getMyTasks(makeGet('/api/classes/1/my-tasks'), classParams('1'))
    expect(res.status).toBe(401)
  })

  it('returns tasks assigned to the current child', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ tasks: MY_TASKS })
    const res = await getMyTasks(makeGet('/api/classes/1/my-tasks'), classParams('1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tasks).toHaveLength(1)
    expect(body.tasks[0].completed).toBe(false)
  })

  it('calls WP with class id in path', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockResolvedValue({ tasks: MY_TASKS })
    await getMyTasks(makeGet('/api/classes/7/my-tasks'), classParams('7'))
    const [path] = mockWpFetch.mock.calls[0]
    expect(path).toContain('/classes/7/my-tasks')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetToken.mockResolvedValue('jwt')
    mockWpFetch.mockRejectedValue(new Error('crash'))
    const res = await getMyTasks(makeGet('/api/classes/1/my-tasks'), classParams('1'))
    expect(res.status).toBe(500)
  })
})
