import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  useGetPurchaseOrders,
  useGetSuppliers,
  useReceivePurchaseOrder,
  type PurchaseOrder,
} from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const fmtDZ = (n: number | string) =>
  Number(n).toLocaleString("fr-DZ", { minimumFractionDigits: 2 }) + " دج";

export default function PurchaseOrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLang();
  const { isAdmin } = useAuth();

  const q = useGetPurchaseOrders();
  const suppliers = useGetSuppliers();
  const receive = useReceivePurchaseOrder();

  const supplierName = (id: number) =>
    (suppliers.data ?? []).find((s) => s.id === id)?.name ?? `#${id}`;

  const handleReceive = async (po: PurchaseOrder) => {
    if (!isAdmin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await receive.mutateAsync({ id: po.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      q.refetch();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("أوامر الشراء", "Purchase Orders")} showBack />

      {isAdmin ? (
        <Pressable
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin/purchase-orders/new" as never)}
        >
          <Feather name="plus" size={14} color={colors.primaryForeground} />
          <Text style={[styles.newBtnTxt, { color: colors.primaryForeground }]}>
            {t("أمر شراء جديد", "New Purchase Order")}
          </Text>
        </Pressable>
      ) : null}

      {q.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="truck" ar="لا توجد أوامر شراء" en="No purchase orders" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.head}>
                <Text style={[styles.id, { color: colors.foreground }]}>PO-{item.id}</Text>
                <View style={[styles.pill, {
                  backgroundColor: item.status === "received" ? colors.success + "22" : colors.warning + "22",
                }]}>
                  <Text style={[styles.pillTxt, {
                    color: item.status === "received" ? colors.success : colors.warning,
                  }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.supplier, { color: colors.foreground }]} numberOfLines={1}>
                {supplierName(item.supplierId)}
              </Text>
              <View style={styles.foot}>
                <Text style={[styles.total, { color: colors.primary }]}>{fmtDZ(item.totalAmount)}</Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
              {isAdmin && item.status !== "received" ? (
                <Pressable
                  onPress={() => handleReceive(item)}
                  disabled={receive.isPending}
                  style={[styles.receiveBtn, { borderColor: colors.primary, opacity: receive.isPending ? 0.5 : 1 }]}
                >
                  <Feather name="check" size={12} color={colors.primary} />
                  <Text style={[styles.receiveTxt, { color: colors.primary }]}>{t("استلام", "Receive")}</Text>
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
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  newBtn: { marginHorizontal: 12, marginVertical: 10, padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  newBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 12, gap: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  id: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  supplier: { fontSize: 13, fontFamily: "Inter_500Medium" },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  total: { fontSize: 14, fontFamily: "Inter_700Bold" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  receiveBtn: { marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 8 },
  receiveTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
