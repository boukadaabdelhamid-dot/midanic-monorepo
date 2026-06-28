import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetPurchaseOrders, useReceivePurchaseOrder } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

export default function PurchaseOrdersScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, isFetching, refetch } = useGetPurchaseOrders();
  const receive = useReceivePurchaseOrder();
  const orders = (data ?? []) as any[];

  const handleReceive = (id: number) => {
    if (Platform.OS !== "web") {
      Alert.alert("استلام الطلبية", "تأكيد استلام هذه الطلبية وتحديث المخزون؟", [
        { text: "إلغاء", style: "cancel" },
        { text: "استلام", onPress: () => doReceive(id) },
      ]);
    } else doReceive(id);
  };

  const doReceive = (id: number) => {
    receive.mutate({ purchaseOrderId: id }, { onSuccess: () => void refetch() });
  };

  const AddButton = (
    <Pressable
      onPress={() => router.push("/po-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="المشتريات" subtitle="Achats" rightAction={AddButton} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="document-text-outline" message="لا توجد طلبيات شراء" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <Pill
                  label={item.status === "received" ? "مستلم" : "قيد الانتظار"}
                  color={item.status === "received" ? c.success : c.warning}
                />
                <Text style={[styles.amount, { color: c.text }]}>{fmtNum(item.totalAmount, CURRENCY)}</Text>
              </View>
              <Text style={[styles.supplier, { color: c.text }]} numberOfLines={1}>
                {item.supplierName || item.supplier?.name || `مورد #${item.supplierId}`}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
                <Text style={[styles.metaText, { color: c.textMuted }]}>{fmtDate(item.createdAt)}</Text>
              </View>
              {item.status !== "received" && isAdmin ? (
                <Pressable
                  onPress={() => handleReceive(item.id)}
                  disabled={receive.isPending}
                  style={({ pressed }) => [
                    styles.receiveBtn,
                    { backgroundColor: c.success, opacity: pressed || receive.isPending ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.receiveBtnText}>تأكيد الاستلام</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amount: { fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
  supplier: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  receiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  receiveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
