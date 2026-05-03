import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-me";
import { useStoreContext } from "@/hooks/use-store";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function buildWsUrl(token: string): string {
  let base = API_BASE;
  if (!base) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    base = `${proto}//${window.location.host}`;
  } else {
    base = base.replace(/^http/, "ws");
  }
  return `${base.replace(/\/$/, "")}/ws?token=${encodeURIComponent(token)}`;
}

type TransferEvent = {
  type: "stock_transfer_changed";
  transferId: number;
  status: string;
  sourceStoreId: number;
  destinationStoreId: number;
};

function transferToast(
  msg: TransferEvent,
  currentStoreId: number | null,
): { title: string; description?: string; variant?: "default" | "destructive" } | null {
  const onSource = currentStoreId === msg.sourceStoreId;
  const onDestination = currentStoreId === msg.destinationStoreId;
  const id = `#${msg.transferId}`;
  switch (msg.status) {
    case "requested":
      // Destination receives a new pull/push request
      if (onDestination) {
        return { title: `New transfer request ${id} / طلب تحويل جديد` };
      }
      return null;
    case "approved":
      if (onSource) {
        return { title: `Transfer ${id} approved by destination / تمت الموافقة` };
      }
      return null;
    case "rejected":
      if (onSource) {
        return {
          title: `Transfer ${id} rejected by destination / تم الرفض`,
          variant: "destructive",
        };
      }
      return null;
    case "prepared":
      if (onDestination) {
        return { title: `Transfer ${id} prepared by source / تم التحضير` };
      }
      return null;
    case "in_transit":
      if (onDestination) {
        return { title: `Transfer ${id} shipped — incoming / تم الشحن — وارد` };
      }
      return null;
    case "received":
      if (onSource) {
        return { title: `Transfer ${id} received by destination / تم الاستلام` };
      }
      if (onDestination) {
        return { title: `Transfer ${id} received / تم الاستلام` };
      }
      return null;
    case "cancelled":
      return {
        title: `Transfer ${id} cancelled / تم الإلغاء`,
        variant: "destructive",
      };
    default:
      return null;
  }
}

export function useRealtimeWS(): void {
  const { token } = useAuth();
  const { user } = useMe();
  const { currentStoreId } = useStoreContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);
  // Latest currentStoreId/toast available to ws handler without
  // forcing a reconnect each time the selected store changes.
  const storeIdRef = useRef<number | null>(currentStoreId);
  const toastRef = useRef(toast);
  useEffect(() => { storeIdRef.current = currentStoreId; }, [currentStoreId]);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  useEffect(() => {
    if (!token || !user) return;
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onopen = () => { retryRef.current = 0; };

      ws.onmessage = (ev) => {
        let msg: { type?: string } & Record<string, unknown>;
        try { msg = JSON.parse(ev.data); } catch { return; }

        // Generated query keys are URL-prefixed with "/api/...". We invalidate
        // by prefix-matching so both list (with params) and detail
        // (with :id) caches refresh.
        const invalidatePrefix = (prefix: string) =>
          qc.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey)
              && typeof q.queryKey[0] === "string"
              && (q.queryKey[0] as string).startsWith(prefix),
          });

        switch (msg.type) {
          case "stock_transfer_changed": {
            invalidatePrefix("/api/erp/transfers");
            const t = transferToast(msg as unknown as TransferEvent, storeIdRef.current);
            if (t) toastRef.current(t);
            break;
          }
          case "new_order": {
            // Generated query keys for the admin orders list/detail are
            // rooted at "/api/admin/orders"; the legacy "/api/erp/orders"
            // prefix is kept for any other in-app caches keyed that way.
            invalidatePrefix("/api/admin/orders");
            invalidatePrefix("/api/erp/orders");
            // Online (storefront) orders have no seller. Pop a toast for
            // staff of the current store so the inbox is acted on quickly.
            const sellerId = (msg as { sellerUserId?: number | null }).sellerUserId ?? null;
            const evtStoreId = (msg as { storeId?: number }).storeId;
            if (sellerId === null && evtStoreId === storeIdRef.current) {
              toastRef.current({ title: "طلب جديد من المتجر", description: "Nouvelle commande en ligne reçue" });
            }
            break;
          }
          case "order_status_changed":
            invalidatePrefix("/api/admin/orders");
            invalidatePrefix("/api/erp/orders");
            break;
          case "low_stock":
          case "inventory_changed":
            invalidatePrefix("/api/erp/products");
            invalidatePrefix("/api/erp/inventory");
            break;
          case "caisse_changed":
            invalidatePrefix("/api/erp/caisses");
            break;
          case "caisse_transfer_changed":
            invalidatePrefix("/api/erp/caisse-transfers");
            invalidatePrefix("/api/erp/caisses");
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (closedRef.current) return;
        const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    };

    connect();

    return () => {
      closedRef.current = true;
      try { wsRef.current?.close(); } catch { /* noop */ }
      wsRef.current = null;
    };
  }, [token, user, qc]);
}
