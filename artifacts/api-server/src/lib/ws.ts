import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";

interface AdminClient {
  ws: WebSocket;
  userId: number;
  storeIds: Set<number>;
}

let adminClients: AdminClient[] = [];

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

    if (user.role !== "admin") {
      ws.close(1008, "Admin only");
      return;
    }

    // Resolve which stores this admin can see, so broadcasts are scoped
    // and one admin doesn't get notifications for stores they have no
    // access to.
    let storeIds = new Set<number>();
    try {
      const rows = await db.select({ storeId: schema.userStoresTable.storeId })
        .from(schema.userStoresTable)
        .where(eq(schema.userStoresTable.userId, user.id));
      storeIds = new Set(rows.map((r) => r.storeId));
    } catch {
      // ignore — fall back to no stores (no scoped broadcasts received)
    }

    adminClients.push({ ws, userId: user.id, storeIds });

    ws.on("close", () => {
      adminClients = adminClients.filter((c) => c.ws !== ws);
    });

    ws.send(JSON.stringify({ type: "connected", message: "Connected to Midanic WS" }));
  });

  return wss;
}

/**
 * Broadcast to admin WS clients. If `storeIds` is provided, only admins
 * that have access to at least one of the listed stores receive the
 * payload — used so cross-store events (e.g. inter-store transfers) are
 * delivered to admins of both source AND destination stores.
 */
export function broadcastToAdmins(data: Record<string, unknown>) {
  const payload = JSON.stringify(data);
  adminClients = adminClients.filter((c) => c.ws.readyState === WebSocket.OPEN);
  const rawIds = data["storeIds"];
  const rawId = data["storeId"];
  const targetStoreIds: number[] | null = Array.isArray(rawIds)
    ? (rawIds as number[])
    : (typeof rawId === "number" ? [rawId] : null);
  for (const client of adminClients) {
    if (targetStoreIds && !targetStoreIds.some((id) => client.storeIds.has(id))) {
      continue;
    }
    client.ws.send(payload);
  }
}
