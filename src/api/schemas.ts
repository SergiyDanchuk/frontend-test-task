import { z } from 'zod';

const WebhookUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Expected an HTTP or HTTPS URL');

export const FingerprintSchema = z.string().regex(/^[a-f0-9]{32}$/);

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  fingerprint: FingerprintSchema,
});

export const IssueTokenRequestSchema = z.object({
  device_session_token: z.string().min(1),
  fingerprint: FingerprintSchema,
});

export const RotateTokenRequestSchema = z.object({
  fingerprint: FingerprintSchema,
});

export const RevokeTokenRequestSchema = z.object({
  fingerprint: FingerprintSchema,
});

export const WebhookUpdateRequestSchema = z.object({
  name: z.string().trim().min(1),
  url: WebhookUrlSchema,
});

export const UserSchema = z.object({
  id: z.union([z.number().int(), z.string().min(1)]),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  name: z
    .string()
    .refine((value) => value.trim().length > 0, 'Expected a non-empty name'),
});

export const WebhookSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]).transform(String),
  name: z
    .string()
    .refine((value) => value.trim().length > 0, 'Expected a non-empty name'),
  url: WebhookUrlSchema,
  active: z.boolean(),
  created_at: z.string().min(1),
});

export const WebhookListSchema = z.object({
  data: z.array(WebhookSchema),
  paging: z.object({
    pages: z.object({
      current: z.number().int().positive(),
      last: z.number().int().positive(),
    }),
    results: z.object({
      total: z.number().int().nonnegative(),
      limitation: z.number().int().positive(),
    }),
  }),
});

export const ApiErrorBodySchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    payload: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export const DeviceSessionTokenResponseSchema = z.object({
  device_session_token: z.string().min(1),
});
