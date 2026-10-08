import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const TestResponseSchema = z.object({ path: z.string(), ok: z.boolean() });

describe('request auth retry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    localStorage.clear();
  });

  it('shares one rotate for two parallel 401 responses and retries both requests successfully', async () => {
    localStorage.setItem(
      'webhook-manager.fingerprint',
      '0123456789abcdef0123456789abcdef',
    );

    const counts = new Map<string, number>();
    let rotateCount = 0;

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), window.location.origin);
        const path = url.pathname.replace(/^\//, '');
        counts.set(path, (counts.get(path) ?? 0) + 1);

        if (path === 'csrf') {
          return new Response(null, {
            status: 204,
            headers: { 'X-CSRF-TOKEN': 'test-csrf' },
          });
        }

        if (path === 'auth/token/rotate') {
          rotateCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return new Response(null, { status: 200 });
        }

        if (path === 'v1/first' || path === 'v1/second') {
          if (counts.get(path) === 1)
            return new Response(null, { status: 401 });
          return Response.json({ path, ok: true });
        }
        throw new Error(`Unexpected request: ${path} ${init?.method ?? 'GET'}`);
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const { request } = await import('./http');
    const [first, second] = await Promise.all([
      request('v1/first', TestResponseSchema),
      request('v1/second', TestResponseSchema),
    ]);

    expect(first).toEqual({ path: 'v1/first', ok: true });
    expect(second).toEqual({ path: 'v1/second', ok: true });

    expect(rotateCount).toBe(1);
    expect(counts.get('csrf')).toBe(1);
    expect(counts.get('v1/first')).toBe(2);
    expect(counts.get('v1/second')).toBe(2);
  });

  it('rejects a successful response that does not match its runtime schema', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(
        String(input),
        window.location.origin,
      ).pathname.replace(/^\//, '');
      if (path === 'csrf') {
        return new Response(null, {
          status: 204,
          headers: { 'X-CSRF-TOKEN': 'test-csrf' },
        });
      }

      return Response.json({ path: 'v1/invalid', ok: 'not-a-boolean' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { ApiContractError, request } = await import('./http');
    await expect(
      request('v1/invalid', TestResponseSchema),
    ).rejects.toBeInstanceOf(ApiContractError);
  });
});
