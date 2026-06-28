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
import { useCreateErpStaff } from "@workspace/api-client-react";
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

function Field({ label, value, onChangeText, keyboardType, secureTextEntry }: any) {
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
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        style={[styles.fieldInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
      />
    </View>
  );
}

export default function StaffFormScreen() {
  const c = useColors();
  const { stores } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [selectedStores, setSelectedStores] = useState<number[]>([]);

  const createStaff = useCreateErpStaff();

  const toggleStore = (id: number) => {
    setSelectedStores((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleCreate = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى ملء جميع الحقول الإلزامية");
      return;
    }
    createStaff.mutate(
      {
        data: {
          name,
          email,
          password,
          role,
          storeIds: selectedStores.length > 0 ? selectedStores : undefined,
        } as any,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title="إضافة حساب جديد" />
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="الاسم الكامل *" value={name} onChangeText={setName} />
        <Field label="البريد الإلكتروني *" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="كلمة المرور *" value={password} onChangeText={setPassword} secureTextEntry />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الصلاحية</Text>
          <View style={styles.roleRow}>
            {[{ key: "employee", label: "موظف" }, { key: "admin", label: "مدير" }].map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key as "employee" | "admin")}
                style={({ pressed }) => [
                  styles.roleBtn,
                  { backgroundColor: role === r.key ? c.primary : c.surface, borderColor: role === r.key ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.roleText, { color: role === r.key ? c.onPrimary : c.text }]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {stores.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>المتاجر المصرح بها</Text>
            <View style={styles.storeGrid}>
              {stores.map((store) => {
                const selected = selectedStores.includes(store.id);
                return (
                  <Pressable
                    key={store.id}
                    onPress={() => toggleStore(store.id)}
                    style={({ pressed }) => [
                      styles.storeBtn,
                      { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.storeText, { color: selected ? c.onPrimary : c.text }]} numberOfLines={1}>
                      {store.nameAr || store.nameEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Button label="إنشاء الحساب" onPress={handleCreate} loading={createStaff.isPending} style={{ marginTop: 8 }} />
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
  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  roleText: { fontSize: 15, fontWeight: "700" },
  storeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  storeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  storeText: { fontSize: 13, fontWeight: "600" },
});
