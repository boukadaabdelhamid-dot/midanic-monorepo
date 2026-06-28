import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetInventoryStock, useGetLowStock } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { fmtInt } from "@/lib/format";

export default function InventoryScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");

  const stock = useGetInventoryStock();
  const lowStock = useGetLowStock();

  const lowIds = useMemo(() => new Set((lowStock.data ?? []).map((p: any) => p.id)), [lowStock.data]);
  const items = useMemo(() => {
    const all = (stock.data ?? []) as any[];
    return search ? all.filter((p: any) => (p.nameAr || p.nameEn || "").includes(search) || (p.reference || "").includes(search)) : all;
  }, [stock.data, search]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="المخزون" subtitle="Stock" />

      <View style={[styles.searchWrap, { backgroundColor: c.background }]}>
        <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {stock.isLoading ? <LoadingState /> : stock.isError ? <ErrorState onRetry={() => void stock.refetch()} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.productId ?? item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="layers-outline" message="لا توجد بيانات مخزون" />}
          refreshControl={
            <RefreshControl
              refreshing={stock.isFetching}
              onRefresh={() => { void stock.refetch(); void lowStock.refetch(); }}
              tintColor={c.primary}
            />
          }
          renderItem={({ item }) => {
            const productId = item.productId ?? item.id;
            const isLow = lowIds.has(productId);
            const outOfStock = (item.stock ?? item.quantity ?? 0) <= 0;
            const stockVal = item.stock ?? item.quantity ?? 0;
            const stockColor = outOfStock ? c.danger : isLow ? c.warning : c.success;

            return (
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
                    {item.nameAr || item.nameEn || item.productName || `#${productId}`}
                  </Text>
                  {item.reference ? (
                    <Text style={[styles.ref, { color: c.textMuted }]}>{item.reference}</Text>
                  ) : null}
                  <View style={styles.row}>
                    {outOfStock ? <Pill label="نفد المخزون" color={c.danger} /> : isLow ? <Pill label="مخزون منخفض" color={c.warning} /> : null}
                  </View>
                </View>
                <View style={styles.stockBox}>
                  <Text style={[styles.stockNum, { color: stockColor }]}>{fmtInt(stockVal)}</Text>
                  <Text style={[styles.stockLabel, { color: c.textMuted }]}>وحدة</Text>
                  {isAdmin ? (
                    <Pressable
                      onPress={() => router.push({ pathname: "/inventory-adjust", params: { id: productId } })}
                      style={({ pressed }) => [styles.adjustBtn, { backgroundColor: c.primaryDeep, opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, textAlign: "right", height: "100%" as any },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14, gap: 14 },
  cardMain: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  ref: { fontSize: 12, textAlign: "right" },
  row: { flexDirection: "row", marginTop: 4 },
  stockBox: { alignItems: "center", gap: 4, minWidth: 70 },
  stockNum: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  stockLabel: { fontSize: 11 },
  adjustBtn: { marginTop: 6, width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
