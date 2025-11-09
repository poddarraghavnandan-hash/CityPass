Baseline screenshots live here. Regenerate them with:

CITYLENS_UPDATE_SNAPSHOTS=true CITYLENS_TEST_BASE_URL=http://localhost:3000 \
STAGING_CITY=New_York STAGING_STABLE_EVENT_IDS=id1,id2 pnpm --filter @citypass/web test -- citylens.spec.ts
