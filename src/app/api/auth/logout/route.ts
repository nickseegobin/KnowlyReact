import { NextResponse } from 'next/server'
import { clearTokenCookie } from '@/lib/cookies'

export async function POST() {
  const res = NextResponse.json({ success: true })
  clearTokenCookie(res.cookies)
  return res
}
