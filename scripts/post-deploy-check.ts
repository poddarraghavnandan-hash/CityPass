/**
 * Post-Deployment Health Check
 * Probes all critical services to verify deployment success
 */

import * as https from 'https';
import * as http from 'http';

interface HealthCheckResult {
  service: string;
  url: string;
  status: 'ok' | 'failed';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

async function checkEndpoint(service: string, url: string): Promise<HealthCheckResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode || 0;

      resolve({
        service,
        url,
        status: statusCode >= 200 && statusCode < 300 ? 'ok' : 'failed',
        statusCode,
        responseTime,
      });

      // Consume response data to free up memory
      res.resume();
    });

    req.on('error', (error) => {
      resolve({
        service,
        url,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service,
        url,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: 'Request timeout',
      });
    });
  });
}

async function main() {
  console.log('🏥 Running post-deployment health checks...\n');

  const checks: Array<{ service: string; url: string }> = [
    {
      service: 'Web App',
      url: process.env.WEB_URL ? `${process.env.WEB_URL}/api/health` : 'http://localhost:3000/api/health',
    },
    {
      service: 'Worker',
      url: process.env.WORKER_URL ? `${process.env.WORKER_URL}/health` : 'http://localhost:3003/health',
    },
  ];

  // Add Typesense check if credentials are available
  if (process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY) {
    const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
    const port = process.env.TYPESENSE_PORT || '443';
    checks.push({
      service: 'Typesense',
      url: `${protocol}://${process.env.TYPESENSE_HOST}:${port}/health`,
    });
  }

  // Add Qdrant check if URL is available
  if (process.env.QDRANT_URL) {
    checks.push({
      service: 'Qdrant',
      url: `${process.env.QDRANT_URL}/collections`,
    });
  }

  const results: HealthCheckResult[] = [];

  for (const check of checks) {
    process.stdout.write(`Checking ${check.service}... `);
    const result = await checkEndpoint(check.service, check.url);
    results.push(result);

    if (result.status === 'ok') {
      console.log(`✅ (${result.responseTime}ms)`);
    } else {
      console.log(`❌ ${result.error || `Status: ${result.statusCode}`}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('═'.repeat(60));

  results.forEach((result) => {
    const icon = result.status === 'ok' ? '✅' : '❌';
    const status = result.status === 'ok' ? 'HEALTHY' : 'FAILED';
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';

    console.log(`${icon} ${result.service.padEnd(15)} ${status.padEnd(10)} ${time}`);
  });

  console.log('═'.repeat(60));

  const failedChecks = results.filter((r) => r.status === 'failed');

  if (failedChecks.length === 0) {
    console.log('\n🎉 All systems operational!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failedChecks.length} service(s) failed health check:`);
    failedChecks.forEach((result) => {
      console.log(`   - ${result.service}: ${result.error || `HTTP ${result.statusCode}`}`);
    });
    process.exit(1);
  }
}

main();
