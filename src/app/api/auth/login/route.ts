import { NextRequest, NextResponse } from 'next/server'
import { wpAuth, WPApiError } from '@/lib/wp-api'
import { setTokenCookie } from '@/lib/cookies'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    // WP login response already includes role and approval_status (for teachers)
    const data = await wpAuth.login(username, password)

    const res = NextResponse.json({
      user_id: data.user_id,
      display_name: data.display_name,
      role: data.role,
      active_child_id: data.active_child_id ?? null,
      approval_status: data.approval_status ?? null,
    })

    // Only set cookie when a token is returned (teachers pending approval still get a token)
    if (data.token) setTokenCookie(res.cookies, data.token)

    return res
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Login failed' }, { status: 500 })
  }
}
