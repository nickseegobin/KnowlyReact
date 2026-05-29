import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const data = await wpFetch('/auth/password/reset', 'POST', { email })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to send reset email' }, { status: 500 })
  }
}
