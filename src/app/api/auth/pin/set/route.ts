import { NextRequest, NextResponse } from 'next/server'
import { wpAuth, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const { pin } = await req.json()
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ message: 'PIN must be 4 digits' }, { status: 400 })
    }

    const data = await wpAuth.setPin(pin, token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to set PIN' }, { status: 500 })
  }
}
