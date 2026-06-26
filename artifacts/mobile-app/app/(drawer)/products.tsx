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
import { useGetLowStock, useGetProducts, type Product } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";

function ProductCard({ product, isLow }: { product: Product; isLow: boolean }) {
  const c = useColors();
  const name = product.nameAr || product.nameEn;
  const stockColor = product.stock <= 0 ? c.danger : isLow ? c.warning : c.success;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/product-form", params: { id: product.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardMain}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
          {name}
        </Text>
        {product.nameEn && product.nameAr && (
          <Text style={[styles.nameSecond, { color: c.textMuted }]} numberOfLines={1}>
            {product.nameEn}
          </Text>
        )}
        {product.reference ? (
          <Text style={[styles.ref, { color: c.textMuted }]} numberOfLines={1}>
            {product.reference}
          </Text>
        ) : null}
        <Text style={[styles.price, { color: c.primaryTint }]}>
          {fmtNum(product.price, CURRENCY)}
        </Text>
      </View>
      <View style={styles.stockBox}>
        <Text style={[styles.stockNum, { color: stockColor }]}>
          {fmtInt(product.stock)}
        </Text>
        <Text style={[styles.stockLabel, { color: c.textMuted }]}>وحدة</Text>
        {product.stock <= 0 ? (
          <Pill label="نفد" color={c.danger} />
        ) : isLow ? (
          <Pill label="منخفض" color={c.warning} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ProductsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");

  const products = useGetProducts({ limit: 60, search: search || undefined });
  const lowStock = useGetLowStock();

  const lowIds = useMemo(() => new Set((lowStock.data ?? []).map((p) => p.id)), [lowStock.data]);
  const items = useMemo(() => products.data?.products ?? [], [products.data]);

  const AddButton = isAdmin ? (
    <Pressable
      onPress={() => router.push("/product-form")}
      style={({ pressed }) => [styles.fabInHeader, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="المنتجات" subtitle="Articles" rightAction={AddButton} />

      <View style={[styles.searchWrap, { backgroundColor: c.background }]}>
        <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن منتج…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {products.data ? (
          <Text style={[styles.count, { color: c.textMuted }]}>
            {fmtInt(products.data.total)} منتج
          </Text>
        ) : null}
      </View>

      {products.isLoading ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState onRetry={() => void products.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ProductCard product={item} isLow={lowIds.has(item.id)} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="cube-outline" message="لا توجد منتجات" />}
          refreshControl={
            <RefreshControl
              refreshing={products.isFetching}
              onRefresh={() => { void products.refetch(); void lowStock.refetch(); }}
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
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 15, textAlign: "right", height: "100%" as any },
  count: { fontSize: 12, textAlign: "right", marginTop: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", borderRadius: 16,
    borderWidth: 1, padding: 16, gap: 14,
  },
  cardMain: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  nameSecond: { fontSize: 13, marginTop: 2, textAlign: "right" },
  ref: { fontSize: 12, marginTop: 3, textAlign: "right" },
  price: { fontSize: 15, fontWeight: "800", marginTop: 8, textAlign: "right" },
  stockBox: { alignItems: "center", gap: 4, minWidth: 64 },
  stockNum: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  stockLabel: { fontSize: 11 },
  fabInHeader: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
