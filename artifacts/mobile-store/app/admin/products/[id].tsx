import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import {
  useGenerateProductBarcode,
  useGetProduct,
  useUpdateProduct,
} from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface FormState {
  nameAr: string;
  nameEn: string;
  nameFr: string;
  price: string;
  stock: string;
  imageUrl: string;
  barcode: string;
  isActive: boolean;
}

export default function ProductDetail() {
  const colors = useColors();
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(idParam, 10);
  const productQ = useGetProduct(id);
  const update = useUpdateProduct();
  const genBarcode = useGenerateProductBarcode();

  const [form, setForm] = useState<FormState>({
    nameAr: "", nameEn: "", nameFr: "", price: "0", stock: "0", imageUrl: "", barcode: "", isActive: true,
  });

  useEffect(() => {
    const p = productQ.data;
    if (!p) return;
    setForm({
      nameAr: p.nameAr ?? "",
      nameEn: p.nameEn ?? "",
      nameFr: (p as { nameFr?: string }).nameFr ?? "",
      price: String(p.price ?? "0"),
      stock: String(p.stock ?? 0),
      imageUrl: p.imageUrl ?? "",
      barcode: p.barcode ?? "",
      isActive: (p as { isActive?: boolean }).isActive ?? true,
    });
  }, [productQ.data]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const readErr = (e: unknown): string => {
    const err = e as { data?: { error?: string }; message?: string } | undefined;
    return err?.data?.error || err?.message || t("فشل الطلب", "Request failed");
  };

  const save = async () => {
    if (!isAdmin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg(null);
    try {
      await update.mutateAsync({
        id,
        data: {
          nameAr: form.nameAr,
          nameEn: form.nameEn,
          nameFr: form.nameFr || undefined,
          price: form.price,
          stock: parseInt(form.stock, 10) || 0,
          imageUrl: form.imageUrl || undefined,
          barcode: form.barcode || undefined,
          isActive: form.isActive,
        } as never,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      productQ.refetch();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(readErr(e));
    }
  };

  const generate = async () => {
    setErrorMsg(null);
    try {
      const r = await genBarcode.mutateAsync();
      const code = (r as { barcode?: string })?.barcode;
      if (code) setForm((f) => ({ ...f, barcode: code }));
      productQ.refetch();
    } catch (e) {
      setErrorMsg(readErr(e));
    }
  };

  if (productQ.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AdminHeader title={t("منتج", "Product")} showBack />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }
  if (!productQ.data) {
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
      <AdminHeader title={form.nameAr || t("منتج", "Product")} showBack />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 140 }}>
        <Field label={t("الاسم (عربي)", "Name (AR)")} value={form.nameAr} onChange={(v) => setForm({ ...form, nameAr: v })} editable={isAdmin} />
        <Field label={t("الاسم (إنجليزي)", "Name (EN)")} value={form.nameEn} onChange={(v) => setForm({ ...form, nameEn: v })} editable={isAdmin} />
        <Field label={t("الاسم (فرنسي)", "Name (FR)")} value={form.nameFr} onChange={(v) => setForm({ ...form, nameFr: v })} editable={isAdmin} />
        <Field label={t("السعر دج", "Price (DZD)")} value={form.price} onChange={(v) => setForm({ ...form, price: v })} editable={isAdmin} keyboardType="decimal-pad" />
        <Field label={t("المخزون", "Stock")} value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} editable={isAdmin} keyboardType="number-pad" />
        <Field label={t("رابط الصورة", "Image URL")} value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} editable={isAdmin} />

        <View>
          <Text style={[styles.lbl, { color: colors.mutedForeground }]}>{t("الباركود", "Barcode")}</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              value={form.barcode}
              onChangeText={(v) => setForm({ ...form, barcode: v })}
              editable={isAdmin}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, flex: 1 }]}
            />
            {isAdmin ? (
              <Pressable onPress={generate} style={[styles.genBtn, { borderColor: colors.primary }]} disabled={genBarcode.isPending}>
                <Feather name="refresh-ccw" size={14} color={colors.primary} />
                <Text style={[styles.genTxt, { color: colors.primary }]}>{t("توليد", "Gen")}</Text>
              </Pressable>
            ) : null}
          </View>
          {form.barcode ? (
            <Text style={[styles.barcodeMono, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}>
              {form.barcode}
            </Text>
          ) : null}
        </View>

        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{t("نشط", "Active")}</Text>
          <Switch
            value={form.isActive}
            onValueChange={(v) => setForm({ ...form, isActive: v })}
            disabled={!isAdmin}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        </View>

        {errorMsg ? (
          <View style={[styles.errorBox, { borderColor: "#dc2626", backgroundColor: "#fee2e2" }]}>
            <Feather name="alert-circle" size={14} color="#dc2626" />
            <Text style={styles.errorTxt}>{errorMsg}</Text>
          </View>
        ) : null}

        {isAdmin ? (
          <Pressable
            onPress={save}
            disabled={update.isPending}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: update.isPending ? 0.5 : 1 }]}
          >
            {update.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveTxt, { color: colors.primaryForeground }]}>{t("حفظ", "Save")}</Text>
            )}
          </Pressable>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center" }}>
            {t("التعديل متاح للمدير فقط", "Edit is admin-only")}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
}
function Field({ label, value, onChange, editable, keyboardType }: FieldProps) {
  const colors = useColors();
  return (
    <View>
      <Text style={[styles.lbl, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboardType}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, opacity: editable ? 1 : 0.6 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center", justifyContent: "center", flex: 1 },
  lbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium" },
  barcodeRow: { flexDirection: "row", gap: 8 },
  genBtn: { paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  genTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  barcodeMono: { marginTop: 6, padding: 10, borderWidth: 1, borderRadius: 8, fontFamily: "Inter_700Bold", letterSpacing: 4, fontSize: 16, textAlign: "center" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  saveTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderWidth: 1, borderRadius: 8 },
  errorTxt: { color: "#dc2626", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
});
