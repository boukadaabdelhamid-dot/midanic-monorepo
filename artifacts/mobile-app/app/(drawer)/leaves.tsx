import { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetLeaves, useUpdateLeaveStatus } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { fmtDate } from "@/lib/format";
import { queryClient } from "@/lib/query-client";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "approved", label: "موافق" },
  { key: "rejected", label: "مرفوض" },
];

function leaveTypeLabel(type: string) {
  switch (type) {
    case "annual": return "سنوية";
    case "sick": return "مرضية";
    case "emergency": return "طارئة";
    case "unpaid": return "بدون أجر";
    default: return type;
  }
}
function statusColor(status: string, c: ReturnType<typeof useColors>) {
  switch (status) {
    case "approved": return c.success;
    case "rejected": return c.danger;
    default: return c.warning;
  }
}
function statusLabel(status: string) {
  switch (status) {
    case "approved": return "موافق";
    case "rejected": return "مرفوض";
    default: return "قيد الانتظار";
  }
}

export default function LeavesScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data, isLoading, isError, isFetching, refetch } = useGetLeaves(
    filter !== "all" ? { status: filter } : undefined,
  );
  const updateStatus = useUpdateLeaveStatus();

  const leaves = (data ?? []) as any[];

  const handleStatusChange = (leaveId: number, status: "approved" | "rejected") => {
    updateStatus.mutate(
      { leaveId, data: { status } },
      {
        onSuccess: () => void refetch(),
        onError: () => {
          if (Platform.OS !== "web") Alert.alert("خطأ", "تعذّر تحديث الحالة");
        },
      },
    );
  };

  const confirmAction = (leaveId: number, status: "approved" | "rejected") => {
    if (Platform.OS === "web") {
      handleStatusChange(leaveId, status);
      return;
    }
    Alert.alert(
      status === "approved" ? "الموافقة على الإجازة" : "رفض الإجازة",
      "هل أنت متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تأكيد", style: "destructive", onPress: () => handleStatusChange(leaveId, status) },
      ],
    );
  };

  const AddButton = (
    <Pressable
      onPress={() => router.push("/leave-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الإجازات" subtitle="Congés" rightAction={AddButton} />

      <View style={[styles.filtersWrap, { backgroundColor: c.background }]}>
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterBtn, {
                  backgroundColor: active ? c.primary : c.surface,
                  borderColor: active ? c.primary : c.border,
                }]}
              >
                <Text style={[styles.filterText, { color: active ? c.onPrimary : c.textMuted }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="calendar-outline" message="لا توجد إجازات" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <Text style={[styles.empName, { color: c.text }]} numberOfLines={1}>
                  {item.employee?.name || item.employeeName || `موظف ${item.employeeId}`}
                </Text>
                <Pill label={statusLabel(item.status)} color={statusColor(item.status, c)} />
              </View>
              <View style={styles.meta}>
                <Text style={[styles.metaText, { color: c.textMuted }]}>
                  {leaveTypeLabel(item.type)} · {fmtDate(item.startDate)} ← {fmtDate(item.endDate)}
                </Text>
              </View>
              {item.reason ? (
                <Text style={[styles.reason, { color: c.textMuted }]} numberOfLines={2}>
                  {item.reason}
                </Text>
              ) : null}
              {isAdmin && item.status === "pending" ? (
                <View style={styles.adminActions}>
                  <Pressable
                    onPress={() => confirmAction(item.id, "approved")}
                    style={({ pressed }) => [styles.approveBtn, { backgroundColor: c.success + "22", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="checkmark" size={16} color={c.success} />
                    <Text style={[styles.actionText, { color: c.success }]}>موافقة</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmAction(item.id, "rejected")}
                    style={({ pressed }) => [styles.rejectBtn, { backgroundColor: c.danger + "22", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="close" size={16} color={c.danger} />
                    <Text style={[styles.actionText, { color: c.danger }]}>رفض</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  empName: { fontSize: 15, fontWeight: "700", flex: 1, textAlign: "right", marginLeft: 8 },
  meta: { flexDirection: "row" },
  metaText: { fontSize: 13 },
  reason: { fontSize: 13, textAlign: "right" },
  adminActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 14, fontWeight: "700" },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
