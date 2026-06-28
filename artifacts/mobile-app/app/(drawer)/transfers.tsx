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
import { useGetErpTransfers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { fmtDate } from "@/lib/format";

function transferStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    prepared: "جاهز",
    shipped: "تم الشحن",
    received: "مستلم",
    cancelled: "ملغى",
    rejected: "مرفوض",
  };
  return map[status] ?? status;
}
function transferStatusColor(status: string, c: ReturnType<typeof useColors>) {
  switch (status) {
    case "received": return c.success;
    case "cancelled": case "rejected": return c.danger;
    case "shipped": return c.primaryTint;
    case "prepared": return c.warning;
    default: return c.textMuted;
  }
}

export default function TransfersScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, isFetching, refetch } = useGetErpTransfers();
  const transfers = (data ?? []) as any[];

  const AddButton = isAdmin ? (
    <Pressable
      onPress={() => router.push("/transfer-detail")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="التحويلات" subtitle="Transferts" rightAction={AddButton} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" message="لا توجد تحويلات" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/transfer-detail", params: { id: item.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.cardTop}>
                <Pill label={transferStatusLabel(item.status)} color={transferStatusColor(item.status, c)} />
                <Text style={[styles.ref, { color: c.textMuted }]}>{item.reference || `#${item.id}`}</Text>
              </View>
              <View style={styles.storeRow}>
                <View style={styles.store}>
                  <Ionicons name="storefront-outline" size={14} color={c.textMuted} />
                  <Text style={[styles.storeText, { color: c.text }]} numberOfLines={1}>
                    {item.fromStoreName || item.fromStore?.nameAr || "—"}
                  </Text>
                </View>
                <Ionicons name="arrow-back" size={16} color={c.textMuted} />
                <View style={styles.store}>
                  <Ionicons name="storefront-outline" size={14} color={c.textMuted} />
                  <Text style={[styles.storeText, { color: c.text }]} numberOfLines={1}>
                    {item.toStoreName || item.toStore?.nameAr || "—"}
                  </Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
                <Text style={[styles.metaText, { color: c.textMuted }]}>{fmtDate(item.createdAt)}</Text>
              </View>
            </Pressable>
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
  ref: { fontSize: 13 },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  store: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  storeText: { fontSize: 14, fontWeight: "600", flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
