import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setExtraHeadersGetter } from "@workspace/api-client-react";
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@workspace/api-client-react";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedToken, storedUser, storedSlug] = await Promise.all([
          AsyncStorage.getItem("midanic_erp_token"),
          AsyncStorage.getItem("midanic_erp_user"),
          AsyncStorage.getItem("midanic_erp_store_slug"),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
        }
        if (storedSlug) setStoreSlug(storedSlug);
      } catch (err) {
        console.warn("[AuthContext] Failed to restore session:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setExtraHeadersGetter(() => (storeSlug ? { "X-Store-Slug": storeSlug } : null));
  }, [storeSlug]);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = useCallback(async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await Promise.all([
      AsyncStorage.setItem("midanic_erp_token", newToken),
      AsyncStorage.setItem("midanic_erp_user", JSON.stringify(newUser)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem("midanic_erp_token"),
      AsyncStorage.removeItem("midanic_erp_user"),
    ]);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
