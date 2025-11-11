import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { randomUUID } from 'crypto';

export async function proxy(request: NextRequest) {
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
    prefs.sessionId = randomUUID();
  }

  // Update the cookie with 30-day expiry
  response.cookies.set('user_prefs', JSON.stringify(prefs), {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Security headers (CSP + hardening)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.tiktok.com https://*.instagram.com https://platform.instagram.com https://www.instagram.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline' https://*.tiktok.com https://*.instagram.com",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.typesense.net https://*.tiktok.com https://*.instagram.com",
    "frame-src 'self' https://*.tiktok.com https://*.instagram.com https://www.instagram.com https://platform.instagram.com",
    "frame-ancestors 'self'",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=(self)',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

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
