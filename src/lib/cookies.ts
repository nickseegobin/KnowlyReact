/**
 * Server-side cookie helpers.
 * JWT is stored in an HttpOnly, Secure, SameSite=Lax cookie.
 * Lax (not Strict) is required so the cookie is sent after cross-site top-level
 * navigations — e.g. returning from a payment gateway on a different domain.
 * The client never has direct access to the token.
 */

import { cookies } from 'next/headers'
import type { ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies'

export const TOKEN_COOKIE = 'knowly_token'
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days — matches WP JWT expiry

export async function getTokenFromCookie(): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(TOKEN_COOKIE)?.value
}

export function setTokenCookie(res: ResponseCookies, token: string): void {
  res.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  })
}

export function clearTokenCookie(res: ResponseCookies): void {
  res.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
