import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Product } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LanguageContext";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const colors = useColors();
  const { t } = useLang();
  const router = useRouter();
  const name = t(product.nameAr, product.nameEn);
  const price = Number(product.price).toFixed(2);
  const inStock = product.stock > 0;

  return (
    <Pressable
      testID="product-card"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/product/${product.id}`);
      }}
    >
      <View style={[styles.imageWrapper, { backgroundColor: colors.muted }]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="package" size={32} color={colors.mutedForeground} />
          </View>
        )}
        {!inStock && (
          <View style={[styles.outOfStockBadge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.outOfStockText}>{t("نفذ", "Out of stock")}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        {(() => {
          const desc = t(product.descriptionAr ?? "", product.descriptionEn ?? "").trim();
          return desc.length > 0 ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {desc}
            </Text>
          ) : null;
        })()}
        <View style={styles.row}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {t(`${price} دج`, `${price} دج`)}
          </Text>
          {product.reviewCount > 0 && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={11} color={colors.warning} />
              <Text style={[styles.rating, { color: colors.mutedForeground }]}>
                {Number(product.rating).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        {onAddToCart && inStock && (
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddToCart(product);
            }}
          >
            <Feather name="shopping-cart" size={14} color={colors.primaryForeground} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
    margin: 4,
  },
  imageWrapper: {
    aspectRatio: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  info: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  desc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rating: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    marginTop: 4,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
