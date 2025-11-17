# CityPass Web Application Test Suite

## Overview

This test suite provides comprehensive coverage for the redesigned CityPass UI, ensuring all components work correctly with the new interface and backend integration.

## Test Structure

```
__tests__/
├── components/          # UI component unit tests
│   ├── MicOrb.test.tsx
│   ├── ReasonChips.test.tsx
│   ├── ChatMessageList.test.tsx
│   └── SlateCards.test.tsx
├── integration/         # Integration tests
│   └── chat-ui-flow.test.ts
├── api-integration.test.ts
├── categories.test.ts
└── external-apis.test.ts
```

## New UI Component Tests

### MicOrb Component (`components/MicOrb.test.tsx`)

Tests the voice input microphone orb component with glowing effects and recording states.

**Test Coverage:**
- ✅ Visual states (inactive/recording)
- ✅ Gradient backgrounds and glow effects
- ✅ Click interactions and state toggling
- ✅ Accessibility (ARIA attributes, keyboard navigation)
- ✅ Callback handling (transcript, errors)
- ✅ Animation effects (ping animation)
- ✅ Styling (dimensions, shapes, borders)

**Key Behaviors:**
- Shows microphone emoji (🎙️) when inactive
- Shows stop icon (■) when recording
- Applies blue-purple-pink gradient with shadow when active
- Properly announces state to screen readers

### ReasonChips Component (`components/ReasonChips.test.tsx`)

Tests the chips that display recommendation reasons for events.

**Test Coverage:**
- ✅ Rendering with various reason counts
- ✅ Maximum 4 reasons displayed
- ✅ Null/empty state handling
- ✅ CSS styling application
- ✅ Special characters and long text
- ✅ Unique keys for accessibility

**Key Behaviors:**
- Displays up to 4 reasons as pills/chips
- Returns null when no reasons provided
- Handles edge cases (empty strings, special chars)

### ChatMessageList Component (`components/ChatMessageList.test.tsx`)

Tests the chat message display with user and assistant messages.

**Test Coverage:**
- ✅ Empty state with welcome message
- ✅ User vs assistant message rendering
- ✅ Message ordering and metadata
- ✅ Streaming state (ellipsis display)
- ✅ Styling differences by role
- ✅ Semantic HTML (article tags)
- ✅ Accessibility (role labels, ARIA)
- ✅ Edge cases (long text, special chars)

**Key Behaviors:**
- Shows "What mood are you chasing?" welcome when empty
- Displays "CityLens" label for assistant, "You" for user
- Shows "…" ellipsis during streaming
- Different text colors for user (white) vs assistant (white/80)

### SlateCards Component (`components/SlateCards.test.tsx`)

Tests the event slate cards with tabs for Best Fit, Wildcard, and Close & Easy.

**Test Coverage:**
- ✅ Tab rendering and switching
- ✅ Event card content display
- ✅ Action buttons (Route, Save, Calendar, Feed)
- ✅ Time formatting
- ✅ Reason display (max 3)
- ✅ Missing data handling
- ✅ Query parameter generation
- ✅ Styling (active/inactive tabs)
- ✅ Semantic HTML

**Key Behaviors:**
- Three tabs: Best Fit, Wildcard, Close & Easy
- Active tab shows white bg, inactive shows white/10
- Each event shows title, venue, time, description, reasons
- Action buttons: Route (booking URL), Save, Add to Calendar, Open in Feed
- Limits reasons to 3 per card

## Integration Tests

### Chat UI Flow (`integration/chat-ui-flow.test.ts`)

Comprehensive integration tests simulating complete user journeys.

**Test Scenarios:**

#### 1. Complete User Journey
- User opens chat → sees welcome
- User types query → message appears
- System streams response → shows loading
- System sends intention tokens → parsed correctly
- System sends event slates → cards displayed
- Stream completes → final message shown
- User switches tabs → updates view
- User saves event → tracking works

#### 2. Voice Input Flow
- User clicks mic → recording starts
- Voice transcript received → message created
- System processes → response streams

#### 3. Error Handling
- Network errors → error message shown
- Streaming interrupted → graceful recovery
- Timeout handling → user feedback

#### 4. Multi-Turn Conversations
- Follow-up questions → context maintained
- Previous intent preserved → smart defaults

#### 5. Performance & UX
- Input debouncing → prevents spam
- Loading states → appropriate feedback
- Slow network → timeout handling

#### 6. Accessibility
- Screen reader announcements → ARIA live regions
- Keyboard navigation → arrow keys work
- Focus management → proper tab order

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test __tests__/components/MicOrb.test.tsx

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

## Coverage Goals

Current test metrics:
- **119 tests** across 8 test files
- **100% pass rate**
- Coverage targets:
  - Statements: 70%
  - Branches: 60%
  - Functions: 70%
  - Lines: 70%

## Test Patterns

### Component Testing Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  describe('Feature Group', () => {
    it('should behave correctly', () => {
      // Arrange
      const props = { /* ... */ };

      // Act
      const result = renderComponent(props);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Integration Testing Pattern

```typescript
describe('User Flow', () => {
  it('should complete full journey', () => {
    // Initialize state
    let state = initialize();

    // Step 1
    state = performAction(state);
    expect(state).toMatchExpectations();

    // Step 2
    state = performNextAction(state);
    expect(state).toMatchExpectations();
  });
});
```

## Mocking Strategy

### External Dependencies
- `@/lib/chat/speech` → Mocked speech recognition
- API calls → Mocked with vi.fn()
- Next.js router → Mocked navigation

### Component Props
- Callback functions → Tracked with vi.fn()
- Optional props → Tested with both presence and absence

## Alignment with UI Mockup

The test suite is designed based on the UI mockup in `docs/images/ChatGPT Image Nov 16, 2025, 11_24_47 PM.png`:

1. **Soundscape Journey** → MicOrb component with glowing orb
2. **Best Match sections** → SlateCards with tabs
3. **Chat interface** → ChatMessageList for messages
4. **Reason chips** → ReasonChips for event recommendations
5. **Voice input** → MicOrb recording functionality

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Manual workflow dispatch

## Contributing

When adding new UI components:

1. Create unit test file in `__tests__/components/`
2. Follow existing test structure
3. Aim for >80% coverage
4. Add integration tests for user flows
5. Update this README

## Troubleshooting

### Tests failing after dependency update
```bash
# Clear cache and reinstall
rm -rf node_modules .turbo
pnpm install
pnpm test
```

### Mock not working
```bash
# Check vi.mock() is before component import
# Ensure mock path matches actual import
```

### Timeout errors
```bash
# Increase timeout in test
it('slow test', async () => { /* ... */ }, 10000); // 10s timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
