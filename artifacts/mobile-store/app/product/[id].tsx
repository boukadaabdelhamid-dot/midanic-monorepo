import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAddToCart, useGetProduct } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function StarRow({ rating }: { rating: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={14}
          color={s <= Math.round(rating) ? colors.warning : colors.muted}
        />
      ))}
    </View>
  );
}

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data: product, isLoading } = useGetProduct(Number(id));
  const addToCart = useAddToCart();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleAdd = () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart.mutate(
      { data: { productId: Number(id), quantity: qty } },
      {
        onSettled: () => setAdding(false),
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>
          {t("المنتج غير موجود", "Product not found")}
        </Text>
      </View>
    );
  }

  const name = t(product.nameAr, product.nameEn);
  const description = t(product.descriptionAr ?? "", product.descriptionEn ?? "");
  const price = Number(product.price);
  const inStock = product.stock > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="package" size={64} color={colors.mutedForeground} />
            </View>
          )}
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.card, top: topPad + 12 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          {!inStock && (
            <View style={[styles.outBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.outBadgeText}>{t("نفذ المخزون", "Out of Stock")}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
          <View style={styles.ratingRow}>
            <StarRow rating={Number(product.rating)} />
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {Number(product.rating).toFixed(1)} ({product.reviewCount} {t("تقييم", "reviews")})
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>
            {t(`${(price * qty).toFixed(2)} ر.س`, `SAR ${(price * qty).toFixed(2)}`)}
          </Text>
          <Text style={[styles.stockText, { color: inStock ? colors.success : colors.destructive }]}>
            {inStock ? t(`متوفر · ${product.stock} قطعة`, `In Stock · ${product.stock} left`) : t("غير متوفر", "Out of Stock")}
          </Text>

          {description.trim().length > 0 && (
            <>
              <Text style={[styles.descLabel, { color: colors.mutedForeground }]}>
                {t("الوصف", "Description")}
              </Text>
              <Text style={[styles.desc, { color: colors.foreground }]}>{description}</Text>
            </>
          )}

          {product.reviews && product.reviews.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.descLabel, { color: colors.mutedForeground }]}>
                {t("التقييمات", "Reviews")}
              </Text>
              {product.reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.revHeader}>
                    <Text style={[styles.revUser, { color: colors.foreground }]}>
                      {rev.userName ?? t("مستخدم", "User")}
                    </Text>
                    <StarRow rating={rev.rating} />
                  </View>
                  {rev.comment && (
                    <Text style={[styles.revComment, { color: colors.mutedForeground }]}>
                      {rev.comment}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {inStock && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 16 },
          ]}
        >
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.qtyBtn, { borderColor: colors.border }]}
              onPress={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Feather name="minus" size={16} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.qtyText, { color: colors.foreground }]}>{qty}</Text>
            <Pressable
              style={[styles.qtyBtn, { borderColor: colors.border }]}
              onPress={() => setQty((q) => Math.min(product.stock, q + 1))}
            >
              <Feather name="plus" size={16} color={colors.foreground} />
            </Pressable>
          </View>
          <Pressable
            testID="add-to-cart-btn"
            style={[styles.addBtn, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleAdd}
            disabled={adding || addToCart.isPending}
          >
            {adding || addToCart.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="shopping-cart" size={18} color={colors.primaryForeground} />
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                  {t("أضف للسلة", "Add to Cart")}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageContainer: { width: "100%", aspectRatio: 1, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: { position: "absolute", left: 16, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  outBadge: { position: "absolute", bottom: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  outBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 10 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  price: { fontSize: 26, fontFamily: "Inter_700Bold" },
  stockText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  descLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  reviewCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8, gap: 6 },
  revHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  revUser: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  revComment: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, gap: 12 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, gap: 8 },
  addBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
