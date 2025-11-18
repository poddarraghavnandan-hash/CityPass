import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ChatBubble = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type ChatMessagesProps = {
  messages: ChatBubble[];
};

export function ChatMessages({ messages }: ChatMessagesProps) {
  const reducedMotion = useReducedMotion();
  if (!messages.length) return null;

  return (
    <div className="space-y-3">
      {messages.slice(-2).map((message) => (
        <motion.div
          key={message.id}
          initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
            message.role === 'assistant'
              ? 'bg-white/8 text-white shadow-[0_10px_50px_rgba(77,123,255,0.25)]'
              : 'ml-auto bg-white text-black'
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
            {message.role === 'assistant' ? 'CityLens' : 'You'}
          </p>
          <p>{message.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
