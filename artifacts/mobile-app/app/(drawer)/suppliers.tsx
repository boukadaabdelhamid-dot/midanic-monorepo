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
import { useGetSuppliers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ErpUi";

export default function SuppliersScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, isFetching, refetch } = useGetSuppliers();
  const suppliers = (data ?? []) as any[];

  const AddButton = isAdmin ? (
    <Pressable
      onPress={() => router.push("/supplier-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الموردون" subtitle="Fournisseurs" rightAction={AddButton} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="business-outline" message="لا يوجد موردون" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/supplier-form", params: { id: item.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: "#8B5CF6" + "22" }]}>
                <Ionicons name="business" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                {item.phone ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={13} color={c.textMuted} />
                    <Text style={[styles.metaText, { color: c.textMuted }]} numberOfLines={1}>{item.phone}</Text>
                  </View>
                ) : null}
                {item.email ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="mail-outline" size={13} color={c.textMuted} />
                    <Text style={[styles.metaText, { color: c.textMuted }]} numberOfLines={1}>{item.email}</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-back" size={16} color={c.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  metaText: { fontSize: 13 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
