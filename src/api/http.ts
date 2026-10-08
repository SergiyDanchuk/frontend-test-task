import { z } from 'zod';
import {
  ApiErrorBodySchema,
  DeviceSessionTokenResponseSchema,
} from './schemas';
import type { ApiErrorBody } from '../types';

const API_URL = '/';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiContractError extends Error {
  constructor(readonly endpoint: string) {
    super(`The API returned an invalid response for ${endpoint}`);
    this.name = 'ApiContractError';
  }
}

let csrfToken: string | null = null;
let csrfRequest: Promise<void> | null = null;
let rotateInFlight: Promise<void> | null = null;
let onUnauthorized: (() => void) | null = null;
let authGeneration = 0;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function loadCsrfToken(force = false): Promise<void> {
  if (csrfToken && !force) return;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetch(`${API_URL}csrf`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok)
        throw new ApiError('Не вдалося отримати CSRF-токен', response.status);

      const token = response.headers.get('X-CSRF-TOKEN');
      if (!token) throw new Error('Сервер не надав CSRF-токен');

      csrfToken = token;
    })().finally(() => {
      csrfRequest = null;
    });
  }
  return csrfRequest;
}

function getCsrfToken(): string {
  if (!csrfToken) throw new Error('CSRF-токен відсутній');
  return csrfToken;
}

function fingerprint(): string {
  const key = 'webhook-manager.fingerprint';
  let value = localStorage.getItem(key);
  if (!value || !/^[a-f0-9]{32}$/.test(value)) {
    value = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    localStorage.setItem(key, value);
  }
  return value;
}

async function readError(
  response: Response,
): Promise<ApiErrorBody | undefined> {
  try {
    const result = ApiErrorBodySchema.safeParse(await response.json());
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  endpoint: string,
): Promise<T> {
  let payload: unknown;
  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch {
      throw new ApiContractError(endpoint);
    }
  }
  const result = schema.safeParse(payload);
  if (!result.success) throw new ApiContractError(endpoint);
  return result.data;
}

async function apiFetch(
  path: string,
  init: RequestInit,
  retryCsrf = true,
): Promise<Response> {
  await loadCsrfToken();
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (['POST', 'PUT'].includes((init.method ?? 'GET').toUpperCase())) {
    headers.set('X-CSRF-TOKEN', getCsrfToken());
  }
  const response = await fetch(`${API_URL}${path.replace(/^\//, '')}`, {
    ...init,
    headers,
  });

  if (response.status === 419 && retryCsrf) {
    await loadCsrfToken(true);
    return apiFetch(path, init, false);
  }
  return response;
}

async function rotate(): Promise<void> {
  if (!rotateInFlight) {
    rotateInFlight = (async () => {
      const response = await apiFetch('auth/token/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: fingerprint() }),
      });
      if (!response.ok)
        throw new ApiError(
          'Сесію завершено',
          response.status,
          await readError(response),
        );
      authGeneration += 1;
    })().finally(() => {
      rotateInFlight = null;
    });
  }
  return rotateInFlight;
}

interface RequestOptions extends RequestInit {
  retryAuth?: boolean;
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { retryAuth = true, ...init } = options;
  const requestGeneration = authGeneration;
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');

  const response = await apiFetch(path, { ...init, headers });

  if (response.status === 401 && retryAuth && path !== 'auth/token/rotate') {
    if (requestGeneration === authGeneration) {
      try {
        await rotate();
      } catch {
        onUnauthorized?.();
        throw new ApiError('Сесію завершено', 401);
      }
    }

    try {
      return await request(path, schema, { ...options, retryAuth: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onUnauthorized?.();
      throw error;
    }
  }

  if (!response.ok)
    throw new ApiError(
      `Помилка запиту (${response.status})`,
      response.status,
      await readError(response),
    );
  return parseResponse(response, schema, path);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await apiFetch('auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': 'frontend-test-task',
    },
    body: JSON.stringify({ email, password, fingerprint: fingerprint() }),
  });

  if (!response.ok)
    throw new ApiError(
      'Не вдалося увійти',
      response.status,
      await readError(response),
    );
  const { device_session_token } = await parseResponse(
    response,
    DeviceSessionTokenResponseSchema,
    'auth/login',
  );

  const issue = await apiFetch('auth/token/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_session_token, fingerprint: fingerprint() }),
  });

  if (!issue.ok)
    throw new ApiError(
      'Не вдалося розпочати сесію',
      issue.status,
      await readError(issue),
    );
  authGeneration += 1;
}

export async function revokeSession(): Promise<void> {
  try {
    await request('auth/token/revoke', z.undefined(), {
      method: 'POST',
      body: JSON.stringify({ fingerprint: fingerprint() }),
      retryAuth: false,
    });
  } finally {
    csrfToken = null;
    authGeneration += 1;
  }
}
