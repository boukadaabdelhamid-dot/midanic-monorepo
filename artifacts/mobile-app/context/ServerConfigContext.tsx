import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyServerUrl,
  isValidServerUrl,
  normalizeUrl,
  testConnection,
  type ConnectionResult,
} from "@/lib/api";
import {
  clearServerUrl as clearStoredUrl,
  loadServerUrl,
  persistServerUrl,
} from "@/lib/storage";

export type ConnectionStatus = "unknown" | "checking" | "online" | "offline";

type SaveOutcome = {
  ok: boolean;
  message: string;
};

type ServerConfigValue = {
  serverUrl: string | null;
  isLoading: boolean;
  status: ConnectionStatus;
  statusMessage: string;
  /** Validate, persist, wire the base URL and test the connection. */
  saveServerUrl: (raw: string) => Promise<SaveOutcome>;
  /** Re-run the health check against the current server. */
  refreshConnection: () => Promise<ConnectionResult | null>;
  /** Forget the saved server and return to onboarding. */
  disconnect: () => Promise<void>;
};

const ServerConfigContext = createContext<ServerConfigValue | undefined>(
  undefined,
);

export function ServerConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Hydrate the saved URL on boot and wire the shared API client.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadServerUrl();
      if (cancelled) return;

      if (saved) {
        applyServerUrl(saved);
        setServerUrl(saved);
        setStatus("checking");
        const result = await testConnection(saved);
        if (cancelled) return;
        setStatus(result.ok ? "online" : "offline");
        setStatusMessage(result.message);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveServerUrl = useCallback(
    async (raw: string): Promise<SaveOutcome> => {
      const url = normalizeUrl(raw);
      if (!isValidServerUrl(url)) {
        return {
          ok: false,
          message: "أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://",
        };
      }

      setStatus("checking");
      setStatusMessage("جارٍ التحقق من الاتصال...");

      const result = await testConnection(url);
      if (!result.ok) {
        setStatus("offline");
        setStatusMessage(result.message);
        return { ok: false, message: result.message };
      }

      applyServerUrl(url);
      try {
        await persistServerUrl(url);
      } catch {
        applyServerUrl(null);
        setStatus("offline");
        const message = "تعذّر حفظ الرابط على الجهاز. حاول مرة أخرى.";
        setStatusMessage(message);
        return { ok: false, message };
      }
      setServerUrl(url);
      setStatus("online");
      setStatusMessage(result.message);
      return { ok: true, message: result.message };
    },
    [],
  );

  const refreshConnection =
    useCallback(async (): Promise<ConnectionResult | null> => {
      if (!serverUrl) return null;
      setStatus("checking");
      setStatusMessage("جارٍ التحقق من الاتصال...");
      const result = await testConnection(serverUrl);
      setStatus(result.ok ? "online" : "offline");
      setStatusMessage(result.message);
      return result;
    }, [serverUrl]);

  const disconnect = useCallback(async (): Promise<void> => {
    await clearStoredUrl();
    applyServerUrl(null);
    setServerUrl(null);
    setStatus("unknown");
    setStatusMessage("");
  }, []);

  const value = useMemo<ServerConfigValue>(
    () => ({
      serverUrl,
      isLoading,
      status,
      statusMessage,
      saveServerUrl,
      refreshConnection,
      disconnect,
    }),
    [
      serverUrl,
      isLoading,
      status,
      statusMessage,
      saveServerUrl,
      refreshConnection,
      disconnect,
    ],
  );

  return (
    <ServerConfigContext.Provider value={value}>
      {children}
    </ServerConfigContext.Provider>
  );
}

export function useServerConfig(): ServerConfigValue {
  const ctx = useContext(ServerConfigContext);
  if (!ctx) {
    throw new Error("useServerConfig must be used within a ServerConfigProvider");
  }
  return ctx;
}
