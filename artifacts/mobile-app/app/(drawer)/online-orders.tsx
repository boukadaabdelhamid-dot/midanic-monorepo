import { useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetAdminOrders, type Order } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum, orderStatusLabel } from "@/lib/format";

function statusColor(status: string, c: ReturnType<typeof useColors>): string {
  switch (status) {
    case "delivered": return c.success;
    case "cancelled": return c.danger;
    case "shipped": return c.primaryTint;
    case "processing": return c.warning;
    default: return c.textMuted;
  }
}

function OrderCard({ order }: { order: Order }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/order-detail", params: { id: order.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardTop}>
        <Pill label={orderStatusLabel(order.status)} color={statusColor(order.status, c)} />
        <Text style={[styles.amount, { color: c.text }]}>{fmtNum(order.totalAmount, CURRENCY)}</Text>
      </View>
      <Text style={[styles.customer, { color: c.text }]} numberOfLines={1}>
        {order.customerName || "—"}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="bag-outline" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]} numberOfLines={1}>
            {(order as any).channel || "online"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]}>{fmtDate(order.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function OnlineOrdersScreen() {
  const c = useColors();
  const { data, isLoading, isError, isFetching, refetch } = useGetAdminOrders({ channel: "online" });
  const orders = useMemo(() => (data ?? []) as Order[], [data]);
  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);

  const PendingBadge = pendingCount > 0 ? (
    <View style={[styles.badge, { backgroundColor: c.warning }]}>
      <Text style={styles.badgeText}>{pendingCount}</Text>
    </View>
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="طلبات المتجر" subtitle="Commandes en ligne" rightAction={PendingBadge} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="globe-outline" message="لا توجد طلبات أونلاين" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amount: { fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
  customer: { fontSize: 16, fontWeight: "700", marginTop: 12, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  metaText: { fontSize: 13, flex: 1 },
  badge: { minWidth: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
});
