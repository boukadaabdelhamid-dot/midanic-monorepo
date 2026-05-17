import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetAdminOrders,
  useUpdateOrderStatus,
  type Order,
  type UpdateOrderStatusRequestStatus,
} from "@workspace/api-client-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useLang } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

const STATUSES: UpdateOrderStatusRequestStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function OnlineOrdersScreen() {
  const colors = useColors();
  const { t } = useLang();
  const { notifications } = useNotifications();
  const { data: orders = [], isLoading, refetch, isRefetching } = useGetAdminOrders({ channel: "online" });
  const updateStatus = useUpdateOrderStatus();
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<UpdateOrderStatusRequestStatus | "all">("all");

  // Refetch on new_order WS events
  const newOrderCount = useMemo(
    () => notifications.filter((n) => n.type === "new_order").length,
    [notifications],
  );
  useEffect(() => {
    if (newOrderCount > 0) refetch();
  }, [newOrderCount, refetch]);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const handleStatusChange = (status: UpdateOrderStatusRequestStatus) => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateStatus.mutate(
      { id: selected.id, data: { status } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelected(null);
          refetch();
        },
      },
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("الطلبات أونلاين", "Online Orders")} />

      <View style={[styles.chipsWrap, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {(["all", ...STATUSES] as const).map((s) => {
            const active = filter === s;
            return (
              <Pressable
                key={s}
                onPress={() => setFilter(s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {s === "all" ? t("الكل", "All") : s}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="package" ar="لا توجد طلبات" en="No orders yet" />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setSelected(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardId, { color: colors.foreground }]}>#{item.id}</Text>
                <OrderStatusBadge status={item.status} />
              </View>
              <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.customerPhone} · {item.sellerUserId ? t("داخل المتجر", "in-store") : t("أونلاين", "online")}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardTotal, { color: colors.primary }]}>
                  {Number(item.totalAmount).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج
                </Text>
                <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {t("تفاصيل الطلب", "Order Details")} · #{selected?.id}
            </Text>
            {selected ? (
              <View style={{ gap: 6, marginBottom: 10 }}>
                <Text style={[styles.detLine, { color: colors.foreground }]}>{selected.customerName}</Text>
                <Text style={[styles.detLine, { color: colors.mutedForeground }]}>{selected.customerPhone}</Text>
                <Text style={[styles.detLine, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {selected.customerAddress}
                </Text>
                <Text style={[styles.detTotal, { color: colors.primary }]}>
                  {Number(selected.totalAmount).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج
                </Text>
              </View>
            ) : null}
            <Text style={[styles.sectionLbl, { color: colors.mutedForeground }]}>{t("تغيير الحالة", "Change Status")}</Text>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [
                  styles.statusOpt,
                  {
                    backgroundColor: colors.background,
                    borderColor: selected?.status === s ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleStatusChange(s)}
                disabled={updateStatus.isPending}
              >
                <OrderStatusBadge status={s} />
                {selected?.status === s ? (
                  <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  chipsWrap: { borderBottomWidth: 1, paddingVertical: 8 },
  chipsRow: { paddingHorizontal: 12, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  list: { padding: 12, gap: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardId: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  cardTotal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  detLine: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detTotal: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  sectionLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  statusOpt: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center" },
});
