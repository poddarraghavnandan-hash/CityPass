# Experiments & Bandits in Slates

The backend composes slates (Best / Wildcard / Close & Easy) with a bandit + Ranker. The frontend is agnostic but **must log impressions and clicks** by `slateLabel` and position to keep metrics valid.

## Core rules
- Always log `slate_impression` with ordered `eventIds` and `slateLabel` when a slate/feed renders.
- Always log user actions (`card_view`, `click_route`, `click_book`, `save`, `hide`) with `traceId`, `slateLabel`, and `position`.
- Do not suppress events for missing optional fields; send what you have.

## A/B testing guidance
- Layout experiments: keep `slateLabel` stable so metrics are comparable; use UI flags (e.g., `data-experiment="slate-layout-v2").
- Visual indicators: if an experiment is running, you may add a subtle badge (e.g., “experimental”) in dev/staging; avoid distracting users in prod.
- Do not change action semantics between variants (route/book/save/hide must remain consistent).

## Example logging flows
- Chat:
  - `query` when user submits prompt.
  - `slate_impression` for each slate rendered with positions.
  - `card_view` when a card enters viewport or modal opens.
  - Clicks/saves/hides logged with same `traceId`.
- Feed:
  - `slate_impression` for the primary feed list (`slateLabel: feed_primary`).
  - `card_view` on scroll via IntersectionObserver.
  - Actions log as above.
- Profile/Onboarding:
  - `profile_update` / `onboarding_update` when sliders/toggles persist; useful as bandit context features.

## When adding new experiments
- Add a short key (e.g., `feed_ab_v3`) and pass it in payloads as `experimentKey` so backend can bucket events.
- Keep control vs variant UIs as consistent as possible except for the tested element.

## Metrics integrity
- Ensure each impression includes position; clicks without prior impressions reduce measurement quality.
- Avoid batching across different traceIds; keep batches small and per-screen.
