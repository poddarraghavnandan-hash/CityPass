'use client';

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send error to error tracking service (e.g., Sentry)
    // trackError(error, errorInfo);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-black'
          : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'
      }`}
    >
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-12 rounded-3xl backdrop-blur-xl border text-center ${
            darkMode
              ? 'bg-white/5 border-white/10'
              : 'bg-white/60 border-gray-200'
          }`}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6"
          >
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </motion.div>

          {/* Title */}
          <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Oops! Something went wrong
          </h1>

          {/* Description */}
          <p className={`text-lg mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We encountered an unexpected error. Don't worry, we've been notified and are looking into it.
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div
              className={`mt-6 p-4 rounded-lg text-left overflow-auto max-h-48 ${
                darkMode ? 'bg-black/40' : 'bg-gray-100'
              }`}
            >
              <p className={`text-sm font-mono mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                <strong>Error:</strong> {error.name}
              </p>
              <p className={`text-xs font-mono ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {error.message}
              </p>
              {error.stack && (
                <pre className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goHome}
              className={`px-6 py-3 rounded-full font-medium transition border-2 flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              Go Home
            </motion.button>
          </div>

          {/* Help text */}
          <p className={`mt-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            If the problem persists, please{' '}
            <a
              href="mailto:support@citypass.com"
              className="text-purple-600 hover:underline"
            >
              contact support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Hook-based error boundary for functional components
 * Usage: const { ErrorFallback, resetError } = useErrorHandler()
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const ErrorFallback = error ? (
    <DefaultErrorFallback error={error} reset={resetError} />
  ) : null;

  return {
    error,
    handleError,
    resetError,
    ErrorFallback,
  };
}
