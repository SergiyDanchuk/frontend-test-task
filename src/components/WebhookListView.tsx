import type { WebhookList as WebhookListData } from '../types';

interface WebhookListViewProps {
  accountName: string;
  page: number;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (id: string) => void;
  onRetry: () => void;
  data: WebhookListData | null;
  loading: boolean;
  error: string;
  onLogout: () => void;
}

export function WebhookListView({
  accountName,
  page,
  search,
  onSearchChange,
  onPageChange,
  onEdit,
  onRetry,
  data,
  loading,
  error,
  onLogout,
}: WebhookListViewProps) {
  return (
    <main className="shell">
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Webhook Manager — головна"
        >
          <span className="brand-mark">W</span> Webhook Manager
        </a>
        <button className="text-button" type="button" onClick={onLogout}>
          Вийти
        </button>
      </header>

      <section className="list-page">
        <div className="list-heading">
          <div>
            <span className="eyebrow">ВЕБХУКИ</span>
            <h1>Вебхуки</h1>
            <p>Керуйте кінцевими точками та їхнім станом.</p>
          </div>
          <div className="account-chip">
            <span className="avatar">{accountName.charAt(0)}</span>
            <span>{accountName}</span>
          </div>
        </div>

        <div className="list-toolbar">
          <div className="search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Пошук вебхуків за назвою"
              placeholder="Пошук за назвою…"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <span className="results-count">
            {data ? `${data.paging.results.total} записів` : ''}
          </span>
        </div>

        <div className="table-frame">
          <table>
            <thead>
              <tr>
                <th>НАЗВА</th>
                <th>URL</th>
                <th>АКТИВНІСТЬ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-message">
                      <span className="spinner" />
                      Завантажуємо вебхуки…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-message error-message" role="alert">
                      {error}
                      <button type="button" onClick={onRetry}>
                        Повторити
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && data?.data.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-message">
                      {search
                        ? 'За цим запитом нічого не знайдено.'
                        : 'Вебхуків поки немає.'}
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.data.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className="webhook-name">{webhook.name}</td>
                    <td className="webhook-url">{webhook.url}</td>
                    <td>
                      <span
                        className={`status-badge ${webhook.active ? 'active' : 'inactive'}`}
                      >
                        <span />
                        {webhook.active ? 'Активний' : 'Неактивний'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="edit-button"
                        type="button"
                        onClick={() => onEdit(webhook.id)}
                      >
                        Редагувати
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <span>
            {data && data.paging.results.total > 0
              ? `Сторінка ${data.paging.pages.current} з ${data.paging.pages.last}`
              : ' '}
          </span>
          <div className="pagination">
            <button
              type="button"
              aria-label="Попередня сторінка"
              disabled={loading || page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ←
            </button>
            <span>{page}</span>
            <button
              type="button"
              aria-label="Наступна сторінка"
              disabled={
                loading || (data ? page >= data.paging.pages.last : true)
              }
              onClick={() => onPageChange(page + 1)}
            >
              →
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
