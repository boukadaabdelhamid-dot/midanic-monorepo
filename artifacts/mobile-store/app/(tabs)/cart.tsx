import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  useGetCart,
  useRemoveFromCart,
  useUpdateCartItem,
  useValidateCoupon,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: string;
  } | null>(null);

  const { data: cartItems = [], isLoading, refetch } = useGetCart({
    query: { enabled: !!user },
  });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const validateCoupon = useValidateCoupon();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("سلة التسوق", "Your Cart")}
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {t("سجّل دخولك لعرض سلتك", "Sign in to view your cart")}
        </Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
            {t("تسجيل الدخول", "Sign In")}
          </Text>
        </Pressable>
      </View>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (Number(item.product?.price ?? 0) * item.quantity);
  }, 0);
  const discountNum = appliedCoupon ? Number(appliedCoupon.discount) : 0;
  const total = Math.max(0, subtotal - discountNum);

  const handleCoupon = () => {
    if (!couponCode.trim()) return;
    validateCoupon.mutate(
      { code: couponCode.trim(), orderTotal: subtotal },
      {
        onSuccess: (data) => {
          if (data.valid && data.discount) {
            setAppliedCoupon({ code: couponCode.trim(), discount: data.discount });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert(t("كود غير صالح", "Invalid coupon"), t("الكود غير صحيح", "The code is not valid"));
          }
        },
      }
    );
  };

  const handleCheckout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/checkout",
      params: { couponCode: appliedCoupon?.code ?? "" },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("سلة التسوق", "Cart")}
        </Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {cartItems.length} {t("منتج", "items")}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.center}>
          <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("السلة فارغة", "Cart is empty")}
          </Text>
          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/index")}
          >
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
              {t("تسوّق الآن", "Shop Now")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: 180 + bottomPad }]}
          >
            {cartItems.map((item) => {
              const productName = t(item.product?.nameAr ?? "", item.product?.nameEn ?? "");
              const price = Number(item.product?.price ?? 0);
              return (
                <View
                  key={item.id}
                  style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {item.product?.imageUrl ? (
                    <Image
                      source={{ uri: item.product.imageUrl }}
                      style={styles.cartImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.cartImg, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="package" size={20} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={styles.cartInfo}>
                    <Text style={[styles.cartName, { color: colors.foreground }]} numberOfLines={2}>
                      {productName}
                    </Text>
                    <Text style={[styles.cartPrice, { color: colors.primary }]}>
                      {t(`${(price * item.quantity).toFixed(2)} ر.س`, `SAR ${(price * item.quantity).toFixed(2)}`)}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <Pressable
                      style={[styles.qtyBtn, { borderColor: colors.border }]}
                      onPress={() => {
                        if (item.quantity <= 1) {
                          removeItem.mutate({ productId: item.product?.id ?? 0 });
                        } else {
                          updateItem.mutate({ productId: item.product?.id ?? 0, data: { quantity: item.quantity - 1 } });
                        }
                      }}
                    >
                      <Feather name={item.quantity <= 1 ? "trash-2" : "minus"} size={14} color={item.quantity <= 1 ? colors.destructive : colors.foreground} />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                    <Pressable
                      style={[styles.qtyBtn, { borderColor: colors.border }]}
                      onPress={() => updateItem.mutate({ productId: item.product?.id ?? 0, data: { quantity: item.quantity + 1 } })}
                    >
                      <Feather name="plus" size={14} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <View style={[styles.couponRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.couponInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder={t("كود الخصم", "Coupon code")}
                placeholderTextColor={colors.mutedForeground}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                editable={!appliedCoupon}
              />
              <Pressable
                style={[styles.couponBtn, { backgroundColor: appliedCoupon ? colors.success : colors.primary }]}
                onPress={appliedCoupon ? () => { setAppliedCoupon(null); setCouponCode(""); } : handleCoupon}
                disabled={validateCoupon.isPending}
              >
                {validateCoupon.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name={appliedCoupon ? "check" : "tag"} size={16} color="#fff" />
                )}
              </Pressable>
            </View>

            {appliedCoupon && (
              <Text style={[styles.couponApplied, { color: colors.success }]}>
                {t(`وفرت ${Number(appliedCoupon.discount).toFixed(2)} ر.س`, `Saved SAR ${Number(appliedCoupon.discount).toFixed(2)}`)}
              </Text>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: bottomPad + 16,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                {t("المجموع الفرعي", "Subtotal")}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {t(`${subtotal.toFixed(2)} ر.س`, `SAR ${subtotal.toFixed(2)}`)}
              </Text>
            </View>
            {discountNum > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>{t("الخصم", "Discount")}</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -{t(`${discountNum.toFixed(2)} ر.س`, `SAR ${discountNum.toFixed(2)}`)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>{t("الإجمالي", "Total")}</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {t(`${total.toFixed(2)} ر.س`, `SAR ${total.toFixed(2)}`)}
              </Text>
            </View>
            <Pressable
              testID="checkout-btn"
              style={({ pressed }) => [
                styles.checkoutBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleCheckout}
            >
              <Text style={[styles.checkoutBtnText, { color: colors.primaryForeground }]}>
                {t("إتمام الطلب", "Checkout")}
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerCount: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  loginBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  loginBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 12 },
  cartItem: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, overflow: "hidden", padding: 12, gap: 12 },
  cartImg: { width: 60, height: 60, borderRadius: 8 },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  cartPrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "center" },
  couponRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  couponInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  couponBtn: { paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  couponApplied: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 4 },
  checkoutBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
