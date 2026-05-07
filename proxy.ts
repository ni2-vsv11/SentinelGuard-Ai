import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!needsAuth) {
    return NextResponse.next()
  }

  const hasTokenCookie = request.cookies.get('auth_token_present')?.value === '1'
  if (!hasTokenCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin')) {
    const authRole = request.cookies.get('auth_role')?.value
    if (authRole !== 'admin') {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
