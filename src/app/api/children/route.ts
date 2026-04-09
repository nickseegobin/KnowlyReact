import { NextRequest, NextResponse } from 'next/server'
import { wpChildren, WPApiError } from '@/lib/wp-api'
import { getTokenFromCookie } from '@/lib/cookies'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const data = await wpChildren.list(token)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to fetch children' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const { first_name, nickname, level } = body

    if (!first_name || !nickname || !level) {
      return NextResponse.json({ message: 'first_name, nickname, and level are required' }, { status: 400 })
    }

    // Child never sets their own password — generate a secure random one server-side
    const password = randomBytes(24).toString('base64url')

    const data = await wpChildren.create({ ...body, password }, token)
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Failed to create child' }, { status: 500 })
  }
}
