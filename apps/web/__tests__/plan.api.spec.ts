/**
 * Tests for /api/plan endpoint
 * Validates 3 slates with reasons under 800ms warm
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('/api/plan', () => {
  describe('POST /api/plan', () => {
    it('returns 3 slates with reasons', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            id: 'test-user-1',
            city: 'New York',
          },
          freeText: 'electric vibes tonight',
          tokens: {
            mood: 'electric',
            untilMinutes: 240,
            distanceKm: 10,
            budget: 'casual',
            companions: ['crew'],
          },
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.slates).toBeDefined();
      expect(data.slates.best).toBeDefined();
      expect(data.slates.wildcard).toBeDefined();
      expect(data.slates.closeAndEasy).toBeDefined();
      expect(data.reasons).toBeDefined();
      expect(data.intention).toBeDefined();
    }, 30000); // 30s timeout for first cold start

    it('returns slates under 800ms warm', async () => {
      // Warm-up call
      await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-2', city: 'New York' },
          tokens: { mood: 'calm' },
        }),
      });

      // Actual timed call
      const startTime = Date.now();

      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-2', city: 'New York' },
          tokens: { mood: 'calm' },
        }),
      });

      const latency = Date.now() - startTime;

      expect(response.status).toBe(200);

      const data = await response.json();

      // Server-reported latency should be under 800ms
      expect(data.latencyMs).toBeLessThan(800);

      // Total round-trip should be reasonable (under 1000ms)
      expect(latency).toBeLessThan(1000);
    }, 10000);

    it('includes valid ranked items in slates', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-3', city: 'New York' },
          tokens: { mood: 'social' },
        }),
      });

      const data = await response.json();

      // Best slate
      if (data.slates.best.length > 0) {
        const item = data.slates.best[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('city');
        expect(item).toHaveProperty('fitScore');
        expect(item).toHaveProperty('reasons');
        expect(Array.isArray(item.reasons)).toBe(true);
      }

      // Wildcard slate
      if (data.slates.wildcard.length > 0) {
        const item = data.slates.wildcard[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('fitScore');
      }

      // Close & Easy slate
      if (data.slates.closeAndEasy.length > 0) {
        const item = data.slates.closeAndEasy[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('fitScore');
      }
    }, 15000);

    it('provides execution logs and trace ID', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-4', city: 'New York' },
          tokens: { mood: 'artistic' },
        }),
      });

      const data = await response.json();

      expect(data.logs).toBeDefined();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.traceId).toBeDefined();
      expect(typeof data.traceId).toBe('string');

      // Logs should include all node executions
      const nodeNames = data.logs.map((log: any) => log.node);
      expect(nodeNames).toContain('understand');
      expect(nodeNames).toContain('retrieve');
      expect(nodeNames).toContain('reason');
      expect(nodeNames).toContain('plan');
      expect(nodeNames).toContain('answer');
    }, 15000);

    it('handles missing user gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: { mood: 'grounded' },
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.slates).toBeDefined();
    }, 15000);

    it('handles free text queries', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-5', city: 'New York' },
          freeText: 'I want to see live music tonight',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.slates).toBeDefined();
    }, 15000);

    it('validates request schema', async () => {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invalidField: 'should cause validation error',
        }),
      });

      // Should either succeed with default values or return 400
      expect([200, 400]).toContain(response.status);
    }, 10000);
  });

  describe('GET /api/plan?ics=<eventId>', () => {
    it('returns ICS calendar file', async () => {
      // First, get an event ID from the database
      const planResponse = await fetch(`${API_BASE}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'test-user-6', city: 'New York' },
          tokens: { mood: 'electric' },
        }),
      });

      const planData = await planResponse.json();

      if (planData.slates?.best?.length > 0) {
        const eventId = planData.slates.best[0].id;

        const icsResponse = await fetch(`${API_BASE}/api/plan?ics=${eventId}`);

        expect(icsResponse.status).toBe(200);
        expect(icsResponse.headers.get('content-type')).toContain('text/calendar');

        const icsContent = await icsResponse.text();

        expect(icsContent).toContain('BEGIN:VCALENDAR');
        expect(icsContent).toContain('BEGIN:VEVENT');
        expect(icsContent).toContain('END:VEVENT');
        expect(icsContent).toContain('END:VCALENDAR');
      }
    }, 15000);

    it('returns 400 for missing ics parameter', async () => {
      const response = await fetch(`${API_BASE}/api/plan`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('ics');
    });

    it('returns 404 for non-existent event', async () => {
      const response = await fetch(`${API_BASE}/api/plan?ics=non-existent-id`);

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });
});
