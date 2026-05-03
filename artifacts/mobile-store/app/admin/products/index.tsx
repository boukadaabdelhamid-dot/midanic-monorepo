import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetCategories,
  useGetProducts,
  type Product,
} from "@workspace/api-client-react";
import React, { useState } from "react";
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
import { EmptyState } from "@/components/admin/EmptyState";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const fmtDZ = (n: string | number) =>
  Number(n).toLocaleString("fr-DZ", { minimumFractionDigits: 2 }) + " دج";

export default function ProductsList() {
  const colors = useColors();
  const router = useRouter();
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const productsQ = useGetProducts({ search: search || undefined, categoryId: categoryId ?? undefined, limit: 100 });
  const categoriesQ = useGetCategories();
  const products = productsQ.data?.products ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("المنتجات", "Products")} showBack />
      <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("بحث", "Search")}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable onPress={() => setCategoryId(null)} style={[styles.chip, { backgroundColor: !categoryId ? colors.primary : colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chipTxt, { color: !categoryId ? colors.primaryForeground : colors.foreground }]}>{t("الكل", "All")}</Text>
        </Pressable>
        {(categoriesQ.data ?? []).map((c) => {
          const a = categoryId === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, { backgroundColor: a ? colors.primary : colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chipTxt, { color: a ? colors.primaryForeground : colors.foreground }]}>
                {lang === "ar" ? c.nameAr : c.nameEn}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {productsQ.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={productsQ.isRefetching} onRefresh={productsQ.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="tag" ar="لا توجد منتجات" en="No products" />}
          renderItem={({ item }: { item: Product }) => (
            <Pressable
              style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push(`/admin/products/${item.id}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {lang === "ar" ? item.nameAr : item.nameEn}
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.barcode || item.reference || "—"}
                </Text>
              </View>
              <Text style={[styles.price, { color: colors.primary }]}>{fmtDZ(item.price)}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginTop: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 10 },
  chips: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 12, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
