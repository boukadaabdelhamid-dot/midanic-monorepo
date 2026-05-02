import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function OrderConfirmationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.success + "22" }]}>
        <Feather name="check-circle" size={64} color={colors.success} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("تم الطلب بنجاح!", "Order Placed!")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {t(`رقم الطلب: #${orderId}`, `Order #${orderId}`)}
      </Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]}>
        {t(
          "سنتواصل معك قريباً لتأكيد الطلب وتحديد موعد التوصيل.",
          "We'll contact you soon to confirm your order and arrange delivery."
        )}
      </Text>
      <Pressable
        style={[styles.ordersBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.replace("/(tabs)/orders")}
      >
        <Text style={[styles.ordersBtnText, { color: colors.primaryForeground }]}>
          {t("عرض الطلبات", "View Orders")}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.homeBtn, { borderColor: colors.border }]}
        onPress={() => router.replace("/(tabs)/index")}
      >
        <Text style={[styles.homeBtnText, { color: colors.foreground }]}>
          {t("الرئيسية", "Home")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 16, fontFamily: "Inter_500Medium" },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 280 },
  ordersBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8, width: "100%" as const, alignItems: "center" },
  ordersBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  homeBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, borderWidth: 1, width: "100%" as const, alignItems: "center" },
  homeBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
