'use client';

import { useEffect, useRef, useState } from 'react';

type SpeechCallbacks = {
  onTranscription: (text: string) => void;
  onError?: (error: Error) => void;
};

export function useSpeechRecognition({ onTranscription, onError }: SpeechCallbacks) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.(new Error('Speech recognition not supported in this browser.'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      onError?.(new Error(event?.error || 'Mic error'));
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        onTranscription(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onError, onTranscription]);

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      onError?.(new Error('Speech recognition unavailable.'));
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  return {
    isRecording,
    toggleRecording,
  };
}
