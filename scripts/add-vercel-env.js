#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', 'vercel-env.txt');
const content = fs.readFileSync(envFile, 'utf-8');

const envVars = [];

// Parse environment variables from the file
content.split('\n').forEach(line => {
  line = line.trim();

  // Skip comments and empty lines
  if (!line || line.startsWith('#')) return;

  // Extract KEY=VALUE pairs
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (match) {
    const [, key, value] = match;

    // Skip placeholder values
    if (
      value.includes('your-') ||
      value.includes('change-me') ||
      value.includes('example.com') ||
      value === 'your-smtp-user' ||
      value === 'your-smtp-password'
    ) {
      console.log(`⏭️  Skipping ${key} (placeholder value)`);
      return;
    }

    envVars.push({ key, value });
  }
});

console.log(`\n📦 Found ${envVars.length} environment variables to add\n`);

// Add each environment variable to Vercel
let successCount = 0;
let errorCount = 0;

for (const { key, value } of envVars) {
  try {
    console.log(`Adding ${key}...`);

    // Use echo to pipe the value to vercel env add
    // The command structure: echo "value" | vercel env add KEY production
    const command = `echo "${value.replace(/"/g, '\\"')}" | vercel --token=NV6pRCdM96cCoorOUPXrd56G env add ${key} production`;

    execSync(command, {
      stdio: 'pipe',
      shell: true,
      cwd: path.join(__dirname, '..')
    });

    console.log(`✅ Added ${key}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to add ${key}:`, error.message);
    errorCount++;
  }
}

console.log(`\n✨ Summary: ${successCount} succeeded, ${errorCount} failed\n`);

if (successCount > 0) {
  console.log('🚀 Environment variables added! You can now redeploy with: vercel --prod');
}
