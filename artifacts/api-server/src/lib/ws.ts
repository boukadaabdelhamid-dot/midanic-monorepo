import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth";

interface AdminClient {
  ws: WebSocket;
  userId: number;
}

let adminClients: AdminClient[] = [];

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
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

    adminClients.push({ ws, userId: user.id });

    ws.on("close", () => {
      adminClients = adminClients.filter((c) => c.ws !== ws);
    });

    ws.send(JSON.stringify({ type: "connected", message: "Connected to Midanic WS" }));
  });

  return wss;
}

export function broadcastToAdmins(data: object) {
  const payload = JSON.stringify(data);
  adminClients = adminClients.filter((c) => c.ws.readyState === WebSocket.OPEN);
  for (const client of adminClients) {
    client.ws.send(payload);
  }
}
