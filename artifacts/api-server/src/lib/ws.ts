import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";

interface WsClient {
  ws: WebSocket;
  userId: number;
  role: string;
  storeIds: Set<number>;
}

let clients: WsClient[] = [];

const isAdmin = (c: WsClient) => c.role === "admin";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }

    let user: { id: number; email: string; role: string };
    try {
      user = verifyToken(token);
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    if (user.role !== "admin" && user.role !== "employee") {
      ws.close(1008, "Staff only");
      return;
    }

    let storeIds = new Set<number>();
    try {
      const rows = await db.select({ storeId: schema.userStoresTable.storeId })
        .from(schema.userStoresTable)
        .where(eq(schema.userStoresTable.userId, user.id));
      storeIds = new Set(rows.map((r) => r.storeId));
    } catch {
      // ignore
    }

    clients.push({ ws, userId: user.id, role: user.role, storeIds });

    ws.on("close", () => {
      clients = clients.filter((c) => c.ws !== ws);
    });

    ws.send(JSON.stringify({ type: "connected", message: "Connected to Midanic WS" }));
  });

  return wss;
}

function activeClients(): WsClient[] {
  clients = clients.filter((c) => c.ws.readyState === WebSocket.OPEN);
  return clients;
}

/**
 * Broadcast to admin clients only, scoped by store.
 */
export function broadcastToAdmins(data: Record<string, unknown>) {
  const payload = JSON.stringify(data);
  const rawIds = data["storeIds"];
  const rawId = data["storeId"];
  const targetStoreIds: number[] | null = Array.isArray(rawIds)
    ? (rawIds as number[])
    : (typeof rawId === "number" ? [rawId] : null);
  for (const c of activeClients()) {
    if (!isAdmin(c)) continue;
    if (targetStoreIds && !targetStoreIds.some((id) => c.storeIds.has(id))) continue;
    c.ws.send(payload);
  }
}

/**
 * Broadcast to ALL connected clients (admins + staff) that have access
 * to the given store. Used for caisse events so staff recipients get
 * realtime inbox/balance updates.
 */
export function broadcastToStoreUsers(
  storeId: number,
  data: Record<string, unknown>,
  extraUserIds: number[] = [],
) {
  const payload = JSON.stringify(data);
  const extra = new Set(extraUserIds);
  for (const c of activeClients()) {
    const inStore = c.storeIds.has(storeId);
    if (!inStore && !extra.has(c.userId)) continue;
    c.ws.send(payload);
  }
}

/**
 * Direct delivery to specific user ids regardless of store membership.
 */
export function broadcastToUsers(userIds: number[], data: Record<string, unknown>) {
  if (userIds.length === 0) return;
  const payload = JSON.stringify(data);
  const set = new Set(userIds);
  for (const c of activeClients()) {
    if (!set.has(c.userId)) continue;
    c.ws.send(payload);
  }
}
