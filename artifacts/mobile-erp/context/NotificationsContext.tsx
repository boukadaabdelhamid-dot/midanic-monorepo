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
  type: "new_order" | "low_stock" | "purchase_received" | "leave_status_changed";
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
  const { isAdmin, token, user } = useAuth();
  const isStaff = isAdmin || user?.role === "employee";
  const [notifications, setNotifications] = useState<WsNotification[]>([]);
  const [latestBanner, setLatestBanner] = useState<WsNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushNotif = useCallback((notif: WsNotification) => {
    setNotifications((prev) => [notif, ...prev]);
    setLatestBanner(notif);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setLatestBanner(null), 4000);
  }, []);

  const connect = useCallback(() => {
    if (!isStaff || !token) return;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) {
      console.warn("[NotificationsContext] EXPO_PUBLIC_DOMAIN not set — WebSocket disabled");
      return;
    }
    try {
      const ws = new WebSocket(`wss://${domain}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch (err) {
          console.warn("[NotificationsContext] Failed to parse WS message:", err);
          return;
        }
        let notif: WsNotification | null = null;
        if (data.type === "new_order") {
          const phone = data.customerPhone ? ` · ${data.customerPhone}` : "";
          notif = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "new_order",
            title: "طلب جديد / New Order",
            body: `${data.customerName}${phone} · SAR ${Number(data.totalAmount).toFixed(2)}`,
            timestamp: Date.now(),
            read: false,
          };
        } else if (data.type === "low_stock") {
          notif = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "low_stock",
            title: "تحذير مخزون / Low Stock",
            body: `${data.productName} · ${data.stock} متبقي / remaining`,
            timestamp: Date.now(),
            read: false,
          };
        } else if (data.type === "purchase_received") {
          notif = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "purchase_received",
            title: "استلام مشتريات / Purchase Received",
            body: `PO #${data.purchaseOrderId} · ${data.supplierName ?? "Supplier"} · SAR ${Number(data.totalAmount ?? 0).toFixed(2)}`,
            timestamp: Date.now(),
            read: false,
          };
        } else if (data.type === "leave_status_changed") {
          const statusAr = data.status === "approved" ? "موافق عليها" : "مرفوضة";
          const statusEn = data.status === "approved" ? "Approved" : "Rejected";
          notif = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "leave_status_changed",
            title: `إجازة ${statusAr} / Leave ${statusEn}`,
            body: `${data.employeeName ?? "Employee"} · ${data.leaveType ?? "Leave"} (${data.startDate ?? ""} – ${data.endDate ?? ""})`,
            timestamp: Date.now(),
            read: false,
          };
        }
        if (notif) pushNotif(notif);
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        if (event.code !== 1000) {
          console.info(`[NotificationsContext] WS closed (code ${event.code}), reconnecting in 5s`);
          reconnectRef.current = setTimeout(() => connect(), 5000);
        }
      };

      ws.onerror = (event) => {
        console.warn("[NotificationsContext] WS error:", event);
        ws.close();
      };
    } catch (err) {
      console.error("[NotificationsContext] Failed to open WebSocket:", err);
    }
  }, [isStaff, token, pushNotif]);

  useEffect(() => {
    if (isStaff && token) {
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
  }, [isStaff, token, connect]);

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
