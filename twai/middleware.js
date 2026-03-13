import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // Check if the user is blocked - redirect to homepage with a message
  if (session && session.isBlocked) {
    // Only redirect if not already on the homepage
    if (pathname !== '/') {
      const redirectUrl = new URL('/', req.url)
      redirectUrl.searchParams.set('blocked', 'true')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Allow public pages: root, signup, terms, privacy, and document routes
  if (!session && 
      pathname !== '/' && 
      !pathname.startsWith('/signup') && 
      !pathname.startsWith('/terms') && 
      !pathname.startsWith('/privacy') && 
      !pathname.startsWith('/welcome') && 
      !pathname.startsWith('/document/') && 
      !pathname.startsWith('/api/documents/')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Redirect logged-in users from root to dashboard, but only if not blocked
  if (session && !session.isBlocked &&( pathname === '/' || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/terms') || 
    pathname.startsWith('/welcome') || //REMOVE THIS AND REPLACE WITH DASHBOARD
    pathname.startsWith('/privacy'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (!session && 
      pathname !== '/' && 
      !pathname.startsWith('/signup') && 
      !pathname.startsWith('/terms') && 
      !pathname.startsWith('/privacy')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // // Redirect logged-in users from root to dashboard, but only if not blocked
  // if (session && !session.isBlocked && pathname !== '/welcome') {
  //   return NextResponse.redirect(new URL('/welcome', req.url))
  // }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}