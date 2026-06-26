import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getMe,
  login as loginRequest,
  selectStore as selectStoreRequest,
  ApiError,
  type Store,
  type User,
} from "@workspace/api-client-react";
import { installAuthTokenGetter, setAuthToken } from "@/lib/api";
import { useServerConfig } from "@/context/ServerConfigContext";
import {
  clearSession,
  loadSession,
  persistSession,
  type StoredSession,
} from "@/lib/storage";

type AuthOutcome = {
  ok: boolean;
  message: string;
  /** Set on a successful sign-in when the user must still pick a store. */
  needsStoreSelection?: boolean;
};

type AuthValue = {
  /** True while the persisted session is being hydrated on boot. */
  isLoading: boolean;
  /** A valid token is present. */
  isAuthenticated: boolean;
  /** Logged in but must pick a store before continuing. */
  needsStoreSelection: boolean;
  user: User | null;
  stores: Store[];
  currentStoreId: number | null;
  /** Authenticate with email + password against the connected ERP server. */
  signIn: (email: string, password: string) => Promise<AuthOutcome>;
  /** Switch the active store (re-issues the JWT). */
  chooseStore: (storeId: number) => Promise<AuthOutcome>;
  /** Forget the session and return to the login screen. */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    if (error.status === 403) return "هذا الحساب معطّل. تواصل مع المسؤول";
    const detail =
      (error.data &&
        typeof error.data === "object" &&
        "error" in error.data &&
        typeof (error.data as { error: unknown }).error === "string" &&
        (error.data as { error: string }).error) ||
      null;
    return detail || "تعذّر تسجيل الدخول. حاول مرة أخرى";
  }
  return "تعذّر الوصول إلى الخادم. تحقّق من الاتصال";
}

// Install the global token getter once at module load so it is wired before
// any authenticated request can fire.
installAuthTokenGetter();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { serverUrl, isLoading: serverLoading } = useServerConfig();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshed, setRefreshed] = useState<boolean>(false);

  const applySession = useCallback(
    async (session: StoredSession, persist: boolean) => {
      setAuthToken(session.token);
      setToken(session.token);
      setUser(session.user);
      setStores(session.stores);
      setCurrentStoreId(session.currentStoreId);
      if (persist) {
        await persistSession(session);
      }
    },
    [],
  );

  const clear = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setStores([]);
    setCurrentStoreId(null);
    await clearSession();
  }, []);

  // Hydrate the persisted session on boot. We only restore here — the
  // best-effort getMe refresh is deferred to a separate, server-gated effect
  // so it never fires before ServerConfigProvider has applied the base URL.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadSession();
      if (cancelled) return;

      if (saved) {
        setAuthToken(saved.token);
        setToken(saved.token);
        setUser(saved.user);
        setStores(saved.stores);
        setCurrentStoreId(saved.currentStoreId);
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Once the server URL is applied, do a one-time best-effort refresh of the
  // user + stores. A 401 means the token is no longer valid, so we sign out.
  // Network errors keep the cached session intact.
  useEffect(() => {
    if (isLoading || serverLoading || !serverUrl || !token || refreshed) {
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        await applySession(
          {
            token,
            user: me,
            stores: me.stores ?? stores,
            currentStoreId: me.currentStoreId ?? null,
          },
          true,
        );
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          await clear();
        }
      } finally {
        if (!cancelled) setRefreshed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    serverLoading,
    serverUrl,
    token,
    refreshed,
    stores,
    applySession,
    clear,
  ]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthOutcome> => {
      try {
        const res = await loginRequest({ email: email.trim(), password });
        if (res.user.role === "customer") {
          return {
            ok: false,
            message: "هذا الحساب غير مخوّل للدخول إلى نظام الإدارة",
          };
        }
        const nextStores = res.stores ?? [];
        const nextStoreId = res.currentStoreId ?? null;
        await applySession(
          {
            token: res.token,
            user: res.user,
            stores: nextStores,
            currentStoreId: nextStoreId,
          },
          true,
        );
        return {
          ok: true,
          message: "",
          needsStoreSelection: nextStoreId == null && nextStores.length > 1,
        };
      } catch (error) {
        return { ok: false, message: describeError(error) };
      }
    },
    [applySession],
  );

  const chooseStore = useCallback(
    async (storeId: number): Promise<AuthOutcome> => {
      if (!token) {
        return { ok: false, message: "انتهت الجلسة. سجّل الدخول مجدداً" };
      }
      try {
        const res = await selectStoreRequest({ storeId });
        // Update the token first so subsequent requests carry the new claim.
        setAuthToken(res.token);
        const nextStores = stores.some((s) => s.id === res.store.id)
          ? stores
          : [...stores, res.store];
        await applySession(
          {
            token: res.token,
            user: user as User,
            stores: nextStores,
            currentStoreId: res.currentStoreId,
          },
          true,
        );
        return { ok: true, message: "" };
      } catch (error) {
        return { ok: false, message: describeError(error) };
      }
    },
    [applySession, stores, token, user],
  );

  const signOut = useCallback(async () => {
    await clear();
  }, [clear]);

  const value = useMemo<AuthValue>(
    () => ({
      isLoading,
      isAuthenticated: !!token,
      needsStoreSelection:
        !!token && currentStoreId == null && stores.length > 1,
      user,
      stores,
      currentStoreId,
      signIn,
      chooseStore,
      signOut,
    }),
    [
      isLoading,
      token,
      currentStoreId,
      stores,
      user,
      signIn,
      chooseStore,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
