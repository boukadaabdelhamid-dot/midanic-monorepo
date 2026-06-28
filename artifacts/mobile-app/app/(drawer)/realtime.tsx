import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetAdminOrders, useGetLowStock } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useServerConfig } from "@/context/ServerConfigContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

type FeedItem = {
  id: string;
  type: "order" | "low_stock" | "purchase_received" | "leave_status_changed" | "info";
  title: string;
  subtitle: string;
  time: string;
  color: string;
  icon: string;
  live?: boolean;
};

function wsUrl(serverUrl: string): string {
  return serverUrl.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";
}

export default function RealtimeScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { serverUrl } = useServerConfig();
  const orders = useGetAdminOrders();
  const lowStock = useGetLowStock();

  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<FeedItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connectWs = useCallback(() => {
    if (!serverUrl) return;
    try {
      const ws = new WebSocket(wsUrl(serverUrl));
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        const token = typeof localStorage !== "undefined"
          ? localStorage.getItem("midanic_token")
          : null;
        if (token) ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          const now = new Date().toLocaleTimeString("ar-EG");

          let item: FeedItem | null = null;
          if (msg.type === "new_order") {
            item = {
              id: `order-${Date.now()}`,
              type: "order",
              title: `طلب جديد — ${msg.data?.customerName ?? "عميل"}`,
              subtitle: fmtNum(msg.data?.totalAmount ?? 0, CURRENCY),
              time: now,
              color: c.success,
              icon: "receipt",
              live: true,
            };
          } else if (msg.type === "low_stock") {
            item = {
              id: `stock-${Date.now()}`,
              type: "low_stock",
              title: `مخزون منخفض — ${msg.data?.nameAr ?? msg.data?.nameEn ?? "منتج"}`,
              subtitle: `المخزون: ${msg.data?.stock ?? 0} وحدة`,
              time: now,
              color: c.warning,
              icon: "alert-circle",
              live: true,
            };
          } else if (msg.type === "purchase_received") {
            item = {
              id: `po-${Date.now()}`,
              type: "purchase_received",
              title: `تم استلام مشتريات — ${msg.data?.supplierName ?? "مورد"}`,
              subtitle: fmtNum(msg.data?.total ?? 0, CURRENCY),
              time: now,
              color: c.primaryTint,
              icon: "cube",
              live: true,
            };
          } else if (msg.type === "leave_status_changed") {
            const status = msg.data?.status === "approved" ? "موافق عليها" : "مرفوضة";
            item = {
              id: `leave-${Date.now()}`,
              type: "leave_status_changed",
              title: `إجازة ${status} — ${msg.data?.employeeName ?? "موظف"}`,
              subtitle: msg.data?.type ?? "",
              time: now,
              color: msg.data?.status === "approved" ? c.success : c.danger,
              icon: "calendar",
              live: true,
            };
          }

          if (item) {
            setLiveEvents((prev) => [item!, ...prev].slice(0, 50));
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      // WebSocket not available (e.g. SSR)
    }
  }, [serverUrl, c.success, c.warning, c.primaryTint, c.danger]);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWs]);

  const onRefresh = useCallback(() => {
    void orders.refetch();
    void lowStock.refetch();
    if (!wsConnected) connectWs();
  }, [orders, lowStock, wsConnected, connectWs]);

  const staticOrderFeed: FeedItem[] = ((orders.data ?? []) as any[])
    .slice(0, 10)
    .map((o: any) => ({
      id: `sorder-${o.id}`,
      type: "order" as const,
      title: `طلب #${o.id} — ${o.customerName || "عميل"}`,
      subtitle: fmtNum(o.totalAmount, CURRENCY),
      time: fmtDate(o.createdAt),
      color: c.success,
      icon: "receipt",
    }));

  const staticStockFeed: FeedItem[] = ((lowStock.data ?? []) as any[])
    .slice(0, 8)
    .map((p: any) => ({
      id: `sstock-${p.id}`,
      type: "low_stock" as const,
      title: `مخزون منخفض — ${p.nameAr || p.nameEn}`,
      subtitle: `المخزون: ${p.stock} وحدة`,
      time: "—",
      color: c.warning,
      icon: "alert-circle",
    }));

  const feed: FeedItem[] = [...liveEvents, ...staticOrderFeed, ...staticStockFeed];

  const isLoading = orders.isLoading && lowStock.isLoading && liveEvents.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الوقت الفعلي" subtitle="Temps Réel" />

      <View style={[styles.statusBar, {
        backgroundColor: wsConnected ? c.success + "18" : c.surface,
        borderColor: wsConnected ? c.success + "44" : c.border,
      }]}>
        <View style={[styles.dot, { backgroundColor: wsConnected ? c.success : c.textMuted }]} />
        <Text style={[styles.statusText, { color: wsConnected ? c.success : c.textMuted }]}>
          {wsConnected ? "متصل — تحديث مباشر نشط" : "غير متصل — اسحب للتحديث"}
        </Text>
        {liveEvents.length > 0 && (
          <View style={[styles.liveBadge, { backgroundColor: c.success }]}>
            <Text style={styles.liveBadgeText}>{liveEvents.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? <LoadingState /> : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="pulse-outline" message="لا توجد أحداث" />}
          refreshControl={
            <RefreshControl
              refreshing={orders.isFetching || lowStock.isFetching}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={[
              styles.feedCard,
              { backgroundColor: c.surface, borderColor: c.border },
              item.live && { borderLeftWidth: 3, borderLeftColor: item.color },
            ]}>
              <View style={[styles.feedIcon, { backgroundColor: item.color + "22" }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.feedBody}>
                <View style={styles.feedTitleRow}>
                  <Text style={[styles.feedTitle, { color: c.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.live && (
                    <View style={[styles.livePill, { backgroundColor: item.color + "22" }]}>
                      <Text style={[styles.livePillText, { color: item.color }]}>مباشر</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.feedSub, { color: c.textMuted }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={[styles.feedTime, { color: c.textMuted }]}>{item.time}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginVertical: 8,
    borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 13, fontWeight: "600" },
  liveBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  liveBadgeText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  feedCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  feedIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  feedBody: { flex: 1 },
  feedTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedTitle: { fontSize: 14, fontWeight: "700", textAlign: "right", flex: 1 },
  livePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  livePillText: { fontSize: 10, fontWeight: "800" },
  feedSub: { fontSize: 13, marginTop: 2, textAlign: "right" },
  feedTime: { fontSize: 12 },
});
