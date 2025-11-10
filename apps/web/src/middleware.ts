/**
 * Next.js Middleware - Security Headers & CSP
 *
 * Implements Content-Security-Policy to prevent XSS attacks
 * while allowing necessary social media embeds from Instagram/TikTok
 *
 * Runs on all routes except static assets and Next.js internals
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy
  // Strict policy to prevent XSS while allowing social embeds
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

  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  );

  // Additional Security Headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature-Policy)
  // Restrict access to powerful browser APIs
  const permissionsPolicy = [
    'accelerometer=()',
    'camera=()',
    'geolocation=(self)',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ];
  response.headers.set('Permissions-Policy', permissionsPolicy.join(', '));

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
