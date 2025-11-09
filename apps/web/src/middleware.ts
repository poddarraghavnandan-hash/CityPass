import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get user session
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api/admin')) {

    if (!token) {
      // Redirect to sign in for admin routes
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  const response = NextResponse.next();

  // Read existing preferences cookie or create new one
  let preferences = request.cookies.get('user_prefs')?.value;
  let prefs: any = {};

  if (preferences) {
    try {
      prefs = JSON.parse(preferences);
    } catch (e) {
      prefs = {};
    }
  }

  // If user is logged in, merge their profile preferences
  if (token?.id) {
    prefs.userId = token.id;
    prefs.isLoggedIn = true;
  } else {
    prefs.isLoggedIn = false;
  }

  // Set default preferences if not set
  if (!prefs.city) {
    prefs.city = 'New York';
  }

  if (!prefs.lastVisit) {
    prefs.firstVisit = Date.now();
  }
  prefs.lastVisit = Date.now();

  if (!prefs.sessionId) {
    prefs.sessionId = crypto.randomUUID();
  }

  // Update the cookie with 30-day expiry
  response.cookies.set('user_prefs', JSON.stringify(prefs), {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};
