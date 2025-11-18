import { motion } from 'framer-motion';

type ChatErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function ChatError({ message, onRetry }: ChatErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between rounded-[24px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-red-200/50 px-3 py-1 text-xs uppercase tracking-[0.3em] text-red-100 hover:border-red-100"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}
