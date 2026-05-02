import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetOrder } from "@workspace/api-client-react";
import React from "react";
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
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading } = useGetOrder(Number(id));

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>
          {t("الطلب غير موجود", "Order not found")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("تفاصيل الطلب", "Order Details")}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad + 20 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              {t("رقم الطلب", "Order ID")}
            </Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>#{order.id}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              {t("الحالة", "Status")}
            </Text>
            <OrderStatusBadge status={order.status} />
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              {t("التاريخ", "Date")}
            </Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
              {t("الإجمالي", "Total")}
            </Text>
            <Text style={[styles.cardValueBold, { color: colors.primary }]}>
              {t(`${Number(order.totalAmount).toFixed(2)} ر.س`, `SAR ${Number(order.totalAmount).toFixed(2)}`)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t("بيانات التوصيل", "Delivery")}
          </Text>
          <Text style={[styles.deliveryText, { color: colors.foreground }]}>{order.customerName}</Text>
          <Text style={[styles.deliveryText, { color: colors.foreground }]}>{order.customerPhone}</Text>
          <Text style={[styles.deliveryText, { color: colors.foreground }]}>{order.customerAddress}</Text>
        </View>

        {order.items && order.items.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {t("المنتجات", "Items")}
            </Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                {item.product?.imageUrl ? (
                  <Image source={{ uri: item.product.imageUrl }} style={styles.itemImg} contentFit="cover" />
                ) : (
                  <View style={[styles.itemImg, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="package" size={14} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                    {t(item.product?.nameAr ?? "", item.product?.nameEn ?? "")}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                    ×{item.quantity} · {t(`${Number(item.unitPrice ?? 0).toFixed(2)} ر.س`, `SAR ${Number(item.unitPrice ?? 0).toFixed(2)}`)}
                  </Text>
                </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  cardValueBold: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  deliveryText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemImg: { width: 40, height: 40, borderRadius: 8 },
  itemName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemQty: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
