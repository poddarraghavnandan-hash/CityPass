import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type ChatHistoryProps = {
  messages: ChatMessage[];
};

export function ChatHistory({ messages }: ChatHistoryProps) {
  if (!messages.length) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              message.role === 'assistant'
                ? 'bg-white/8 text-white border border-white/10 shadow-[0_10px_50px_rgba(77,123,255,0.25)]'
                : 'ml-auto bg-white text-black'
            )}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{message.role === 'assistant' ? 'CityLens' : 'You'}</p>
            <p className="text-[15px]">{message.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
