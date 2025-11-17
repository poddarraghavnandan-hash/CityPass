'use client';

import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/lib/chat/speech';
import { Mic, Square } from 'lucide-react';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  onError: (error: Error) => void;
}

export function MicButton({ onTranscript, onError }: MicButtonProps) {
  const { isRecording, toggleRecording } = useSpeechRecognition({
    onTranscription: onTranscript,
    onError,
  });

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'secondary'}
      onClick={toggleRecording}
      className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
      aria-pressed={isRecording}
    >
      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </Button>
  );
}
