# Frontend → Learning Loop

This doc explains how the web app (Next.js App Router + TS + Tailwind + shadcn) talks to the self-learning agentic backend.

## Surfaces
- `/chat`: ask → plan → slates (Best/Wildcard/Close & Easy)
- `/feed`: story cards from `/api/lens/recommend`
- `/profile` + `/onboarding`: taste signals (mood, radius, budget, social proof)

## Event endpoint
- Frontend batches events to `POST /api/client-log`
- Backend stores into `event_log` (consumed by learner/bandits)

### Event types
- `query`: user intent submitted (source: chat or feed filters)
- `slate_impression`: a slate or feed rail rendered (ordered `eventIds`, `slateLabel`)
- `card_view`: card visible or modal opened (`position`, `viewType`)
- `click_route`: route/map action
- `click_book`: booking / external
- `save`: save/favorite
- `hide`: not interested
- `reask`: follow-up query referencing previous `traceId`
- `error`: surfaced error with `message`
- `profile_update`: profile sliders/toggles saved
- `onboarding_update`: onboarding step values saved

### Payload shape (common fields)
- `traceId` (from agent responses when available)
- `slateLabel` (e.g., `best`, `wildcard`, `close_and_easy`, `feed_primary`)
- `eventId` or `eventIds`
- `position` (within slate/feed)
- `intention` (or subset: `{ mood, distanceKm, budget, companions }`)
- `screen`: `chat|feed|profile|onboarding|investors|landing`

### Example payloads
```json
{ "type": "query", "payload": { "screen": "chat", "traceId": "abc", "freeText": "late night jazz", "intention": {"mood":"electric","distanceKm":6,"budget":"casual"} } }

{ "type": "slate_impression", "payload": { "screen":"chat", "traceId":"abc", "slateLabel":"best", "eventIds":["e1","e2","e3"], "position":0 } }

{ "type": "card_view", "payload": { "screen":"feed", "traceId":"xyz", "eventId":"e7", "position":4 } }

{ "type": "profile_update", "payload": { "screen":"profile", "mood":"calm", "distanceKm":8, "budget":"splurge", "socialProof":true } }
```

### Adding a new event
1. Use `logClientEvent(type, payload)` from `apps/web/src/lib/analytics/logClientEvent.ts`.
2. Include `traceId` if backend returned one; otherwise omit.
3. Add minimal identifying info (`eventId`, `slateLabel`, `position`, `screen`).
4. Handle errors silently (helper already catches).

### Privacy
- Do not include sensitive PII; only use `userId` when already available from session.
- Intention snapshots should stay high level (mood, distance, budget, time window).

## How traceId flows
- Agent responses from `/api/plan` and `/api/lens/recommend` include `traceId`.
- UI stores it per interaction and echoes it in all subsequent logs (impressions, clicks, errors, reasks) so backend can link user behavior to the exact graph run.

## Frontend contracts per surface
- Chat: log `query` on submit; `slate_impression` when slates render; card actions log click/save/hide; re-asks log `reask` with previous `traceId`.
- Feed: log `slate_impression` on load with feed order; `card_view` via IntersectionObserver; actions log as above; filter changes log `query` with new intention-like state.
- Profile/Onboarding: on change/save, post prefs and log `profile_update` or `onboarding_update` with values.
