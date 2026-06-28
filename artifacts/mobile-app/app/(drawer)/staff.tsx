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
import { useDeleteErpStaff, useGetErpStaff } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";

export default function StaffScreen() {
  const c = useColors();
  const { data, isLoading, isError, isFetching, refetch } = useGetErpStaff();
  const deleteStaff = useDeleteErpStaff();
  const staff = (data ?? []) as any[];

  const handleDelete = (id: number, name: string) => {
    const doDelete = () =>
      deleteStaff.mutate({ staffId: id }, { onSuccess: () => void refetch() });

    if (Platform.OS === "web") { doDelete(); return; }
    Alert.alert("حذف الحساب", `هل تريد حذف حساب "${name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: doDelete },
    ]);
  };

  const AddButton = (
    <Pressable
      onPress={() => router.push("/staff-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="إدارة الحسابات" subtitle="Accès / Staff" rightAction={AddButton} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={staff}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="shield-outline" message="لا يوجد حسابات" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: c.primary + "22" }]}>
                  <Ionicons name="person" size={20} color={c.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.email, { color: c.textMuted }]} numberOfLines={1}>{item.email}</Text>
                  {item.stores?.length > 0 && (
                    <Text style={[styles.stores, { color: c.textMuted }]} numberOfLines={1}>
                      {item.stores.map((s: any) => s.nameAr || s.nameEn).join(" · ")}
                    </Text>
                  )}
                </View>
                <View style={styles.rightCol}>
                  <Pill label={item.role === "admin" ? "مدير" : "موظف"} color={item.role === "admin" ? c.primary : c.textMuted} />
                  <Pressable
                    onPress={() => handleDelete(item.id, item.name)}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={18} color={c.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  email: { fontSize: 13, marginTop: 2, textAlign: "right" },
  stores: { fontSize: 12, marginTop: 2, textAlign: "right" },
  rightCol: { alignItems: "flex-end", gap: 8 },
  deleteBtn: { padding: 4 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
