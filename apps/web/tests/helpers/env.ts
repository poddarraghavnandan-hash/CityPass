const DEFAULT_FREEZE = '2025-11-09T21:00:00Z';

const ENV_MAPPINGS: Array<[string, string]> = [
  ['DATABASE_URL', 'STAGING_DATABASE_URL'],
  ['TYPESENSE_HOST', 'STAGING_TYPESENSE_HOST'],
  ['TYPESENSE_PORT', 'STAGING_TYPESENSE_PORT'],
  ['TYPESENSE_PROTOCOL', 'STAGING_TYPESENSE_PROTOCOL'],
  ['TYPESENSE_API_KEY', 'STAGING_TYPESENSE_API_KEY'],
  ['QDRANT_URL', 'STAGING_QDRANT_URL'],
  ['QDRANT_API_KEY', 'STAGING_QDRANT_API_KEY'],
];

export function hydrateStagingEnv(): void {
  ENV_MAPPINGS.forEach(([target, source]) => {
    if (!process.env[target] && process.env[source]) {
      process.env[target] = process.env[source];
    }
  });

  if (!process.env.FREEZE_TIME_ISO) {
    process.env.FREEZE_TIME_ISO = DEFAULT_FREEZE;
  }
}

export function requireEnv(vars: string[], suite: string): boolean {
  const missing = vars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Skipping ${suite} tests – missing env: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

export function getTestBaseUrl(): string | null {
  return process.env.CITYLENS_TEST_BASE_URL || null;
}
