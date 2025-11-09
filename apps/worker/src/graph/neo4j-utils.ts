/**
 * Neo4j utilities for worker jobs
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';

let driver: Driver | null = null;

export function initializeGraphDB(): Driver {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const username = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

  return driver;
}

export async function executeCypher<T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const driver = initializeGraphDB();
  let session: Session | null = null;

  try {
    session = driver.session();
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject() as T);
  } finally {
    if (session) {
      await session.close();
    }
  }
}

export async function closeGraphDB(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
