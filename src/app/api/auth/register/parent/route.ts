import { NextRequest, NextResponse } from 'next/server'
import { wpAuth, WPApiError } from '@/lib/wp-api'
import { setTokenCookie } from '@/lib/cookies'
import type { RegisterParentPayload } from '@/types/knowly'

export async function POST(req: NextRequest) {
  try {
    const body: RegisterParentPayload = await req.json()
    const { first_name, last_name, email, password, phone, avatar_index } = body

    if (!first_name || !last_name || !email || !password) {
      return NextResponse.json({ message: 'All required fields must be filled' }, { status: 400 })
    }

    const data = await wpAuth.registerParent({ first_name, last_name, email, password, phone, avatar_index })

    const res = NextResponse.json({
      user_id: data.user_id,
      display_name: data.display_name,
      role: data.role,
    }, { status: 201 })

    setTokenCookie(res.cookies, data.token)

    return res
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 })
  }
}
