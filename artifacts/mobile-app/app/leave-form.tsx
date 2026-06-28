import { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateLeave, useGetEmployees } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
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

const LEAVE_TYPES = [
  { key: "annual", label: "إجازة سنوية" },
  { key: "sick", label: "إجازة مرضية" },
  { key: "emergency", label: "إجازة طارئة" },
  { key: "unpaid", label: "إجازة بدون أجر" },
];

export default function LeaveFormScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const employees = useGetEmployees();
  const createLeave = useCreateLeave();
  const empList = ((employees.data ?? []) as any[]).filter((e: any) => e.status === "active");

  const handleSave = () => {
    if (!startDate || !endDate) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى تحديد تاريخ البداية والنهاية");
      return;
    }
    if (isAdmin && !employeeId) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى اختيار الموظف");
      return;
    }
    createLeave.mutate(
      {
        data: {
          type: leaveType,
          startDate,
          endDate,
          reason: reason || undefined,
          employeeId: employeeId ?? undefined,
        } as any,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="طلب إجازة جديد" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>نوع الإجازة</Text>
          <View style={styles.typeGrid}>
            {LEAVE_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setLeaveType(t.key)}
                style={({ pressed }) => [
                  styles.typeBtn,
                  { backgroundColor: leaveType === t.key ? c.primary : c.surface, borderColor: leaveType === t.key ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.typeText, { color: leaveType === t.key ? c.onPrimary : c.text }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>تاريخ البداية</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>تاريخ النهاية</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
              />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>السبب</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="سبب الإجازة…"
            placeholderTextColor={c.textMuted}
            multiline
            style={[styles.textarea, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
        </View>

        {isAdmin && empList.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الموظف</Text>
            <View style={styles.empGrid}>
              {empList.map((e: any) => (
                <Pressable
                  key={e.id}
                  onPress={() => setEmployeeId(e.id === employeeId ? null : e.id)}
                  style={({ pressed }) => [
                    styles.empBtn,
                    { backgroundColor: e.id === employeeId ? c.primary : c.surface, borderColor: e.id === employeeId ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.empText, { color: e.id === employeeId ? c.onPrimary : c.text }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Button label="إرسال الطلب" onPress={handleSave} loading={createLeave.isPending} style={{ marginTop: 8 }} />
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
  row: { flexDirection: "row", gap: 12 },
  field: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, textAlign: "right" },
  textarea: { height: 90, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 15, textAlign: "right", textAlignVertical: "top" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  typeText: { fontSize: 13, fontWeight: "700" },
  empGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  empBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: "48%" },
  empText: { fontSize: 13, fontWeight: "600" },
});
