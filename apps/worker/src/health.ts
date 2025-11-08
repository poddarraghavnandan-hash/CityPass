/**
 * Worker Health Check Endpoint
 * Simple HTTP server for health checks
 */

import * as http from 'http';
import { prisma } from '@citypass/db';

const PORT = process.env.PORT || 3003;

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          service: 'worker',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        })
      );
    } catch (error) {
      console.error('Health check failed:', error);

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: false,
          service: 'worker',
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        })
      );
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

export function startHealthServer() {
  server.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
  });
}

export function stopHealthServer() {
  server.close();
}
