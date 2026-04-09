import { NextResponse } from 'next/server'
import { generateNickname } from '@/lib/nickname'
import { getTokenFromCookie } from '@/lib/cookies'

export async function POST() {
  const token = await getTokenFromCookie()
  if (!token) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })

  return NextResponse.json({ nickname: generateNickname() })
}
