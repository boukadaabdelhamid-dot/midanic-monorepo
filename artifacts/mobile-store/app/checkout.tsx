import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCreateOrder, useGetCart } from "@workspace/api-client-react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
type PaymentMethod = "cod" | "card";

async function createCheckoutSession(orderId: number): Promise<string> {
  const token = await import("@react-native-async-storage/async-storage").then(
    (m) => m.default.getItem("midanic_token")
  );
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] ?? "localhost";
  const res = await fetch(`https://${domain}/api/payments/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Payment setup failed");
  }
  const data: { url: string } = await res.json();
  return data.url;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const { couponCode } = useLocalSearchParams<{ couponCode?: string }>();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [loadingSession, setLoadingSession] = useState(false);

  const { data: cartItems = [] } = useGetCart();
  const createOrder = useCreateOrder();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
    0
  );

  const isProcessing = createOrder.isPending || loadingSession;

  const handlePlaceOrder = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert(
        t("خطأ", "Error"),
        t("يرجى ملء جميع الحقول", "Please fill all fields")
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createOrder.mutate(
      {
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          couponCode: couponCode || null,
          items: cartItems.map((item) => ({
            productId: item.product?.id ?? 0,
            quantity: item.quantity,
          })),
        },
      },
      {
        onSuccess: async (order) => {
          if (paymentMethod === "cod") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({
              pathname: "/order-confirmation",
              params: { orderId: String(order.id) },
            });
            return;
          }

          // Card payment: open Stripe Checkout Session in browser
          setLoadingSession(true);
          try {
            const url = await createCheckoutSession(order.id);
            const result = await WebBrowser.openAuthSessionAsync(url, "midanic://");
            if (result.type === "success" || result.type === "dismiss") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.replace({
                pathname: "/order-confirmation",
                params: { orderId: String(order.id) },
              });
            }
          } catch (err) {
            Alert.alert(
              t("خطأ في الدفع", "Payment Error"),
              (err as Error).message,
              [
                {
                  text: t("تابع بدون دفع", "Continue without payment"),
                  onPress: () =>
                    router.replace({
                      pathname: "/order-confirmation",
                      params: { orderId: String(order.id) },
                    }),
                },
                { text: t("إلغاء", "Cancel"), style: "cancel" },
              ]
            );
          } finally {
            setLoadingSession(false);
          }
        },
        onError: () => {
          Alert.alert(
            t("خطأ", "Error"),
            t("فشل في إنشاء الطلب", "Failed to place order")
          );
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("إتمام الطلب", "Checkout")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 100 },
        ]}
      >
        {/* Delivery details */}
        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground }]}
        >
          {t("بيانات التوصيل", "Delivery Details")}
        </Text>

        <View
          style={[
            styles.field,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="user" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t("الاسم الكامل", "Full Name")}
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View
          style={[
            styles.field,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="phone" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t("رقم الجوال", "Phone Number")}
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View
          style={[
            styles.field,
            styles.fieldMulti,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather
            name="map-pin"
            size={16}
            color={colors.mutedForeground}
            style={{ marginTop: 2 }}
          />
          <TextInput
            style={[
              styles.input,
              styles.inputMulti,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t("العنوان", "Address")}
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment method */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, marginTop: 16 },
          ]}
        >
          {t("طريقة الدفع", "Payment Method")}
        </Text>

        <Pressable
          onPress={() => setPaymentMethod("cod")}
          style={[
            styles.methodCard,
            {
              borderColor:
                paymentMethod === "cod" ? colors.primary : colors.border,
              backgroundColor:
                paymentMethod === "cod"
                  ? colors.primary + "10"
                  : colors.card,
            },
          ]}
        >
          <View
            style={[
              styles.methodRadio,
              {
                borderColor:
                  paymentMethod === "cod" ? colors.primary : colors.border,
              },
            ]}
          >
            {paymentMethod === "cod" && (
              <View
                style={[
                  styles.methodRadioFill,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: colors.foreground }]}>
              {t("الدفع عند الاستلام", "Cash on Delivery")}
            </Text>
            <Text
              style={[styles.methodDesc, { color: colors.mutedForeground }]}
            >
              {t("ادفع نقداً عند وصول طلبك", "Pay cash when your order arrives")}
            </Text>
          </View>
          <Feather name="dollar-sign" size={20} color={paymentMethod === "cod" ? colors.primary : colors.mutedForeground} />
        </Pressable>

        <Pressable
          onPress={() => setPaymentMethod("card")}
          style={[
            styles.methodCard,
            {
              borderColor:
                paymentMethod === "card" ? colors.primary : colors.border,
              backgroundColor:
                paymentMethod === "card"
                  ? colors.primary + "10"
                  : colors.card,
            },
          ]}
        >
          <View
            style={[
              styles.methodRadio,
              {
                borderColor:
                  paymentMethod === "card" ? colors.primary : colors.border,
              },
            ]}
          >
            {paymentMethod === "card" && (
              <View
                style={[
                  styles.methodRadioFill,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodTitle, { color: colors.foreground }]}>
              {t("الدفع بالبطاقة البنكية", "Pay with Card")}
            </Text>
            <Text
              style={[styles.methodDesc, { color: colors.mutedForeground }]}
            >
              {t("Visa، Mastercard وغيرها", "Visa, Mastercard & more")}
            </Text>
          </View>
          <Feather name="credit-card" size={20} color={paymentMethod === "card" ? colors.primary : colors.mutedForeground} />
        </Pressable>

        {/* Order summary */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, marginTop: 16 },
          ]}
        >
          {t("ملخص الطلب", "Order Summary")}
        </Text>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {cartItems.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text
                style={[styles.sumName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {t(item.product?.nameAr ?? "", item.product?.nameEn ?? "")} ×
                {item.quantity}
              </Text>
              <Text
                style={[styles.sumPrice, { color: colors.mutedForeground }]}
              >
                {(Number(item.product?.price ?? 0) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>
              {t("الإجمالي", "Total")}
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {t(
                `${subtotal.toFixed(2)} ر.س`,
                `SAR ${subtotal.toFixed(2)}`
              )}
            </Text>
          </View>
        </View>
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
        <Pressable
          testID="place-order-btn"
          style={({ pressed }) => [
            styles.placeBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : paymentMethod === "card" ? (
            <Text
              style={[styles.placeBtnText, { color: colors.primaryForeground }]}
            >
              {t("متابعة للدفع", "Continue to Payment")}
            </Text>
          ) : (
            <Text
              style={[styles.placeBtnText, { color: colors.primaryForeground }]}
            >
              {t("تأكيد الطلب", "Place Order")}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  fieldMulti: { alignItems: "flex-start", paddingVertical: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  inputMulti: { minHeight: 60, textAlignVertical: "top" },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  methodRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  methodRadioFill: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  methodText: { flex: 1 },
  methodTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  methodDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sumName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    marginRight: 8,
  },
  sumPrice: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  placeBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  placeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
