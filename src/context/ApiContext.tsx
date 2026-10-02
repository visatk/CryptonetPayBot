import {
  createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  username?: string;
  firstName: string;
  plan: 'free' | 'pro';
  txCount: number;
  planExpiresAt?: string;
  hasWallet: boolean;
  limits: { maxTx: number; label: string };
}

interface ApiContextValue {
  user:       User | null;
  loading:    boolean;
  initData:   string;
  isOwner:    boolean;
  fetchUser:  () => Promise<void>;
  apiFetch:   (path: string, options?: RequestInit) => Promise<Response>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ApiContext = createContext<ApiContextValue | null>(null);
const BASE = '/api';

export function ApiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Read once; initData is stable for session lifetime
  const initData = useRef(window.Telegram?.WebApp?.initData || '').current;
  const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const OWNER_ID = 5668179742;
  const isOwner  = tgUser?.id === OWNER_ID;

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}): Promise<Response> => {
    const { headers: extraHeaders, ...rest } = options;
    return fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-InitData': initData,
        ...(extraHeaders ?? {}),
      },
    });
  }, [initData]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiFetch('/tma/me');
      if (res.ok) {
        setUser(await res.json() as User);
      } else if (res.status === 404) {
        // New user — register via bot first, then retry
        setUser(null);
      }
    } catch (e) {
      console.error('[ApiContext] fetchUser failed', e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <ApiContext.Provider value={{ user, loading, initData, isOwner, fetchUser, apiFetch }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used inside ApiProvider');
  return ctx;
}
