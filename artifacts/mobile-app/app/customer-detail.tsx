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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetErpCustomer,
  useGetCustomerOperations,
  useCreateCustomerNote,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingState, ErrorState } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

function BackHeader({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: c.primaryDeep, paddingTop: insets.top + (Platform.OS === "web" ? 12 : 8) }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );
}

export default function CustomerDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const customerId = Number(id);
  const [noteText, setNoteText] = useState("");

  const customer = useGetErpCustomer(customerId);
  const operations = useGetCustomerOperations(customerId);
  const addNote = useCreateCustomerNote();

  const cu = customer.data as any;
  const ops = ((operations.data ?? []) as any[]);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate(
      { id: customerId, data: { note: noteText } as any },
      {
        onSuccess: () => {
          setNoteText("");
          void operations.refetch();
          void customer.refetch();
        },
        onError: () => {
          if (Platform.OS !== "web") Alert.alert("خطأ", "تعذّر إضافة الملاحظة");
        },
      },
    );
  };

  if (customer.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <BackHeader title="العميل" />
        <LoadingState />
      </View>
    );
  }
  if (customer.isError) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <BackHeader title="العميل" />
        <ErrorState onRetry={() => void customer.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title={cu?.name || "العميل"} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: "#0EA5E922" }]}>
            <Ionicons name="person" size={32} color="#0EA5E9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.text }]}>{cu?.name || "—"}</Text>
            {cu?.phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={c.textMuted} />
                <Text style={[styles.meta, { color: c.textMuted }]}>{cu.phone}</Text>
              </View>
            ) : null}
            {cu?.email ? (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={14} color={c.textMuted} />
                <Text style={[styles.meta, { color: c.textMuted }]}>{cu.email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.statValue, { color: c.text }]}>{cu?.totalOrders ?? cu?.ordersCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>طلب</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.statValue, { color: c.success }]}>{fmtNum(cu?.totalSpent ?? 0, CURRENCY)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>إجمالي الشراء</Text>
          </View>
        </View>

        <View style={[styles.noteCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>إضافة ملاحظة</Text>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="اكتب ملاحظة حول هذا العميل…"
            placeholderTextColor={c.textMuted}
            multiline
            style={[styles.noteInput, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
          />
          <Pressable
            onPress={handleAddNote}
            disabled={!noteText.trim() || addNote.isPending}
            style={({ pressed }) => [
              styles.noteSaveBtn,
              { backgroundColor: c.primary, opacity: pressed || addNote.isPending || !noteText.trim() ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.noteSaveBtnText}>حفظ الملاحظة</Text>
          </Pressable>
        </View>

        {ops.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: c.text }]}>السجل ({ops.length})</Text>
            {ops.map((op: any, i: number) => (
              <View key={i} style={[styles.opRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[
                  styles.opIcon,
                  { backgroundColor: op.type === "order" ? c.success + "22" : op.type === "note" ? c.primaryTint + "22" : c.primary + "22" },
                ]}>
                  <Ionicons
                    name={op.type === "order" ? "receipt" : op.type === "note" ? "document-text" : "document-text"}
                    size={16}
                    color={op.type === "order" ? c.success : c.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.opDesc, { color: c.text }]} numberOfLines={2}>
                    {op.description || op.note || op.reference || "—"}
                  </Text>
                  <Text style={[styles.opDate, { color: c.textMuted }]}>{fmtDate(op.date || op.createdAt)}</Text>
                </View>
                {op.amount ? (
                  <Text style={[styles.opAmount, { color: c.success }]}>{fmtNum(op.amount, CURRENCY)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
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
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12 },
  noteCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", textAlign: "right", marginBottom: 4 },
  noteInput: {
    height: 80, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingTop: 10,
    fontSize: 15, textAlign: "right", textAlignVertical: "top",
  },
  noteSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 11, borderRadius: 12,
  },
  noteSaveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  opRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  opIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  opDesc: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  opDate: { fontSize: 12, marginTop: 2 },
  opAmount: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
