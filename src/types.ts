import type { z } from 'zod';
import type {
  ApiErrorBodySchema,
  UserSchema,
  WebhookListSchema,
  WebhookSchema,
} from './api/schemas';

export type User = z.infer<typeof UserSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
export type WebhookList = z.infer<typeof WebhookListSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
