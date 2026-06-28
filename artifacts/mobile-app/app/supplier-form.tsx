import { useEffect, useMemo, useState } from "react";
import {
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
  useCreateSupplier,
  useGetSuppliers,
  useUpdateSupplier,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingState } from "@/components/ErpUi";
import { Button } from "@/components/Button";

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

function Field({ label, value, onChangeText, keyboardType }: any) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType ?? "default"}
        style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
      />
    </View>
  );
}

export default function SupplierFormScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const { data: suppliers, isLoading } = useGetSuppliers();
  const supplier = useMemo(
    () => isEdit ? ((suppliers ?? []) as any[]).find((s: any) => s.id === Number(id)) : null,
    [suppliers, id, isEdit],
  );

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  useEffect(() => {
    if (!supplier) return;
    setName(supplier.name ?? "");
    setPhone(supplier.phone ?? "");
    setEmail(supplier.email ?? "");
    setAddress(supplier.address ?? "");
    setCity(supplier.city ?? "");
    setNotes(supplier.notes ?? "");
  }, [supplier]);

  const handleSave = () => {
    const payload = {
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      city: city || undefined,
      notes: notes || undefined,
    };
    if (isEdit) {
      updateSupplier.mutate(
        { supplierId: Number(id), data: payload },
        { onSuccess: () => router.back() },
      );
    } else {
      createSupplier.mutate(
        { data: payload },
        { onSuccess: () => router.back() },
      );
    }
  };

  if (isEdit && isLoading) return <LoadingState />;

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title={isEdit ? "تعديل المورد" : "إضافة مورد"} />
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="اسم المورد *" value={name} onChangeText={setName} />
        <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="العنوان" value={address} onChangeText={setAddress} />
        <Field label="المدينة" value={city} onChangeText={setCity} />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} />
        <Button
          label={isEdit ? "حفظ التعديلات" : "إضافة المورد"}
          onPress={handleSave}
          loading={isPending}
          style={{ marginTop: 8 }}
        />
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
  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: {
    height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
    fontSize: 15, textAlign: "right",
  },
});
