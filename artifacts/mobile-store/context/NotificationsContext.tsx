import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export interface WsNotification {
  id: string;
  type: "new_order" | "low_stock";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsContextValue {
  notifications: WsNotification[];
  unreadCount: number;
  latestBanner: WsNotification | null;
  clearBanner: () => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAdmin, token } = useAuth();
  const [notifications, setNotifications] = useState<WsNotification[]>([]);
  const [latestBanner, setLatestBanner] = useState<WsNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!isAdmin || !token) return;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;
    try {
      const ws = new WebSocket(`wss://${domain}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          let notif: WsNotification | null = null;
          if (data.type === "new_order") {
            notif = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
              type: "new_order",
              title: "طلب جديد / New Order",
              body: `${data.customerName} · SAR ${Number(data.totalAmount).toFixed(2)}`,
              timestamp: Date.now(),
              read: false,
            };
          } else if (data.type === "low_stock") {
            notif = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
              type: "low_stock",
              title: "تحذير مخزون / Low Stock",
              body: `${data.productName} · ${data.stock} متبقي / remaining`,
              timestamp: Date.now(),
              read: false,
            };
          }
          if (notif) {
            const n = notif;
            setNotifications((prev) => [n, ...prev]);
            setLatestBanner(n);
            if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = setTimeout(() => setLatestBanner(null), 4000);
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectRef.current = setTimeout(() => connect(), 5000);
      };
      ws.onerror = () => ws.close();
    } catch {}
  }, [isAdmin, token]);

  useEffect(() => {
    if (isAdmin && token) {
      connect();
    } else {
      wsRef.current?.close();
      wsRef.current = null;
    }
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAdmin, token, connect]);

  const clearBanner = useCallback(() => setLatestBanner(null), []);
  const markAllRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    []
  );
  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, latestBanner, clearBanner, markAllRead, clearAll }),
    [notifications, unreadCount, latestBanner, clearBanner, markAllRead, clearAll]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}
