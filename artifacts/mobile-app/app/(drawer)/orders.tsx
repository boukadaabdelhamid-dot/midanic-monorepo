import { useMemo, useState } from "react";
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
import {
  useGetAdminOrders,
  type GetAdminOrdersChannel,
  type Order,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum, orderStatusLabel } from "@/lib/format";

type ChannelTab = { key: GetAdminOrdersChannel; label: string };
const CHANNELS: ChannelTab[] = [
  { key: "all", label: "الكل" },
  { key: "pos", label: "نقطة البيع" },
  { key: "online", label: "أونلاين" },
];

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
        <Text style={[styles.amount, { color: c.text }]}>
          {fmtNum(order.totalAmount, CURRENCY)}
        </Text>
      </View>
      <Text style={[styles.customer, { color: c.text }]} numberOfLines={1}>
        {order.customerName || "—"}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="call-outline" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]} numberOfLines={1}>
            {order.customerPhone || "—"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]}>
            {fmtDate(order.createdAt)}
          </Text>
        </View>
      </View>
      <View style={[styles.viewRow]}>
        <Text style={[styles.viewText, { color: c.primaryTint }]}>عرض التفاصيل</Text>
        <Ionicons name="chevron-back" size={14} color={c.primaryTint} />
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const c = useColors();
  const [channel, setChannel] = useState<GetAdminOrdersChannel>("all");
  const { data, isLoading, isError, isFetching, refetch } = useGetAdminOrders({ channel });
  const orders = useMemo(() => data ?? [], [data]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="المبيعات" subtitle="Ventes" />

      <View style={[styles.tabsWrap, { backgroundColor: c.background }]}>
        <View style={styles.tabs}>
          {CHANNELS.map((tab) => {
            const active = tab.key === channel;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setChannel(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? c.primary : c.surface,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text style={[styles.tabText, { color: active ? c.onPrimary : c.textMuted }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="receipt-outline" message="لا توجد طلبات" />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1, height: 38, borderRadius: 999, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  tabText: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amount: { fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
  customer: { fontSize: 16, fontWeight: "700", marginTop: 12, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  metaText: { fontSize: 13 },
  viewRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 10, gap: 4 },
  viewText: { fontSize: 13, fontWeight: "600" },
});
