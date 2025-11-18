/**
 * Admin Authentication Helpers
 *
 * Provides authentication and authorization checks for admin routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from '@citypass/db';

/**
 * Check if the current user is an admin
 * Returns the user if they are an admin, otherwise returns null
 */
export async function getAdminUser(req?: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const userId = 'id' in session.user ? (session.user as any).id : null;

  if (!userId) {
    return null;
  }

  // Fetch user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}

/**
 * Middleware to protect admin routes
 * Returns an error response if the user is not an admin
 */
export async function requireAdmin(req: NextRequest) {
  const adminUser = await getAdminUser(req);

  if (!adminUser) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Admin access required'
      },
      { status: 403 }
    );
  }

  return null; // No error, user is authorized
}

/**
 * Higher-order function to wrap admin route handlers
 * Usage:
 * export const GET = withAdminAuth(async (req, user) => {
 *   // Your handler code here
 *   // user is guaranteed to be an admin
 * });
 */
export function withAdminAuth<T extends any[]>(
  handler: (req: NextRequest, adminUser: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const adminUser = await getAdminUser(req);

    if (!adminUser) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Admin access required'
        },
        { status: 403 }
      );
    }

    return handler(req, adminUser, ...args);
  };
}
