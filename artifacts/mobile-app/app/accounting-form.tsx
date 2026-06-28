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
import { useCreateTransaction } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
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

function Field({ label, value, onChangeText, keyboardType, placeholder }: any) {
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

const CATEGORIES = ["مبيعات", "مشتريات", "رواتب", "إيجار", "مصاريف تشغيل", "ضرائب", "أخرى"];

export default function AccountingFormScreen() {
  const c = useColors();
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");

  const createTransaction = useCreateTransaction();

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
      return;
    }
    createTransaction.mutate(
      {
        data: {
          type,
          amount: Number(amount),
          description: description || undefined,
          date,
          category: category || undefined,
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="معاملة مالية جديدة" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>النوع</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setType("income")}
              style={({ pressed }) => [
                styles.typeBtn,
                { backgroundColor: type === "income" ? c.success : c.surface, borderColor: type === "income" ? c.success : c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="trending-up" size={18} color={type === "income" ? "#FFFFFF" : c.success} />
              <Text style={[styles.typeText, { color: type === "income" ? "#FFFFFF" : c.success }]}>إيراد</Text>
            </Pressable>
            <Pressable
              onPress={() => setType("expense")}
              style={({ pressed }) => [
                styles.typeBtn,
                { backgroundColor: type === "expense" ? c.danger : c.surface, borderColor: type === "expense" ? c.danger : c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="trending-down" size={18} color={type === "expense" ? "#FFFFFF" : c.danger} />
              <Text style={[styles.typeText, { color: type === "expense" ? "#FFFFFF" : c.danger }]}>مصروف</Text>
            </Pressable>
          </View>
        </View>

        <Field label="المبلغ *" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        <Field label="الوصف" value={description} onChangeText={setDescription} />
        <Field label="التاريخ (YYYY-MM-DD)" value={date} onChangeText={setDate} />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الفئة</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat === category ? "" : cat)}
                style={({ pressed }) => [
                  styles.catBtn,
                  { backgroundColor: cat === category ? c.primary : c.surface, borderColor: cat === category ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.catText, { color: cat === category ? c.onPrimary : c.text }]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button label="حفظ المعاملة" onPress={handleSave} loading={createTransaction.isPending} style={{ marginTop: 8 }} />
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
  field: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, textAlign: "right" },
  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 15, fontWeight: "700" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: "700" },
});
