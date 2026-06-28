import { useEffect, useMemo, useState } from "react";
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
  useCreateEmployee,
  useGetEmployees,
  useUpdateEmployee,
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

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType ?? "default"}
        style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
      />
    </View>
  );
}

const STATUSES = [
  { key: "active", label: "نشط" },
  { key: "inactive", label: "غير نشط" },
  { key: "on_leave", label: "في إجازة" },
  { key: "terminated", label: "منهي الخدمة" },
];

export default function EmployeeFormScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("active");
  const [hireDate, setHireDate] = useState("");

  const { data: employees, isLoading } = useGetEmployees();
  const employee = useMemo(
    () => isEdit ? ((employees ?? []) as any[]).find((e: any) => e.id === Number(id)) : null,
    [employees, id, isEdit],
  );

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  useEffect(() => {
    if (!employee) return;
    setName(employee.name ?? "");
    setPhone(employee.phone ?? "");
    setEmail(employee.email ?? "");
    setPosition(employee.position ?? "");
    setSalary(String(employee.salary ?? ""));
    setStatus(employee.status ?? "active");
    setHireDate(employee.hireDate ?? "");
  }, [employee]);

  const handleSave = () => {
    if (!name.trim()) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إدخال اسم الموظف");
      return;
    }
    const payload = {
      name,
      phone: phone || undefined,
      email: email || undefined,
      position: position || "—",
      salary: salary ? Number(salary) : undefined,
      status,
      hireDate: hireDate || undefined,
    };

    if (isEdit) {
      updateEmployee.mutate(
        { id: Number(id), data: payload },
        { onSuccess: () => router.back() },
      );
    } else {
      createEmployee.mutate(
        { data: payload },
        { onSuccess: () => router.back() },
      );
    }
  };

  if (isEdit && isLoading) return <LoadingState />;

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title={isEdit ? "تعديل موظف" : "إضافة موظف"} />
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="الاسم الكامل *" value={name} onChangeText={setName} />
        <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="المنصب / الوظيفة" value={position} onChangeText={setPosition} />
        <Field label="الراتب الشهري" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" />
        <Field label="تاريخ التوظيف (YYYY-MM-DD)" value={hireDate} onChangeText={setHireDate} />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الحالة</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setStatus(s.key)}
                style={({ pressed }) => [
                  styles.statusBtn,
                  {
                    backgroundColor: status === s.key ? c.primary : c.surface,
                    borderColor: status === s.key ? c.primary : c.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.statusText, { color: status === s.key ? c.onPrimary : c.text }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button label={isEdit ? "حفظ التعديلات" : "إضافة الموظف"} onPress={handleSave} loading={isPending} style={{ marginTop: 8 }} />
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
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: "700" },
});
