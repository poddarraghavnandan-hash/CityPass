import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

export function MessageBubbles({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            className={`max-w-[80%] text-sm px-4 py-3 rounded-2xl shadow ${
              message.role === 'user'
                ? 'bg-white text-black ml-auto rounded-br-sm'
                : 'bg-white/10 text-white rounded-bl-sm'
            }`}
          >
            <p>{message.text}</p>
            {message.meta && (
              <span className="block text-xs text-white/60 mt-1">{message.meta}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
