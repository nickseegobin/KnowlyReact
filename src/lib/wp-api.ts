/**
 * Server-side client for the KnowlyWP REST API.
 * Never imported by client components — only used in Next.js API routes.
 */

const BASE = process.env.WP_API_BASE

if (!BASE) throw new Error('WP_API_BASE env var is not set')

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export class WPApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'WPApiError'
  }
}

export async function wpFetch<T>(
  path: string,
  method: Method = 'GET',
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const json = await res.json()

  if (!res.ok) {
    throw new WPApiError(
      json?.code ?? 'unknown_error',
      json?.message ?? 'An unexpected error occurred',
      res.status,
    )
  }

  return (json?.data ?? json) as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const wpAuth = {
  login: (username: string, password: string) =>
    wpFetch<{ token: string; expires_in: number; user_id: number; display_name: string; email: string; role: string; active_child_id: number | null; approval_status: string | null }>(
      '/auth/login', 'POST', { username, password }
    ),

  registerParent: (data: object) =>
    wpFetch<{ token: string; user_id: number; display_name: string; role: string }>
      ('/auth/register/parent', 'POST', data),

  registerTeacher: (data: object) =>
    wpFetch<{ user_id: number; display_name: string; approval_status: string }>
      ('/auth/register/teacher', 'POST', data),

  me: (token: string) =>
    wpFetch<object>('/auth/me', 'GET', undefined, token),

  setPin: (pin: string, token: string) =>
    wpFetch<{ pin_set: boolean }>('/auth/pin/set', 'POST', { pin }, token),

  verifyPin: (pin: string, token: string) =>
    wpFetch<{ verified: boolean }>('/auth/pin/verify', 'POST', { pin }, token),

  pinStatus: (token: string) =>
    wpFetch<{ pin_set: boolean }>('/auth/pin/status', 'GET', undefined, token),

  passwordReset: (email: string) =>
    wpFetch<{ message: string }>('/auth/password/reset', 'POST', { email }),
}

// ── Children ──────────────────────────────────────────────────────────────────

export const wpChildren = {
  create: (data: object, token: string) =>
    wpFetch<object>('/children', 'POST', data, token),

  list: (token: string) =>
    wpFetch<object[]>('/children', 'GET', undefined, token),

  switchTo: (childId: number, token: string) =>
    wpFetch<object>(`/children/${childId}/switch`, 'POST', undefined, token),
}
