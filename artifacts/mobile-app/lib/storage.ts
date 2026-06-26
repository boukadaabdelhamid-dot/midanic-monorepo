import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Store, User } from "@workspace/api-client-react";
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";

const SERVER_URL_KEY = "midanic_erp_server_url";
const SESSION_META_KEY = "midanic_session";
const TOKEN_KEY = "midanic_token";

export async function loadServerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SERVER_URL_KEY);
  } catch {
    return null;
  }
}

export async function persistServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url);
}

export async function clearServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(SERVER_URL_KEY);
}

/** Persisted authenticated session restored across app restarts. */
export type StoredSession = {
  token: string;
  user: User;
  stores: Store[];
  currentStoreId: number | null;
};

type SessionMeta = {
  user: User;
  stores: Store[];
  currentStoreId: number | null;
};

/**
 * Sessions are split for security: the JWT lives in secure storage
 * (Keychain/Keystore on native), while the non-sensitive profile + store
 * metadata lives in AsyncStorage.
 */
export async function loadSession(): Promise<StoredSession | null> {
  try {
    const token = await getSecureItem(TOKEN_KEY);
    if (!token) return null;

    const rawMeta = await AsyncStorage.getItem(SESSION_META_KEY);
    if (!rawMeta) return null;

    const meta = JSON.parse(rawMeta) as SessionMeta;
    if (!meta || !meta.user) return null;

    return {
      token,
      user: meta.user,
      stores: Array.isArray(meta.stores) ? meta.stores : [],
      currentStoreId: meta.currentStoreId ?? null,
    };
  } catch {
    return null;
  }
}

export async function persistSession(session: StoredSession): Promise<void> {
  const meta: SessionMeta = {
    user: session.user,
    stores: session.stores,
    currentStoreId: session.currentStoreId,
  };
  await setSecureItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
}

export async function clearSession(): Promise<void> {
  await deleteSecureItem(TOKEN_KEY);
  await AsyncStorage.removeItem(SESSION_META_KEY);
}
