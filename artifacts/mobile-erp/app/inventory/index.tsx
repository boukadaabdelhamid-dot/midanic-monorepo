import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetCategories,
  useGetInventoryStock,
  useGetProducts,
  type Product,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { EmptyState } from "@/components/admin/EmptyState";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function InventoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const stockQ = useGetInventoryStock();
  const productsQ = useGetProducts({ search: search || undefined, categoryId: categoryId ?? undefined, limit: 100 });
  const categoriesQ = useGetCategories();

  const stockMap = useMemo(() => {
    const m = new Map<number, { stock: number; status: string }>();
    (stockQ.data ?? []).forEach((s) => m.set(s.id, { stock: s.stock, status: s.status }));
    return m;
  }, [stockQ.data]);

  const products = productsQ.data?.products ?? [];

  const handleScanned = (code: string) => {
    setScanOpen(false);
    const match = products.find((p) => p.barcode === code || p.reference === code);
    if (match) router.push(`/inventory/${match.id}`);
    else setSearch(code);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("المخزون", "Inventory")} showBack />

      <View style={styles.searchBar}>
        <View style={[styles.searchInputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("بحث", "Search")}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
        <Pressable
          onPress={() => setScanOpen(true)}
          style={[styles.scanBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="maximize" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable
          onPress={() => setCategoryId(null)}
          style={[
            styles.chip,
            { backgroundColor: !categoryId ? colors.primary : colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chipText, { color: !categoryId ? colors.primaryForeground : colors.foreground }]}>
            {t("الكل", "All")}
          </Text>
        </Pressable>
        {(categoriesQ.data ?? []).map((c) => {
          const active = categoryId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[
                styles.chip,
                { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                {lang === "ar" ? c.nameAr : c.nameEn}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {productsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl
              refreshing={productsQ.isRefetching || stockQ.isRefetching}
              onRefresh={() => { productsQ.refetch(); stockQ.refetch(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<EmptyState icon="box" ar="لا توجد منتجات" en="No products" />}
          renderItem={({ item }: { item: Product }) => {
            const sm = stockMap.get(item.id);
            const stock = sm?.stock ?? item.stock;
            const isCritical = stock <= 3;
            const isLow = stock <= 10 && !isCritical;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push(`/inventory/${item.id}` as never)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {lang === "ar" ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.reference || item.barcode || "—"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.stock, { color: colors.foreground }]}>{stock}</Text>
                  {isCritical ? (
                    <View style={[styles.badge, { backgroundColor: colors.destructive + "22" }]}>
                      <Text style={[styles.badgeTxt, { color: colors.destructive }]}>{t("حرج", "Critical")}</Text>
                    </View>
                  ) : isLow ? (
                    <View style={[styles.badge, { backgroundColor: colors.warning + "22" }]}>
                      <Text style={[styles.badgeTxt, { color: colors.warning }]}>{t("منخفض", "Low")}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <BarcodeScanner visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={handleScanned} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  searchBar: { flexDirection: "row", padding: 12, gap: 8 },
  searchInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 10 },
  scanBtn: { width: 42, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  chips: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 12, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  stock: { fontSize: 16, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
});
