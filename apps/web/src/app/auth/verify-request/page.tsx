export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            A sign in link has been sent to your email address. Click the link to complete your sign in.
          </p>

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          {/* Back Link */}
          <a
            href="/auth/signin"
            className="inline-block mt-6 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
