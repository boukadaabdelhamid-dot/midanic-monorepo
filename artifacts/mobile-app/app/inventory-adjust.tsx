import { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdjustInventory, useGetProducts } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingState } from "@/components/ErpUi";
import { Button } from "@/components/Button";
import { fmtInt } from "@/lib/format";

function BackHeader({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: c.primaryDeep, paddingTop: insets.top + (Platform.OS === "web" ? 12 : 8) }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );
}

const REASONS = ["جرد", "تلف/هالك", "إرجاع", "هدية", "تصحيح خطأ", "أخرى"];

export default function InventoryAdjustScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");

  const { data: productsData, isLoading } = useGetProducts({ limit: 200 });
  const adjustInventory = useAdjustInventory();

  const product = useMemo(
    () => ((productsData?.products ?? []) as any[]).find((p: any) => p.id === productId),
    [productsData, productId],
  );

  const handleAdjust = () => {
    const qty = Number(quantity);
    if (!qty || isNaN(qty)) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إدخال كمية صحيحة");
      return;
    }
    const finalReason = reason === "أخرى" ? customReason : reason;
    adjustInventory.mutate(
      {
        productId,
        data: {
          quantity: adjustType === "subtract" ? -qty : qty,
          reason: finalReason || "",
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  if (isLoading) return <LoadingState />;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="تعديل المخزون" />
      <ScrollView contentContainerStyle={styles.content}>
        {product && (
          <View style={[styles.productCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.productName, { color: c.text }]} numberOfLines={2}>
              {product.nameAr || product.nameEn}
            </Text>
            {product.reference ? (
              <Text style={[styles.productRef, { color: c.textMuted }]}>{product.reference}</Text>
            ) : null}
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: c.textMuted }]}>المخزون الحالي:</Text>
              <Text style={[styles.stockValue, { color: c.text }]}>{fmtInt(product.stock)} وحدة</Text>
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>نوع التعديل</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setAdjustType("add")}
              style={({ pressed }) => [
                styles.typeBtn,
                { backgroundColor: adjustType === "add" ? c.success : c.surface, borderColor: adjustType === "add" ? c.success : c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="add-circle" size={18} color={adjustType === "add" ? "#FFFFFF" : c.success} />
              <Text style={[styles.typeText, { color: adjustType === "add" ? "#FFFFFF" : c.success }]}>إضافة</Text>
            </Pressable>
            <Pressable
              onPress={() => setAdjustType("subtract")}
              style={({ pressed }) => [
                styles.typeBtn,
                { backgroundColor: adjustType === "subtract" ? c.danger : c.surface, borderColor: adjustType === "subtract" ? c.danger : c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="remove-circle" size={18} color={adjustType === "subtract" ? "#FFFFFF" : c.danger} />
              <Text style={[styles.typeText, { color: adjustType === "subtract" ? "#FFFFFF" : c.danger }]}>خصم</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الكمية *</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            placeholderTextColor={c.textMuted}
            keyboardType="numeric"
            style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
        </View>

        {product && quantity && !isNaN(Number(quantity)) && (
          <View style={[styles.preview, { backgroundColor: adjustType === "add" ? c.success + "18" : c.danger + "18", borderColor: adjustType === "add" ? c.success + "44" : c.danger + "44" }]}>
            <Text style={[styles.previewText, { color: adjustType === "add" ? c.success : c.danger }]}>
              المخزون بعد التعديل: {fmtInt(product.stock + (adjustType === "add" ? 1 : -1) * Number(quantity))} وحدة
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>السبب</Text>
          <View style={styles.reasonGrid}>
            {REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r === reason ? "" : r)}
                style={({ pressed }) => [
                  styles.reasonBtn,
                  { backgroundColor: r === reason ? c.primary : c.surface, borderColor: r === reason ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.reasonText, { color: r === reason ? c.onPrimary : c.text }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          {reason === "أخرى" && (
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="اكتب السبب…"
              placeholderTextColor={c.textMuted}
              style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border, marginTop: 10 }]}
            />
          )}
        </View>

        <Button label="تأكيد التعديل" onPress={handleAdjust} loading={adjustInventory.isPending} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  content: { padding: 16, paddingBottom: 48, gap: 4 },
  productCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, gap: 6 },
  productName: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  productRef: { fontSize: 13, textAlign: "right" },
  stockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  stockLabel: { fontSize: 14 },
  stockValue: { fontSize: 16, fontWeight: "800" },
  field: { gap: 8, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, textAlign: "right" },
  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 15, fontWeight: "700" },
  preview: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, alignItems: "center" },
  previewText: { fontSize: 15, fontWeight: "800" },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  reasonText: { fontSize: 13, fontWeight: "700" },
});
