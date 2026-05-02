import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAddToCart, useGetCategories, useGetProducts } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryChip } from "@/components/CategoryChip";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/LoadingSkeleton";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Product } from "@workspace/api-client-react";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);

  const { data: categoriesData } = useGetCategories();
  const { data: productsData, isLoading, refetch, isRefetching } = useGetProducts({
    categoryId: selectedCategoryId,
    limit: 20,
  });

  const addToCart = useAddToCart();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleAddToCart = (product: Product) => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart.mutate({ productId: product.id, quantity: 1 });
  };

  const products = productsData?.products ?? [];
  const categories = categoriesData ?? [];

  const skeletonKeys = ["s1", "s2", "s3", "s4", "s5", "s6"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: topPad + 12 },
        ]}
      >
        <Image
          source={require("../../assets/midanic-logo.jpg")}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.brandName}>MIDANIC</Text>
          <Text style={styles.brandAr}>ميدانيك</Text>
        </View>
        <Pressable
          style={styles.searchBtn}
          onPress={() => router.push("/(tabs)/search")}
        >
          <Feather name="search" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
          contentContainerStyle={styles.categoriesContent}
        >
          <CategoryChip
            label={t("الكل", "All")}
            selected={selectedCategoryId === undefined}
            onPress={() => setSelectedCategoryId(undefined)}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={t(cat.nameAr, cat.nameEn)}
              selected={selectedCategoryId === cat.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCategoryId(cat.id);
              }}
            />
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {t("المنتجات", "Products")}
        </Text>

        {isLoading ? (
          <View style={styles.grid}>
            {skeletonKeys.map((k) => (
              <View key={k} style={styles.gridItem}>
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        ) : products.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t("لا توجد منتجات", "No products found")}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((product) => (
              <View key={product.id} style={styles.gridItem}>
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerText: { flex: 1 },
  brandName: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  brandAr: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 12 },
  categories: { marginBottom: 16 },
  categoriesContent: { paddingRight: 12 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridItem: { width: "50%" },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
