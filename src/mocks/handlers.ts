import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  IssueTokenRequestSchema,
  LoginRequestSchema,
  RevokeTokenRequestSchema,
  RotateTokenRequestSchema,
  WebhookUpdateRequestSchema,
} from '../api/schemas';

const CSRF = 'fixed-csrf-token';
const EMAIL = 'admin@example.com';
const PASSWORD = 'Password123!';
const API_BASE = import.meta.env.BASE_URL;
const deviceTokens = new Map<string, { fingerprint: string; email: string }>();
let session: {
  fingerprint: string;
  email: string;
  expiresAt: number;
  active: boolean;
} | null = null;
const users = new Map([
  [
    EMAIL,
    {
      id: 1,
      email: EMAIL,
      first_name: 'Alex',
      last_name: 'Morgan',
      name: 'Alex Morgan',
    },
  ],
]);
const webhooks = Array.from({ length: 28 }, (_, index) => ({
  id: String(index + 1),
  name:
    ['Order created', 'Payment received', 'User updated', 'Inventory sync'][
      index % 4
    ] + ` ${index + 1}`,
  url: `https://api.example.com/webhooks/${index + 1}`,
  active: index % 5 !== 0,
  created_at: new Date(Date.UTC(2025, 0, index + 1)).toISOString(),
}));

function error(
  status: number,
  type: string,
  message: string,
  payload?: Record<string, string[]>,
) {
  return HttpResponse.json(
    { error: { type, message, ...(payload ? { payload } : {}) } },
    { status },
  );
}

function validationPayload(issues: z.ZodIssue[]): Record<string, string[]> {
  const payload: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path[0];
    const field = typeof path === 'string' ? path : 'request';

    payload[field] ??= [];
    payload[field].push(issue.message);
  }
  return payload;
}

async function parseBody<T extends z.ZodType>(request: Request, schema: T) {
  try {
    return schema.safeParse(await request.json());
  } catch {
    return schema.safeParse(null);
  }
}

function csrf(request: Request): boolean {
  return request.headers.get('X-CSRF-TOKEN') === CSRF;
}

function authorized(): boolean {
  return Boolean(session?.active && Date.now() < session.expiresAt);
}

function unauthorized() {
  return error(401, 'AuthenticationException', 'Unauthenticated.');
}

export const handlers = [
  http.get(
    `${API_BASE}csrf`,
    () =>
      new HttpResponse(null, {
        status: 204,
        headers: { 'X-CSRF-TOKEN': CSRF },
      }),
  ),
  http.post(`${API_BASE}auth/login`, async ({ request }) => {
    if (!csrf(request))
      return error(419, 'TokenMismatchException', 'CSRF token mismatch.');

    if (!request.headers.get('X-Captcha-Token'))
      return error(422, 'ValidationException', 'The given data was invalid.', {
        captcha: ['The captcha token is required.'],
      });

    const parsed = await parseBody(request, LoginRequestSchema);

    if (!parsed.success)
      return error(
        422,
        'ValidationException',
        'The given data was invalid.',
        validationPayload(parsed.error.issues),
      );

    if (parsed.data.email !== EMAIL || parsed.data.password !== PASSWORD) {
      return error(422, 'ValidationException', 'The given data was invalid.', {
        password: ['The provided credentials are incorrect.'],
      });
    }

    const token = crypto.randomUUID();
    deviceTokens.set(token, {
      fingerprint: parsed.data.fingerprint,
      email: EMAIL,
    });
    return HttpResponse.json({ device_session_token: token });
  }),
  http.post(`${API_BASE}auth/token/issue`, async ({ request }) => {
    if (!csrf(request))
      return error(419, 'TokenMismatchException', 'CSRF token mismatch.');

    const parsed = await parseBody(request, IssueTokenRequestSchema);

    if (!parsed.success)
      return error(
        422,
        'ValidationException',
        'The given data was invalid.',
        validationPayload(parsed.error.issues),
      );

    const token = deviceTokens.get(parsed.data.device_session_token);

    if (!token || token.fingerprint !== parsed.data.fingerprint)
      return error(422, 'ValidationException', 'The given data was invalid.', {
        device_session_token: ['The device session token is invalid.'],
      });

    deviceTokens.delete(parsed.data.device_session_token);
    session = { ...token, expiresAt: Date.now() + 30_000, active: true };
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${API_BASE}auth/token/rotate`, async ({ request }) => {
    if (!csrf(request))
      return error(419, 'TokenMismatchException', 'CSRF token mismatch.');

    const parsed = await parseBody(request, RotateTokenRequestSchema);

    if (
      !parsed.success ||
      !session?.active ||
      session.fingerprint !== parsed.data.fingerprint
    )
      return error(400, 'BadRequestException', 'No active session to rotate.');

    session.expiresAt = Date.now() + 30_000;
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${API_BASE}auth/token/revoke`, async ({ request }) => {
    if (!csrf(request))
      return error(419, 'TokenMismatchException', 'CSRF token mismatch.');

    const parsed = await parseBody(request, RevokeTokenRequestSchema);

    if (parsed.success && session?.fingerprint === parsed.data.fingerprint)
      session.active = false;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API_BASE}v1/me`, () => {
    if (!authorized() || !session) return unauthorized();
    const user = users.get(session.email);
    return user ? HttpResponse.json(user) : unauthorized();
  }),
  http.get(`${API_BASE}v1/webhooks`, ({ request }) => {
    if (!authorized()) return unauthorized();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit') ?? 10)),
    );

    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase();
    const filtered = webhooks.filter((item) =>
      item.name.toLocaleLowerCase().includes(search),
    );
    const last = Math.max(1, Math.ceil(filtered.length / limit));
    const data = filtered.slice((page - 1) * limit, page * limit);
    return HttpResponse.json({
      data,
      paging: {
        pages: { current: page, last },
        results: { total: filtered.length, limitation: limit },
      },
    });
  }),
  http.get(`${API_BASE}v1/webhooks/:id`, ({ params }) => {
    if (!authorized()) return unauthorized();
    const webhook = webhooks.find((item) => item.id === params.id);

    return webhook
      ? HttpResponse.json(webhook)
      : error(404, 'NotFoundException', 'Webhook not found.');
  }),
  http.put(`${API_BASE}v1/webhooks/:id`, async ({ request, params }) => {
    if (!csrf(request))
      return error(419, 'TokenMismatchException', 'CSRF token mismatch.');
    if (!authorized()) return unauthorized();

    const webhook = webhooks.find((item) => item.id === params.id);

    if (!webhook) return error(404, 'NotFoundException', 'Webhook not found.');

    const parsed = await parseBody(request, WebhookUpdateRequestSchema);

    if (!parsed.success)
      return error(
        422,
        'ValidationException',
        'The given data was invalid.',
        validationPayload(parsed.error.issues),
      );

    webhook.name = parsed.data.name;
    webhook.url = parsed.data.url;
    return HttpResponse.json(webhook);
  }),
];
