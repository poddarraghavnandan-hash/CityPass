'use client';

import { useSpeechRecognition } from '@/lib/chat/speech';
import { cn } from '@/lib/utils';

type MicOrbProps = {
  onTranscript: (text: string) => void;
  onError: (error: Error) => void;
};

export function MicOrb({ onTranscript, onError }: MicOrbProps) {
  const { isRecording, toggleRecording } = useSpeechRecognition({
    onTranscription: onTranscript,
    onError,
  });

  return (
    <button
      type="button"
      onClick={toggleRecording}
      className={cn(
        'relative flex h-16 w-16 items-center justify-center rounded-full border border-white/30 text-white transition hover:shadow-[0_0_40px_rgba(77,123,255,0.4)]',
        isRecording ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-[0_0_60px_rgba(77,123,255,0.6)]' : 'bg-white/5'
      )}
      aria-pressed={isRecording}
    >
      <div
        className={cn(
          'absolute inset-2 rounded-full border border-white/20',
          isRecording && 'animate-ping border-blue-500/60'
        )}
      />
      <span className="relative text-lg">{isRecording ? '■' : '🎙️'}</span>
    </button>
  );
}
