import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, request } from '../api/http';
import { WebhookSchema } from '../api/schemas';
import type { Webhook } from '../types';
import { firstErrorPerField } from '../utils/formErrors';

export function useWebhookEditor(onSaved: () => void) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const loadController = useRef<AbortController | null>(null);

  useEffect(() => () => loadController.current?.abort(), []);

  async function openEditor(id: string) {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;

    setTargetId(id);
    setOpen(true);
    setLoading(true);
    setWebhook(null);
    setErrors({});
    setError('');

    try {
      setWebhook(
        await request(`v1/webhooks/${encodeURIComponent(id)}`, WebhookSchema, {
          signal: controller.signal,
        }),
      );
    } catch {
      if (!controller.signal.aborted)
        setError('Не вдалося завантажити вебхук. Спробуйте ще раз.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function closeEditor() {
    loadController.current?.abort();
    loadController.current = null;
    setOpen(false);
    setLoading(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!webhook) return;

    setSaving(true);
    setErrors({});
    setError('');

    try {
      await request(
        `v1/webhooks/${encodeURIComponent(webhook.id)}`,
        WebhookSchema,
        {
          method: 'PUT',
          body: JSON.stringify({ name: webhook.name, url: webhook.url }),
        },
      );

      setOpen(false);
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        const payload = cause.body?.error.payload ?? {};
        setErrors(firstErrorPerField(payload));
      } else {
        setError('Не вдалося зберегти зміни. Спробуйте ще раз.');
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    targetId,
    webhook,
    setWebhook,
    loading,
    saving,
    errors,
    error,
    openEditor,
    closeEditor,
    save,
  };
}
