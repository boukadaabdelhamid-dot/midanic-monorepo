import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import {
  useAdjustInventory,
  useGetInventoryStock,
  useGetProduct,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function InventoryDetail() {
  const colors = useColors();
  const { t, lang } = useLang();
  const { isAdmin } = useAuth();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const id = parseInt(productId, 10);
  const productQ = useGetProduct(id);
  const stockQ = useGetInventoryStock();
  const adjust = useAdjustInventory();

  const [adjOpen, setAdjOpen] = useState(false);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");

  const product = productQ.data;
  const stockEntry = (stockQ.data ?? []).find((s) => s.id === id);

  const handleAdjust = async () => {
    const q = parseInt(delta, 10);
    if (isNaN(q) || q === 0 || !reason.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await adjust.mutateAsync({ data: { productId: id, quantity: q, reason: reason.trim() } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdjOpen(false);
      setDelta("0");
      setReason("");
      productQ.refetch();
      stockQ.refetch();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (productQ.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AdminHeader title={t("منتج", "Product")} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }
  if (!product) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AdminHeader title={t("منتج", "Product")} showBack />
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>{t("غير موجود", "Not found")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={lang === "ar" ? product.nameAr : product.nameEn} showBack />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 140, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("المخزون الحالي", "Current Stock")}</Text>
          <Text style={[styles.bigNum, { color: colors.foreground }]}>{stockEntry?.stock ?? product.stock}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {product.reference || product.barcode || "—"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("التفاصيل", "Details")}</Text>
          <Row label={t("السعر", "Price")} value={`${Number(product.price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج`} />
          <Row label={t("الباركود", "Barcode")} value={product.barcode ?? "—"} />
          <Row label={t("المرجع", "Reference")} value={product.reference ?? "—"} />
          <Row label={t("الفئة", "Category")} value={String(product.categoryId ?? "—")} />
        </View>

        {isAdmin ? (
          <Pressable
            style={[styles.adjustBtn, { backgroundColor: colors.primary }]}
            onPress={() => setAdjOpen(true)}
          >
            <Feather name="sliders" size={16} color={colors.primaryForeground} />
            <Text style={[styles.adjustBtnTxt, { color: colors.primaryForeground }]}>
              {t("تعديل المخزون", "Adjust Stock")}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {t("التعديل متاح للمدير فقط", "Adjustments are admin-only")}
          </Text>
        )}
      </ScrollView>

      <Modal visible={adjOpen} transparent animationType="slide" onRequestClose={() => setAdjOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setAdjOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t("تعديل المخزون", "Adjust Stock")}</Text>
            <TextInput
              value={delta}
              onChangeText={setDelta}
              placeholder="±qty"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("السبب", "Reason")}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: adjust.isPending ? 0.6 : 1 }]}
              onPress={handleAdjust}
              disabled={adjust.isPending}
            >
              <Text style={[styles.primaryBtnTxt, { color: colors.primaryForeground }]}>
                {t("تأكيد", "Confirm")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center", justifyContent: "center", flex: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  bigNum: { fontSize: 32, fontFamily: "Inter_700Bold", marginVertical: 2 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adjustBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12 },
  adjustBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 36, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium" },
  primaryBtn: { padding: 12, borderRadius: 10, alignItems: "center" },
  primaryBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
