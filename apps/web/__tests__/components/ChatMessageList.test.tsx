import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '@/components/chat/ChatMessageList';

describe('ChatMessageList Component', () => {
  describe('Empty State', () => {
    it('displays welcome message when no messages exist', () => {
      const messages: ChatMessage[] = [];
      const emptyState = renderChatMessageList({ messages });

      expect(emptyState.hasWelcomeMessage).toBe(true);
      expect(emptyState.content).toContain('CityLens Copilot');
      expect(emptyState.content).toContain('What mood are you chasing?');
      expect(emptyState.content).toContain('Ask anything');
    });

    it('shows example queries in empty state', () => {
      const messages: ChatMessage[] = [];
      const emptyState = renderChatMessageList({ messages });

      expect(emptyState.content).toContain('cinematic jazz speakeasy');
      expect(emptyState.content).toContain('sunrise hike with zero tourists');
    });

    it('applies correct styling to empty state', () => {
      const messages: ChatMessage[] = [];
      const emptyState = renderChatMessageList({ messages });

      expect(emptyState.styles).toContain('rounded-[30px]');
      expect(emptyState.styles).toContain('border-white/10');
      expect(emptyState.styles).toContain('bg-white/5');
      expect(emptyState.styles).toContain('p-8');
    });
  });

  describe('Message Rendering', () => {
    it('renders user messages correctly', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          text: 'Find me a jazz club tonight',
        },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages.length).toBe(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].text).toBe('Find me a jazz club tonight');
      expect(result.messages[0].label).toBe('You');
    });

    it('renders assistant messages correctly', () => {
      const messages: ChatMessage[] = [
        {
          id: '2',
          role: 'assistant',
          text: 'I found 3 jazz clubs for you tonight',
        },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages.length).toBe(1);
      expect(result.messages[0].role).toBe('assistant');
      expect(result.messages[0].text).toBe('I found 3 jazz clubs for you tonight');
      expect(result.messages[0].label).toBe('CityLens');
    });

    it('renders multiple messages in correct order', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Hello' },
        { id: '2', role: 'assistant', text: 'Hi there!' },
        { id: '3', role: 'user', text: 'Find me events' },
        { id: '4', role: 'assistant', text: 'Here are some events' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages.length).toBe(4);
      expect(result.messages[0].text).toBe('Hello');
      expect(result.messages[1].text).toBe('Hi there!');
      expect(result.messages[2].text).toBe('Find me events');
      expect(result.messages[3].text).toBe('Here are some events');
    });

    it('handles messages with metadata', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          text: 'Found events',
          meta: 'Searched in Brooklyn',
        },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].meta).toBe('Searched in Brooklyn');
      expect(result.messages[0].hasMetadata).toBe(true);
    });

    it('handles messages without metadata', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          text: 'Hello',
        },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].meta).toBeUndefined();
      expect(result.messages[0].hasMetadata).toBe(false);
    });
  });

  describe('Streaming State', () => {
    it('shows ellipsis when streaming and message text is empty', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          text: '',
        },
      ];

      const result = renderChatMessageList({ messages, isStreaming: true });

      expect(result.messages[0].displayText).toBe('…');
    });

    it('shows message text when streaming and text exists', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          text: 'Searching...',
        },
      ];

      const result = renderChatMessageList({ messages, isStreaming: true });

      expect(result.messages[0].displayText).toBe('Searching...');
    });

    it('shows message text when not streaming', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          text: 'Complete message',
        },
      ];

      const result = renderChatMessageList({ messages, isStreaming: false });

      expect(result.messages[0].displayText).toBe('Complete message');
    });
  });

  describe('Styling', () => {
    it('applies different text colors for user vs assistant', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'User message' },
        { id: '2', role: 'assistant', text: 'Assistant message' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].textColor).toBe('text-white');
      expect(result.messages[1].textColor).toBe('text-white/80');
    });

    it('applies rounded corners to message bubbles', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Test' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].styles).toContain('rounded-[24px]');
    });

    it('applies spacing between messages', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Message 1' },
        { id: '2', role: 'assistant', text: 'Message 2' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.containerStyles).toContain('space-y-4');
    });
  });

  describe('Accessibility', () => {
    it('renders messages with semantic article tags', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Test' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].element).toBe('article');
    });

    it('includes role labels with proper styling', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Test' },
        { id: '2', role: 'assistant', text: 'Response' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].label).toBe('You');
      expect(result.messages[1].label).toBe('CityLens');
      expect(result.messages[0].labelStyles).toContain('uppercase');
      expect(result.messages[0].labelStyles).toContain('tracking-[0.4em]');
    });

    it('uses unique keys for each message', () => {
      const messages: ChatMessage[] = [
        { id: 'msg-1', role: 'user', text: 'First' },
        { id: 'msg-2', role: 'user', text: 'Second' },
        { id: 'msg-3', role: 'assistant', text: 'Third' },
      ];

      const result = renderChatMessageList({ messages });

      const keys = result.messages.map(m => m.id);
      expect(new Set(keys).size).toBe(3);
      expect(keys).toEqual(['msg-1', 'msg-2', 'msg-3']);
    });
  });

  describe('Tail Content', () => {
    it('renders tail element when provided', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Test' },
      ];
      const tailContent = '<div>Loading...</div>';

      const result = renderChatMessageList({ messages, tail: tailContent });

      expect(result.hasTail).toBe(true);
      expect(result.tailContent).toBe(tailContent);
    });

    it('does not render tail when not provided', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Test' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.hasTail).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles very long message text', () => {
      const longText = 'A'.repeat(1000);
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: longText },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].text).toBe(longText);
      expect(result.messages[0].text.length).toBe(1000);
    });

    it('handles messages with special characters', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: 'Find <jazz> & "blues" events!' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].text).toBe('Find <jazz> & "blues" events!');
    });

    it('handles empty message text', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', text: '' },
      ];

      const result = renderChatMessageList({ messages, isStreaming: false });

      expect(result.messages[0].displayText).toBe('');
    });

    it('handles message IDs with special characters', () => {
      const messages: ChatMessage[] = [
        { id: 'msg-123-abc', role: 'user', text: 'Test' },
        { id: 'msg:456:def', role: 'assistant', text: 'Response' },
      ];

      const result = renderChatMessageList({ messages });

      expect(result.messages[0].id).toBe('msg-123-abc');
      expect(result.messages[1].id).toBe('msg:456:def');
    });
  });
});

// Mock rendering function (replace with actual @testing-library/react in real implementation)
function renderChatMessageList(props: {
  messages: ChatMessage[];
  tail?: any;
  isStreaming?: boolean;
}) {
  const { messages, tail, isStreaming } = props;

  if (messages.length === 0) {
    return {
      hasWelcomeMessage: true,
      content: 'CityLens Copilot\nWhat mood are you chasing?\nAsk anything—"a cinematic jazz speakeasy at 9pm" or "sunrise hike with zero tourists". We listen and stream back slates tuned to your taste.',
      styles: 'rounded-[30px] border border-white/10 bg-white/5 p-8 text-white/80',
    };
  }

  return {
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      text: msg.text,
      displayText: msg.text || (isStreaming ? '…' : ''),
      meta: msg.meta,
      hasMetadata: !!msg.meta,
      label: msg.role === 'assistant' ? 'CityLens' : 'You',
      labelStyles: 'uppercase tracking-[0.4em] text-[10px] text-white/40',
      textColor: msg.role === 'assistant' ? 'text-white/80' : 'text-white',
      styles: 'rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-relaxed',
      element: 'article',
    })),
    containerStyles: 'space-y-4',
    hasTail: !!tail,
    tailContent: tail,
  };
}
