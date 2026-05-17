import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import {
  useCreatePurchaseOrder,
  useGetProducts,
  useGetSuppliers,
  type Product,
  type Supplier,
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
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Line { product: Product; quantity: number; unitCost: string }

export default function NewPurchaseOrder() {
  const colors = useColors();
  const router = useRouter();
  const { t, lang } = useLang();
  const { isAdmin } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [notes, setNotes] = useState("");

  const suppliersQ = useGetSuppliers();
  const productsQ = useGetProducts({ search: search || undefined, limit: 30 });
  const create = useCreatePurchaseOrder();

  if (!isAdmin) return <Redirect href="/" />;

  const products = productsQ.data?.products ?? [];
  const suppliers = suppliersQ.data ?? [];

  const add = (p: Product) => {
    setLines((l) => [...l, { product: p, quantity: 1, unitCost: String(p.price) }]);
    setPicker(false);
  };
  const update = (i: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!supplier || lines.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await create.mutateAsync({
        data: {
          supplierId: supplier.id,
          notes: notes || undefined,
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            unitCost: Number(l.unitCost) || 0,
          })),
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
      <AdminHeader title={t("أمر شراء جديد", "New PO")} showBack />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 140 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("المورد", "Supplier")}</Text>
        <Pressable
          onPress={() => setSupplierPicker(true)}
          style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={{ color: supplier ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
            {supplier?.name ?? t("اختر موردًا", "Pick a supplier")}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 4 }]}>{t("المنتجات", "Items")}</Text>
        <Pressable
          style={[styles.action, { backgroundColor: colors.primary }]}
          onPress={() => setPicker(true)}
        >
          <Feather name="plus" size={14} color={colors.primaryForeground} />
          <Text style={[styles.actionTxt, { color: colors.primaryForeground }]}>{t("إضافة منتج", "Add Product")}</Text>
        </Pressable>

        {lines.map((l, i) => (
          <View key={`${l.product.id}-${i}`} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.lineHead}>
              <Text style={[styles.lineName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                {lang === "ar" ? l.product.nameAr : l.product.nameEn}
              </Text>
              <Pressable onPress={() => remove(i)} hitSlop={8}>
                <Feather name="x" size={16} color={colors.destructive} />
              </Pressable>
            </View>
            <View style={styles.lineFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>{t("الكمية", "Qty")}</Text>
                <TextInput
                  value={String(l.quantity)}
                  onChangeText={(v) => update(i, { quantity: Math.max(1, parseInt(v, 10) || 1) })}
                  keyboardType="number-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.fieldLbl, { color: colors.mutedForeground }]}>{t("التكلفة", "Unit Cost")}</Text>
                <TextInput
                  value={l.unitCost}
                  onChangeText={(v) => update(i, { unitCost: v })}
                  keyboardType="decimal-pad"
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
            </View>
          </View>
        ))}
        {lines.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center", paddingVertical: 10 }}>
            {t("لا توجد عناصر بعد", "No items yet")}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>{t("ملاحظات", "Notes")}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable
          onPress={submit}
          disabled={create.isPending || !supplier || lines.length === 0}
          style={[styles.submit, { backgroundColor: colors.primary, opacity: create.isPending || !supplier || lines.length === 0 ? 0.5 : 1 }]}
        >
          {create.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="check" size={16} color={colors.primaryForeground} />
              <Text style={[styles.submitTxt, { color: colors.primaryForeground }]}>{t("إنشاء", "Create")}</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={supplierPicker} transparent animationType="slide" onRequestClose={() => setSupplierPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setSupplierPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t("اختر موردًا", "Select Supplier")}</Text>
            <FlatList
              data={suppliers}
              keyExtractor={(s) => String(s.id)}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 16 }}>{t("لا يوجد موردون", "No suppliers")}</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => { setSupplier(item); setSupplierPicker(false); }} style={[styles.pickRow, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{item.name}</Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {lang === "ar" ? item.nameAr : item.nameEn}
                  </Text>
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
  selector: { padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10 },
  actionTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  line: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  lineHead: { flexDirection: "row", alignItems: "center" },
  lineName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lineFields: { flexDirection: "row", gap: 8 },
  fieldLbl: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: { borderTopWidth: 1, padding: 12, paddingBottom: 100 },
  submit: { padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  submitTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, gap: 8, maxHeight: "80%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
});
