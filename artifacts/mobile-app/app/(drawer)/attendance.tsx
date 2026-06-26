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
import { Ionicons } from "@expo/vector-icons";
import {
  useCreateAttendance,
  useGetAttendance,
  useGetEmployees,
  type Employee,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { fmtDate } from "@/lib/format";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

type AttRecord = { employeeId: number; type: string; timestamp: string };

function EmployeeAttRow({
  emp,
  record,
  onCheckIn,
  onCheckOut,
}: {
  emp: Employee;
  record?: AttRecord;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const c = useColors();
  const hasIn = record?.type === "check_in" || record?.type === "check_out";
  const hasOut = record?.type === "check_out";

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.empInfo}>
        <View style={[styles.avatar, { backgroundColor: c.primary + "22" }]}>
          <Ionicons name="person" size={18} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.empName, { color: c.text }]} numberOfLines={1}>{emp.name}</Text>
          {emp.position ? (
            <Text style={[styles.empPos, { color: c.textMuted }]} numberOfLines={1}>{emp.position}</Text>
          ) : null}
        </View>
        {hasOut ? (
          <Pill label="خرج" color={c.success} />
        ) : hasIn ? (
          <Pill label="دخل" color={c.warning} />
        ) : (
          <Pill label="غائب" color={c.textMuted} />
        )}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onCheckIn}
          disabled={hasIn}
          style={({ pressed }) => [
            styles.actBtn,
            { backgroundColor: hasIn ? c.surfaceAlt : c.success + "22", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-in-outline" size={18} color={hasIn ? c.textMuted : c.success} />
          <Text style={[styles.actText, { color: hasIn ? c.textMuted : c.success }]}>دخول</Text>
        </Pressable>
        <Pressable
          onPress={onCheckOut}
          disabled={!hasIn || hasOut}
          style={({ pressed }) => [
            styles.actBtn,
            { backgroundColor: !hasIn || hasOut ? c.surfaceAlt : c.danger + "22", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={!hasIn || hasOut ? c.textMuted : c.danger} />
          <Text style={[styles.actText, { color: !hasIn || hasOut ? c.textMuted : c.danger }]}>خروج</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const c = useColors();
  const [date, setDate] = useState(todayStr());

  const employees = useGetEmployees();
  const attendance = useGetAttendance({ date });
  const createAtt = useCreateAttendance();

  const empList = employees.data ?? [];
  const attRecords = (attendance.data ?? []) as AttRecord[];

  const getRecord = (empId: number) =>
    attRecords.filter((r) => r.employeeId === empId).at(-1);

  const handleRecord = (empId: number, type: "check_in" | "check_out") => {
    createAtt.mutate(
      { data: { employeeId: empId, type, timestamp: new Date().toISOString() } },
      {
        onSuccess: () => void attendance.refetch(),
        onError: () => {
          if (Platform.OS === "web") return;
          Alert.alert("خطأ", "تعذّر تسجيل الحضور");
        },
      },
    );
  };

  const isLoading = employees.isLoading || attendance.isLoading;
  const isError = employees.isError || attendance.isError;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الحضور" subtitle="Présences" />

      <View style={[styles.datePicker, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable
          onPress={() => {
            const d = new Date(date);
            d.setDate(d.getDate() - 1);
            setDate(d.toISOString().split("T")[0]);
          }}
          style={styles.dateArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={c.primary} />
        </Pressable>
        <Text style={[styles.dateText, { color: c.text }]}>{fmtDate(date)}</Text>
        <Pressable
          onPress={() => {
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            const newDate = d.toISOString().split("T")[0];
            if (newDate <= todayStr()) setDate(newDate);
          }}
          style={styles.dateArrow}
        >
          <Ionicons name="chevron-back" size={20} color={date < todayStr() ? c.primary : c.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => { void employees.refetch(); void attendance.refetch(); }} />
      ) : (
        <FlatList
          data={empList}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EmployeeAttRow
              emp={item}
              record={getRecord(item.id)}
              onCheckIn={() => handleRecord(item.id, "check_in")}
              onCheckOut={() => handleRecord(item.id, "check_out")}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="people-outline" message="لا يوجد موظفون" />}
          refreshControl={
            <RefreshControl
              refreshing={employees.isFetching || attendance.isFetching}
              onRefresh={() => { void employees.refetch(); void attendance.refetch(); }}
              tintColor={c.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  datePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16,
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 16, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  empInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  empName: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  empPos: { fontSize: 12, marginTop: 2, textAlign: "right" },
  actions: { flexDirection: "row", gap: 10 },
  actBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  actText: { fontSize: 14, fontWeight: "700" },
});
