import { useCallback } from "react";
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
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

type FeedItem = {
  id: string;
  type: "order" | "low_stock";
  title: string;
  subtitle: string;
  time: string;
  color: string;
  icon: string;
};

export default function RealtimeScreen() {
  const c = useColors();
  const orders = useGetAdminOrders();
  const lowStock = useGetLowStock();

  const onRefresh = useCallback(() => {
    void orders.refetch();
    void lowStock.refetch();
  }, [orders, lowStock]);

  const orderFeed: FeedItem[] = ((orders.data ?? []) as any[])
    .slice(0, 15)
    .map((o: any) => ({
      id: `order-${o.id}`,
      type: "order",
      title: `طلب جديد — ${o.customerName || "عميل"}`,
      subtitle: fmtNum(o.totalAmount, CURRENCY),
      time: fmtDate(o.createdAt),
      color: c.success,
      icon: "receipt",
    }));

  const stockFeed: FeedItem[] = ((lowStock.data ?? []) as any[])
    .slice(0, 10)
    .map((p: any) => ({
      id: `stock-${p.id}`,
      type: "low_stock",
      title: `مخزون منخفض — ${p.nameAr || p.nameEn}`,
      subtitle: `المخزون المتبقي: ${p.stock} وحدة`,
      time: "—",
      color: c.warning,
      icon: "alert-circle",
    }));

  const feed = [...orderFeed, ...stockFeed].sort((a, b) => {
    if (a.type === "low_stock") return -1;
    return 0;
  });

  const isLoading = orders.isLoading && lowStock.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الوقت الفعلي" subtitle="Temps Réel" />

      <View style={[styles.infoBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.dot, { backgroundColor: c.success }]} />
        <Text style={[styles.infoText, { color: c.textMuted }]}>
          آخر تحديث — اسحب للتحديث
        </Text>
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
            <View style={[styles.feedCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.feedIcon, { backgroundColor: item.color + "22" }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.feedBody}>
                <Text style={[styles.feedTitle, { color: c.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
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
  infoBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginVertical: 8,
    borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  infoText: { fontSize: 13 },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  feedCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  feedIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  feedBody: { flex: 1 },
  feedTitle: { fontSize: 14, fontWeight: "700", textAlign: "right" },
  feedSub: { fontSize: 13, marginTop: 2, textAlign: "right" },
  feedTime: { fontSize: 12 },
});
