import { useCallback, useEffect, useState } from 'react';
import {
  login,
  request,
  revokeSession,
  setUnauthorizedHandler,
} from '../api/http';
import { UserSchema } from '../api/schemas';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let ignoreResult = false;
    const endSession = () => setUser(null);
    setUnauthorizedHandler(endSession);
    request('v1/me', UserSchema, { signal: controller.signal })
      .then((profile) => {
        if (!ignoreResult) setUser(profile);
      })
      .catch(() => {
        if (!ignoreResult) setUser(null);
      })
      .finally(() => {
        if (!ignoreResult) setChecking(false);
      });
    return () => {
      ignoreResult = true;
      controller.abort();
      setUnauthorizedHandler(null);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await login(email, password);

    try {
      const profile = await request('v1/me', UserSchema);
      setUser(profile);
    } catch (error) {
      await revokeSession().catch(() => undefined);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await revokeSession().catch(() => undefined);
    setUser(null);
  }, []);

  return { user, checking, signIn, signOut };
}
