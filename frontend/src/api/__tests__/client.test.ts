import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, getAuthHeaders, apiFetch, ApiError } from '../client';

describe('getAuthHeaders', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty object when no token stored', () => {
    expect(getAuthHeaders()).toEqual({});
  });

  it('returns Authorization header when token is present', () => {
    localStorage.setItem('crow_token', 'test-jwt-123');
    expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer test-jwt-123' });
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON when response is ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ hello: 'crow' }),
    } as unknown as Response);

    const result = await apiFetch<{ hello: string }>('/test');
    expect(result).toEqual({ hello: 'crow' });
  });

  it('throws ApiError with status when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Project not found' }),
    } as unknown as Response);

    const err = (await apiFetch('/test').catch(e => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Project not found');
    expect(err.status).toBe(404);
  });

  it('includes Authorization header when token is in localStorage', async () => {
    localStorage.setItem('crow_token', 'my-token');
    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
      capturedHeaders = opts.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        text: async () => '{}',
      } as unknown as Response);
    });

    await apiFetch('/test');
    expect(capturedHeaders['Authorization']).toBe('Bearer my-token');
  });
});
