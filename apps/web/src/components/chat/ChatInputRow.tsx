import { ChatInput } from './ChatInput';
import type { IntentionTokens } from '@citypass/types';

type ChatInputRowProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicResult: (value: string) => void;
  onMicError: (error: Error) => void;
  disabled?: boolean;
  intention?: IntentionTokens | null;
};

export function ChatInputRow({ value, onChange, onSubmit, onMicResult, onMicError, disabled }: ChatInputRowProps) {
  return (
    <div className="sticky bottom-6 z-20 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <ChatInput
        inline
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onMicResult={onMicResult}
        onMicError={onMicError}
        disabled={disabled}
      />
    </div>
  );
}
