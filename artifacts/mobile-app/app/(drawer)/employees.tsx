import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetEmployees, type Employee } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";

function statusColor(status: string, c: ReturnType<typeof useColors>): string {
  switch (status) {
    case "active": return c.success;
    case "on_leave": return c.warning;
    case "terminated": return c.danger;
    default: return c.textMuted;
  }
}
function statusLabel(status: string): string {
  switch (status) {
    case "active": return "نشط";
    case "inactive": return "غير نشط";
    case "on_leave": return "في إجازة";
    case "terminated": return "منهي الخدمة";
    default: return status;
  }
}

function EmployeeCard({ emp }: { emp: Employee }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/employee-form", params: { id: emp.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: c.primary + "22" }]}>
        <Ionicons name="person" size={22} color={c.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {emp.name}
        </Text>
        {emp.position ? (
          <Text style={[styles.position, { color: c.textMuted }]} numberOfLines={1}>
            {emp.position}
          </Text>
        ) : null}
        {emp.phone ? (
          <Text style={[styles.phone, { color: c.textMuted }]} numberOfLines={1}>
            {emp.phone}
          </Text>
        ) : null}
      </View>
      <Pill label={statusLabel(emp.status)} color={statusColor(emp.status, c)} />
    </Pressable>
  );
}

export default function EmployeesScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, isFetching, refetch } = useGetEmployees();
  const employees = data ?? [];

  const AddButton = isAdmin ? (
    <Pressable
      onPress={() => router.push("/employee-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الموظفون" subtitle="Employés" rightAction={AddButton} />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EmployeeCard emp={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="people-outline" message="لا يوجد موظفون" />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => void refetch()}
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
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  position: { fontSize: 13, marginTop: 2, textAlign: "right" },
  phone: { fontSize: 13, marginTop: 2, textAlign: "right" },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
