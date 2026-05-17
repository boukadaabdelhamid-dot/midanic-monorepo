import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  useCreateErpTransfer,
  useGetErpStores,
  useGetProducts,
  type Product,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Line { product: Product; qty: number }

export default function NewTransfer() {
  const colors = useColors();
  const router = useRouter();
  const { t, lang } = useLang();
  const [toStoreId, setToStoreId] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);

  const storesQ = useGetErpStores();
  const productsQ = useGetProducts({ search: search || undefined, limit: 30 });
  const create = useCreateErpTransfer();

  const products = productsQ.data?.products ?? [];
  const dest = (storesQ.data ?? []).find((s) => s.id === toStoreId);

  const add = (p: Product) => {
    setLines((l) => {
      const i = l.findIndex((x) => x.product.id === p.id);
      if (i >= 0) {
        const next = [...l];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...l, { product: p, qty: 1 }];
    });
    setPicker(false);
  };
  const setQty = (id: number, q: number) =>
    setLines((l) => (q <= 0 ? l.filter((x) => x.product.id !== id) : l.map((x) => (x.product.id === id ? { ...x, qty: q } : x))));

  const submit = async () => {
    if (!toStoreId || lines.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await create.mutateAsync({
        data: {
          destinationStoreId: toStoreId,
          mode: "request",
          items: lines.map((l) => ({ sourceProductId: l.product.id, quantity: l.qty })),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("تحويل جديد", "New Transfer")} showBack />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 140 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("إلى متجر", "To Store")}</Text>
        <View style={styles.storesRow}>
          {(storesQ.data ?? []).map((s) => {
            const active = toStoreId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setToStoreId(s.id)}
                style={[styles.storeChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.storeChipTxt, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {lang === "ar" ? s.nameAr : s.nameEn}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>{t("المنتجات", "Items")}</Text>
        <View style={styles.actionRow}>
          <Pressable style={[styles.action, { backgroundColor: colors.primary }]} onPress={() => setScan(true)}>
            <Feather name="maximize" size={14} color={colors.primaryForeground} />
            <Text style={[styles.actionTxt, { color: colors.primaryForeground }]}>{t("مسح", "Scan")}</Text>
          </Pressable>
          <Pressable style={[styles.action, { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setPicker(true)}>
            <Feather name="plus" size={14} color={colors.foreground} />
            <Text style={[styles.actionTxt, { color: colors.foreground }]}>{t("إضافة", "Add")}</Text>
          </Pressable>
        </View>

        {lines.map((l) => (
          <View key={l.product.id} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.lineName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
              {lang === "ar" ? l.product.nameAr : l.product.nameEn}
            </Text>
            <View style={styles.qtyBox}>
              <Pressable onPress={() => setQty(l.product.id, l.qty - 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                <Feather name="minus" size={12} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qty, { color: colors.foreground }]}>{l.qty}</Text>
              <Pressable onPress={() => setQty(l.product.id, l.qty + 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                <Feather name="plus" size={12} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        ))}
        {lines.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center", paddingVertical: 10 }}>
            {t("لا توجد عناصر بعد", "No items yet")}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable
          onPress={submit}
          disabled={create.isPending || !toStoreId || lines.length === 0}
          style={[styles.submit, { backgroundColor: colors.primary, opacity: create.isPending || !toStoreId || lines.length === 0 ? 0.5 : 1 }]}
        >
          {create.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="check" size={16} color={colors.primaryForeground} />
              <Text style={[styles.submitTxt, { color: colors.primaryForeground }]}>
                {t("إرسال", "Submit")} {dest ? `→ ${lang === "ar" ? dest.nameAr : dest.nameEn}` : ""}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <BarcodeScanner
        visible={scan}
        onClose={() => setScan(false)}
        onScanned={(code) => {
          setScan(false);
          const p = products.find((x) => x.barcode === code || x.reference === code);
          if (p) add(p);
          else setSearch(code);
        }}
      />

      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("بحث", "Search")}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <FlatList
              data={products}
              keyExtractor={(p) => String(p.id)}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => add(item)} style={[styles.pickRow, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }} numberOfLines={1}>
                    {lang === "ar" ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{item.barcode || item.reference || ""}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  storesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  storeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  storeChipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 8 },
  action: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  actionTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  line: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  lineName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 12, fontFamily: "Inter_700Bold", minWidth: 18, textAlign: "center" },
  footer: { borderTopWidth: 1, padding: 12, paddingBottom: 100 },
  submit: { padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  submitTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, gap: 8, maxHeight: "80%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_500Medium" },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
});
