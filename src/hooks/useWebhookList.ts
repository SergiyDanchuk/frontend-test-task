import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, request } from '../api/http';
import { WebhookListSchema } from '../api/schemas';
import type { WebhookList } from '../types';

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page') ?? 1);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('search') ?? '',
  };
}

function writeLocation(page: number, search: string, replace = false) {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set('search', search);
  const url = `${window.location.pathname}?${params.toString()}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

export function useWebhookList() {
  const [location, setLocation] = useState(readLocation);
  const [searchInput, setSearchInput] = useState(location.search);
  const [result, setResult] = useState<WebhookList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback((page: number, search: string) => {
    writeLocation(page, search);

    setLocation({ page, search });
    setSearchInput(search);
  }, []);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    function handlePopState() {
      if (searchTimer.current) clearTimeout(searchTimer.current);

      const next = readLocation();
      setLocation(next);
      setSearchInput(next.search);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(location.page),
      limit: '10',
    });
    if (location.search) params.set('search', location.search);

    const controller = new AbortController();
    setLoading(true);
    setError('');

    request(`v1/webhooks?${params.toString()}`, WebhookListSchema, {
      signal: controller.signal,
    })
      .then((nextResult) => {
        if (controller.signal.aborted) return;

        setResult(nextResult);
        const lastPage = nextResult.paging.pages.last;

        if (location.page > lastPage) {
          const nextLocation = { page: lastPage, search: location.search };
          writeLocation(lastPage, location.search, true);
          setLocation(nextLocation);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          cause instanceof ApiError && cause.status === 401
            ? 'Сесію завершено. Увійдіть знову.'
            : 'Не вдалося завантажити вебхуки. Спробуйте ще раз.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [location, reloadKey]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      if (searchInput !== location.search) navigate(1, searchInput.trim());
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput, location.search, navigate]);

  return {
    location,
    searchInput,
    setSearchInput,
    result,
    loading,
    error,
    navigate,
    reload,
  };
}
