import { useEffect, useState } from "react";
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
import {
  useCreateErpTransfer,
  useGetErpTransfer,
  useGetProducts,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingState, ErrorState, Pill } from "@/components/ErpUi";
import { Button } from "@/components/Button";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

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

type TransferItem = { productId: number; productName: string; quantity: number };

export default function TransferDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;
  const transferId = Number(id);

  const [toStore, setToStore] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const transfer = useGetErpTransfer(isNew ? 0 : transferId);
  const createTransfer = useCreateErpTransfer();
  const products = useGetProducts({ limit: 30, search: productSearch || undefined });
  const productList = (products.data?.products ?? []) as any[];

  const t = transfer.data as any;

  const addItem = (p: any) => {
    if (items.find((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, productName: p.nameAr || p.nameEn, quantity: 1 }]);
  };

  const handleCreate = () => {
    if (!toStore.trim()) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى تحديد المتجر المستلِم");
      return;
    }
    if (items.length === 0) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إضافة منتج واحد على الأقل");
      return;
    }
    createTransfer.mutate(
      { data: { toStoreId: Number(toStore), notes: notes || undefined, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) } as any },
      { onSuccess: () => router.back() },
    );
  };

  if (!isNew && transfer.isLoading) return <View style={[{ flex: 1 }, { backgroundColor: c.background }]}><BackHeader title="تفاصيل التحويل" /><LoadingState /></View>;
  if (!isNew && transfer.isError) return <View style={[{ flex: 1 }, { backgroundColor: c.background }]}><BackHeader title="تفاصيل التحويل" /><ErrorState onRetry={() => void transfer.refetch()} /></View>;

  if (!isNew && t) {
    const tItems = (t.items ?? []) as any[];
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <BackHeader title={`تحويل ${t.reference || `#${t.id}`}`} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.ref, { color: c.textMuted }]}>{t.reference || `#${t.id}`}</Text>
              <Pill label={t.status} color={t.status === "received" ? c.success : t.status === "cancelled" ? c.danger : c.warning} />
            </View>
            <View style={styles.storeRow}>
              <Text style={[styles.storeName, { color: c.text }]}>{t.fromStoreName || t.fromStore?.nameAr || "—"}</Text>
              <Ionicons name="arrow-back" size={18} color={c.textMuted} />
              <Text style={[styles.storeName, { color: c.text }]}>{t.toStoreName || t.toStore?.nameAr || "—"}</Text>
            </View>
            <Text style={[styles.date, { color: c.textMuted }]}>{fmtDate(t.createdAt)}</Text>
          </View>
          {tItems.length > 0 && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>المنتجات ({tItems.length})</Text>
              {tItems.map((item: any, i: number) => (
                <View key={i} style={[styles.itemRow, { borderBottomColor: c.border }]}>
                  <Text style={[styles.itemName, { color: c.text }]} numberOfLines={1}>{item.nameAr || item.nameEn || item.productName || "—"}</Text>
                  <Text style={[styles.itemQty, { color: c.textMuted }]}>× {item.quantity}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="تحويل مخزون جديد" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>معرّف المتجر المستلِم</Text>
          <TextInput
            value={toStore}
            onChangeText={setToStore}
            placeholder="رقم المتجر"
            placeholderTextColor={c.textMuted}
            keyboardType="numeric"
            style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>ملاحظات</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="ملاحظات اختيارية…"
            placeholderTextColor={c.textMuted}
            style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
        </View>
        <Text style={[styles.sectionTitle, { color: c.text }]}>المنتجات</Text>
        <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="ابحث…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>
        {productList.map((p: any) => {
          const added = items.some((i) => i.productId === p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => addItem(p)}
              style={({ pressed }) => [styles.pRow, { backgroundColor: added ? c.surfaceAlt : c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.pName, { color: c.text }]} numberOfLines={1}>{p.nameAr || p.nameEn}</Text>
              <Text style={[styles.pStock, { color: c.textMuted }]}>مخزون: {p.stock}</Text>
              <Ionicons name={added ? "checkmark-circle" : "add-circle-outline"} size={20} color={added ? c.success : c.primary} />
            </Pressable>
          );
        })}
        {items.length > 0 && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>المختار ({items.length})</Text>
            {items.map((item) => (
              <View key={item.productId} style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.itemName, { color: c.text, flex: 1 }]} numberOfLines={1}>{item.productName}</Text>
                <TextInput
                  value={String(item.quantity)}
                  onChangeText={(v) => setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, quantity: Number(v) || 1 } : i))}
                  keyboardType="numeric"
                  style={[styles.qtyInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                />
                <Pressable onPress={() => setItems((prev) => prev.filter((i) => i.productId !== item.productId))} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={20} color={c.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Button label="إنشاء التحويل" onPress={handleCreate} loading={createTransfer.isPending} style={{ marginTop: 16 }} />
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
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10, marginBottom: 14 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ref: { fontSize: 14 },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeName: { flex: 1, fontSize: 15, fontWeight: "700" },
  date: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: "800", textAlign: "right", marginBottom: 10, marginTop: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  itemName: { fontSize: 14, fontWeight: "600", flex: 1 },
  itemQty: { fontSize: 14 },
  field: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, textAlign: "right" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, textAlign: "right", height: "100%" as any },
  pRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
  pName: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  pStock: { fontSize: 12, marginRight: 8 },
  itemCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  qtyInput: { width: 60, height: 36, borderRadius: 8, borderWidth: 1, textAlign: "center", fontSize: 15 },
});
