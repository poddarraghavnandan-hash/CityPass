#!/usr/bin/env tsx

/**
 * Interactive Vercel Environment Setup Script
 * Helps set up environment variables for Vercel deployment
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENV_FILE = path.join(process.cwd(), '.env');

interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  isPublic?: boolean;
}

const ENV_VARS: EnvVar[] = [
  // Database
  { key: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
  { key: 'SUPABASE_URL', description: 'Supabase project URL', required: true },
  { key: 'SUPABASE_ANON_KEY', description: 'Supabase anonymous key', required: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key', required: true },

  // Typesense
  { key: 'TYPESENSE_HOST', description: 'Typesense cloud host', required: true },
  { key: 'TYPESENSE_PORT', description: 'Typesense port (usually 443)', required: true },
  { key: 'TYPESENSE_PROTOCOL', description: 'Typesense protocol (https)', required: true },
  { key: 'TYPESENSE_API_KEY', description: 'Typesense API key', required: true },

  // AI/LLM
  { key: 'OPENAI_API_KEY', description: 'OpenAI API key', required: true },
  { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', required: false },
  { key: 'LLM_PROVIDER', description: 'LLM provider (auto/openai/anthropic)', required: true },

  // Qdrant
  { key: 'QDRANT_URL', description: 'Qdrant cloud URL', required: true },
  { key: 'QDRANT_API_KEY', description: 'Qdrant API key', required: true },

  // Neo4j
  { key: 'NEO4J_URI', description: 'Neo4j Aura URI', required: true },
  { key: 'NEO4J_USERNAME', description: 'Neo4j username', required: true },
  { key: 'NEO4J_PASSWORD', description: 'Neo4j password', required: true },
  { key: 'NEO4J_DATABASE', description: 'Neo4j database name', required: true },

  // NextAuth
  { key: 'NEXTAUTH_URL', description: 'Production URL', required: true },
  { key: 'NEXTAUTH_SECRET', description: 'NextAuth secret (generate new)', required: true },

  // Mapbox
  { key: 'MAPBOX_API_KEY', description: 'Mapbox API key', required: true },

  // Public variables
  { key: 'NEXT_PUBLIC_API_URL', description: 'Public API URL', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_POSTHOG_KEY', description: 'PostHog key', required: false, isPublic: true },
  { key: 'NEXT_PUBLIC_POSTHOG_HOST', description: 'PostHog host', required: false, isPublic: true },
];

function loadEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('⚠️  No .env file found. Please create one first.');
    return {};
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value;
      }
    }
  });

  return envVars;
}

function setVercelEnv(key: string, value: string, environment: string = 'production') {
  try {
    console.log(`  Setting ${key}...`);
    execSync(`vercel env add ${key} ${environment} --force`, {
      input: value + '\n',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`  ✅ ${key} set`);
  } catch (error: any) {
    console.error(`  ❌ Failed to set ${key}: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Vercel Environment Setup\n');

  // Check if vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch {
    console.log('❌ Vercel CLI not found. Install it with:');
    console.log('   npm i -g vercel\n');
    process.exit(1);
  }

  // Load environment variables from .env
  console.log('📄 Loading environment variables from .env...\n');
  const envVars = loadEnvFile();

  if (Object.keys(envVars).length === 0) {
    console.log('❌ No environment variables found in .env file');
    process.exit(1);
  }

  // Check which environment to target
  console.log('📋 Environment Variables to Set:\n');

  const missingRequired: string[] = [];
  const foundVars: string[] = [];

  ENV_VARS.forEach((envVar) => {
    const value = envVars[envVar.key];
    if (!value && envVar.required) {
      missingRequired.push(envVar.key);
    } else if (value) {
      foundVars.push(envVar.key);
      const preview = value.length > 50 ? value.substring(0, 47) + '...' : value;
      console.log(`  ✓ ${envVar.key}: ${preview}`);
    }
  });

  console.log('');

  if (missingRequired.length > 0) {
    console.log('⚠️  Missing required environment variables:');
    missingRequired.forEach((key) => console.log(`  - ${key}`));
    console.log('\nPlease update your .env file before continuing.\n');
    process.exit(1);
  }

  console.log(`\n✅ Found ${foundVars.length} environment variables`);
  console.log('\n🔧 Setting environment variables in Vercel...\n');

  // Set each environment variable
  for (const envVar of ENV_VARS) {
    const value = envVars[envVar.key];
    if (value) {
      setVercelEnv(envVar.key, value, 'production');
    }
  }

  console.log('\n✅ Vercel environment setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Verify variables in Vercel dashboard');
  console.log('  2. Deploy with: vercel --prod');
  console.log('  3. Run database migrations on production DB\n');
}

main().catch(console.error);
