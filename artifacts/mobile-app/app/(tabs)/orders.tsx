import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetAdminOrders,
  type GetAdminOrdersChannel,
  type Order,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
} from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum, orderStatusLabel } from "@/lib/format";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;

type ChannelTab = { key: GetAdminOrdersChannel; label: string };

const CHANNELS: ChannelTab[] = [
  { key: "all", label: "الكل" },
  { key: "online", label: "أونلاين" },
  { key: "pos", label: "نقطة البيع" },
];

function statusColor(status: string, c: ReturnType<typeof useColors>): string {
  switch (status) {
    case "delivered":
      return c.success;
    case "cancelled":
      return c.danger;
    case "shipped":
      return c.primaryTint;
    case "processing":
      return c.warning;
    default:
      return c.textMuted;
  }
}

function OrderRow({ order }: { order: Order }) {
  const c = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={styles.cardTopRow}>
        <Pill
          label={orderStatusLabel(order.status)}
          color={statusColor(order.status, c)}
        />
        <Text style={[styles.amount, { color: c.text }]}>
          {fmtNum(order.totalAmount, CURRENCY)}
        </Text>
      </View>

      <Text style={[styles.customer, { color: c.text }]} numberOfLines={1}>
        {order.customerName || "—"}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="call" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]} numberOfLines={1}>
            {order.customerPhone || "—"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar" size={13} color={c.textMuted} />
          <Text style={[styles.metaText, { color: c.textMuted }]}>
            {fmtDate(order.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Orders() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<GetAdminOrdersChannel>("all");

  const { data, isLoading, isError, isFetching, refetch } = useGetAdminOrders({
    channel,
  });

  const orders = useMemo(() => data ?? [], [data]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={{ paddingTop: insets.top + WEB_TOP_INSET + 20 }}>
        <Text style={[styles.title, { color: c.text }]}>الطلبات</Text>

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
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? c.onPrimary : c.textMuted },
                  ]}
                >
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
          renderItem={({ item }) => <OrderRow order={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" message="لا توجد طلبات" />
          }
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "right",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  customer: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 13,
  },
});
