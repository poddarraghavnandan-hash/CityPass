'use client';

// Temporarily disabled - Nhost packages are deprecated and incompatible with Next.js 16
// import { useUserData, useSignOut, useAuthenticated } from '@nhost/nextjs';
import Link from 'next/link';

export function UserProfile() {
  // const isAuthenticated = useAuthenticated();
  // const user = useUserData();
  // const { signOut } = useSignOut();
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Sign in
      </Link>
    );
  }

  return null;

  // return (
  //   <div className="flex items-center gap-4">
  //     <span className="text-sm text-gray-700">
  //       {user?.email || 'User'}
  //     </span>
  //     <button
  //       onClick={signOut}
  //       className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  //     >
  //       Sign out
  //     </button>
  //   </div>
  // );
}
