import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useGetAdminOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Order, UpdateOrderStatusRequestStatus } from "@workspace/api-client-react";

const STATUSES: UpdateOrderStatusRequestStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, authLoading, router]);

  const { data: orders = [], isLoading, refetch, isRefetching } = useGetAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleStatusChange = (status: UpdateOrderStatusRequestStatus) => {
    if (!selectedOrder) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateStatus.mutate(
      { id: selectedOrder.id, data: { status } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedOrder(null);
          refetch();
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("إدارة الطلبات", "Manage Orders")}
        </Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {orders.length}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 20 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="package" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {t("لا توجد طلبات", "No orders")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.orderCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setSelectedOrder(item)}
            >
              <View style={styles.orderHeader}>
                <Text style={[styles.orderNum, { color: colors.foreground }]}>
                  #{item.id}
                </Text>
                <OrderStatusBadge status={item.status} />
              </View>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {item.customerName}
              </Text>
              <Text style={[styles.customerPhone, { color: colors.mutedForeground }]}>
                {item.customerPhone}
              </Text>
              <View style={styles.orderFooter}>
                <Text style={[styles.orderTotal, { color: colors.primary }]}>
                  {t(`${Number(item.totalAmount).toFixed(2)} دج`, `دج ${Number(item.totalAmount).toFixed(2)}`)}
                </Text>
                <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedOrder(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t("تغيير الحالة", "Change Status")} · #{selectedOrder?.id}
            </Text>
            {STATUSES.map((status) => (
              <Pressable
                key={status}
                style={({ pressed }) => [
                  styles.statusOption,
                  { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  selectedOrder?.status === status && { borderColor: colors.primary, backgroundColor: colors.primary + "11" },
                ]}
                onPress={() => handleStatusChange(status)}
                disabled={updateStatus.isPending}
              >
                <OrderStatusBadge status={status} />
                {selectedOrder?.status === status && (
                  <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  headerCount: { fontSize: 14, fontFamily: "Inter_500Medium" },
  list: { padding: 12, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customerPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  orderTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  orderDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  statusOption: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center" },
});
