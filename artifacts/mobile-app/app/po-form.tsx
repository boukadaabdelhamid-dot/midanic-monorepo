import { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useCreatePurchaseOrder,
  useGetProducts,
  useGetSuppliers,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/Button";
import { CURRENCY, fmtNum } from "@/lib/format";

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

type POItem = { productId: number; productName: string; quantity: number; unitPrice: number };

export default function PoFormScreen() {
  const c = useColors();
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: suppliers } = useGetSuppliers();
  const { data: productsData } = useGetProducts({ limit: 30, search: productSearch || undefined });
  const createPO = useCreatePurchaseOrder();

  const supplierList = (suppliers ?? []) as any[];
  const productList = (productsData?.products ?? []) as any[];

  const addItem = (product: any) => {
    if (items.find((i) => i.productId === product.id)) return;
    setItems((prev) => [...prev, {
      productId: product.id,
      productName: product.nameAr || product.nameEn,
      quantity: 1,
      unitPrice: Number(product.costPrice ?? product.price ?? 0),
    }]);
  };

  const updateItem = (productId: number, field: "quantity" | "unitPrice", value: string) => {
    setItems((prev) =>
      prev.map((i) => i.productId === productId ? { ...i, [field]: Number(value) || 0 } : i),
    );
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = () => {
    if (!supplierId) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى اختيار المورد");
      return;
    }
    if (items.length === 0) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إضافة منتج واحد على الأقل");
      return;
    }
    createPO.mutate(
      {
        data: {
          supplierId,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="طلبية شراء جديدة" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: c.text }]}>المورد</Text>
        <View style={styles.supplierGrid}>
          {supplierList.map((s: any) => (
            <Pressable
              key={s.id}
              onPress={() => setSupplierId(s.id)}
              style={({ pressed }) => [
                styles.supplierBtn,
                { backgroundColor: supplierId === s.id ? c.primary : c.surface, borderColor: supplierId === s.id ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.supplierText, { color: supplierId === s.id ? c.onPrimary : c.text }]} numberOfLines={1}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>المنتجات</Text>
        <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="ابحث عن منتج…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>
        <View style={styles.productList}>
          {productList.map((p: any) => {
            const added = items.some((i) => i.productId === p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => addItem(p)}
                disabled={added}
                style={({ pressed }) => [
                  styles.productRow,
                  { backgroundColor: added ? c.surfaceAlt : c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.productName, { color: c.text }]} numberOfLines={1}>
                  {p.nameAr || p.nameEn}
                </Text>
                <Ionicons name={added ? "checkmark-circle" : "add-circle-outline"} size={20} color={added ? c.success : c.primary} />
              </Pressable>
            );
          })}
        </View>

        {items.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>البنود المختارة</Text>
            {items.map((item) => (
              <View key={item.productId} style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, { color: c.text }]} numberOfLines={1}>{item.productName}</Text>
                  <Pressable onPress={() => removeItem(item.productId)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={20} color={c.danger} />
                  </Pressable>
                </View>
                <View style={styles.itemInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: c.textMuted }]}>الكمية</Text>
                    <TextInput
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItem(item.productId, "quantity", v)}
                      keyboardType="numeric"
                      style={[styles.smallInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: c.textMuted }]}>سعر الوحدة</Text>
                    <TextInput
                      value={String(item.unitPrice)}
                      onChangeText={(v) => updateItem(item.productId, "unitPrice", v)}
                      keyboardType="decimal-pad"
                      style={[styles.smallInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: c.textMuted }]}>المجموع</Text>
                    <Text style={[styles.itemTotal, { color: c.success }]}>
                      {fmtNum(item.quantity * item.unitPrice, CURRENCY)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            <View style={[styles.totalRow, { borderColor: c.border }]}>
              <Text style={[styles.totalLabel, { color: c.text }]}>المجموع الكلي</Text>
              <Text style={[styles.totalValue, { color: c.success }]}>{fmtNum(total, CURRENCY)}</Text>
            </View>
          </>
        )}

        <Button label="إنشاء الطلبية" onPress={handleSubmit} loading={createPO.isPending} style={{ marginTop: 16 }} />
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
  sectionTitle: { fontSize: 16, fontWeight: "800", textAlign: "right", marginBottom: 10, marginTop: 16 },
  supplierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  supplierBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, maxWidth: "45%" },
  supplierText: { fontSize: 13, fontWeight: "600" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, textAlign: "right", height: "100%" as any },
  productList: { gap: 6 },
  productRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  productName: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  itemCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemName: { flex: 1, fontSize: 14, fontWeight: "700", textAlign: "right" },
  itemInputs: { flexDirection: "row", gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 11, textAlign: "center" },
  smallInput: { height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, fontSize: 14, textAlign: "center" },
  itemTotal: { fontSize: 14, fontWeight: "800", textAlign: "center", marginTop: 12 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: "800" },
  totalValue: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
