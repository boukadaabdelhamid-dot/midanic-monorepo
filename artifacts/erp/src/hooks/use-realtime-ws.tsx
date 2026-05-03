import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-me";

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

export function useRealtimeWS(): void {
  const { token } = useAuth();
  const { isAdmin } = useMe();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!token || !isAdmin) return;
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
          case "stock_transfer_changed":
            invalidatePrefix("/api/erp/transfers");
            break;
          case "new_order":
          case "order_status_changed":
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
  }, [token, isAdmin, qc]);
}
