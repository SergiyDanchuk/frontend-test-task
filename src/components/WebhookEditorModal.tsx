import type { Webhook } from '../types';
import type { FormEvent } from 'react';

interface WebhookEditorModalProps {
  open: boolean;
  targetId: string | null;
  webhook: Webhook | null;
  loading: boolean;
  saving: boolean;
  errors: Record<string, string>;
  error: string;
  onChange: (webhook: Webhook) => void;
  onClose: () => void;
  onRetry: (id: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}

export function WebhookEditorModal({
  open,
  targetId,
  webhook,
  loading,
  saving,
  errors,
  error,
  onChange,
  onClose,
  onRetry,
  onSave,
}: WebhookEditorModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">ВЕБХУК</span>
            <h2 id="edit-title">Редагувати вебхук</h2>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="Закрити"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="modal-loading">
            <span className="spinner" />
            Завантажуємо дані…
          </div>
        )}

        {!loading && webhook && (
          <form className="edit-form" onSubmit={onSave} noValidate>
            <label htmlFor="webhook-name">Назва</label>

            <input
              id="webhook-name"
              value={webhook.name}
              onChange={(event) =>
                onChange({ ...webhook, name: event.target.value })
              }
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'webhook-name-error' : undefined}
            />

            {errors.name && (
              <span className="field-error" id="webhook-name-error">
                {errors.name}
              </span>
            )}

            <label htmlFor="webhook-url">URL</label>

            <input
              id="webhook-url"
              type="url"
              value={webhook.url}
              onChange={(event) =>
                onChange({ ...webhook, url: event.target.value })
              }
              aria-invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? 'webhook-url-error' : undefined}
            />

            {errors.url && (
              <span className="field-error" id="webhook-url-error">
                {errors.url}
              </span>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-button" type="button" onClick={onClose}>
                Скасувати
              </button>
              <button className="submit-button" type="submit" disabled={saving}>
                {saving ? 'Зберігаємо…' : 'Зберегти'}
              </button>
            </div>
          </form>
        )}

        {!loading && !webhook && (
          <div className="modal-load-error" role="alert">
            {error}
            <button type="button" onClick={() => targetId && onRetry(targetId)}>
              Повторити
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
