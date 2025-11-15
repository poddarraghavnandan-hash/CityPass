import Link from 'next/link';

// Temporarily disabled - Nhost authentication is being replaced
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Temporarily Unavailable
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We're upgrading our authentication system. Please check back soon.
          </p>
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
