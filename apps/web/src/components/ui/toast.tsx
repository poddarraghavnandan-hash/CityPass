'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((title: string, description?: string) => {
    return addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    return addToast({ type: 'error', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    return addToast({ type: 'info', title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    return addToast({ type: 'warning', title, description });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const [darkMode, setDarkMode] = useState(false);

  React.useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-[60] p-4 sm:p-6 pointer-events-none">
      <div className="flex flex-col gap-3 w-full sm:w-96">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
              darkMode={darkMode}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastItem({ toast, onClose, darkMode }: { toast: Toast; onClose: () => void; darkMode: boolean }) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: darkMode ? 'bg-green-500/10' : 'bg-green-50',
      borderColor: 'border-green-500/20',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      bgColor: darkMode ? 'bg-red-500/10' : 'bg-red-50',
      borderColor: 'border-red-500/20',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
      borderColor: 'border-yellow-500/20',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      borderColor: 'border-blue-500/20',
    },
  };

  const { icon: Icon, iconColor, bgColor, borderColor } = config[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'pointer-events-auto rounded-2xl backdrop-blur-xl border shadow-xl p-4',
        darkMode ? 'bg-white/10 border-white/10' : 'bg-white/90 border-gray-200',
        bgColor,
        borderColor
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 w-6 h-6', iconColor)}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold mb-1', darkMode ? 'text-white' : 'text-gray-900')}>
            {toast.title}
          </p>
          {toast.description && (
            <p className={cn('text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={cn(
                'mt-2 text-xs font-medium underline',
                darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-1 rounded-lg transition',
            darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'
          )}
        >
          <X className={cn('w-4 h-4', darkMode ? 'text-gray-400' : 'text-gray-600')} />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={cn(
            'absolute bottom-0 left-0 h-1 rounded-b-2xl',
            toast.type === 'success' && 'bg-green-500',
            toast.type === 'error' && 'bg-red-500',
            toast.type === 'warning' && 'bg-yellow-500',
            toast.type === 'info' && 'bg-blue-500'
          )}
        />
      )}
    </motion.div>
  );
}

/**
 * Helper hook for showing toasts
 *
 * Example usage:
 * const toast = useToast();
 * toast.success('Event saved!', 'You can find it in your saved events.');
 * toast.error('Failed to save', 'Please try again.');
 */
export function showToast() {
  const toast = useToast();
  return toast;
}
