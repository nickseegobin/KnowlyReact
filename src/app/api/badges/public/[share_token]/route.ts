import { NextRequest, NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: { share_token: string } }
) {
  try {
    const data = await wpFetch(`/badges/public/${params.share_token}`)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Badge not found' }, { status: 500 })
  }
}
