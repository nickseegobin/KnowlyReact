import { NextRequest, NextResponse } from 'next/server'
import { TOKEN_COOKIE } from '@/lib/cookies'

// Routes that require a valid session
const PROTECTED = ['/profiles', '/dashboard', '/parent-profile', '/child-profile', '/teacher-profile', '/register/pin', '/register/add-child', '/register/verify-pin', '/child']
// Note: /waiting-approval and /register/pending are intentionally NOT protected — teachers land here with no JWT after registration

// Routes that should redirect to /profiles if already logged in (exact match only)
const AUTH_ONLY = ['/login', '/register']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(TOKEN_COOKIE)?.value

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthOnly = AUTH_ONLY.some((p) => pathname === p)

  if (isProtected && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthOnly && token) {
    const url = req.nextUrl.clone()
    url.pathname = '/profiles'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|avatars|.*\\.png$).*)'],
}
