import { NextResponse } from 'next/server'
import { wpFetch, WPApiError } from '@/lib/wp-api'

export async function GET() {
  try {
    const data = await wpFetch('/gems/products', 'GET')
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof WPApiError) return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    return NextResponse.json({ message: 'Failed to fetch gem products' }, { status: 500 })
  }
}
