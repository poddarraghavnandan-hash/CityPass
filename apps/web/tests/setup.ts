import { hydrateStagingEnv } from './helpers/env';

hydrateStagingEnv();

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { toMatchImageSnapshot } = require('jest-image-snapshot');
  expect.extend({ toMatchImageSnapshot });
} catch (error) {
  process.env.CITYLENS_SNAPSHOTS_DISABLED = 'true';
  console.warn('jest-image-snapshot unavailable; visual tests will be skipped.');
}
