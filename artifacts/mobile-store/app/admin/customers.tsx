import { Feather } from "@expo/vector-icons";
import { useGetErpCustomers } from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function CustomersScreen() {
  const colors = useColors();
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const { data = [], isLoading, refetch, isRefetching } = useGetErpCustomers();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("العملاء", "Customers")} showBack />
      <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("بحث بالاسم أو الهاتف", "Search name or phone")}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="users" ar="لا يوجد عملاء" en="No customers" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "1A" }]}>
                <Text style={[styles.avatarTxt, { color: colors.primary }]}>
                  {(item.name ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.phone ?? item.email}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.count, { color: colors.foreground }]}>{item.total_orders ?? 0}</Text>
                <Text style={[styles.countLbl, { color: colors.mutedForeground }]}>{t("طلب", "orders")}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginTop: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 10 },
  list: { padding: 14, gap: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  count: { fontSize: 16, fontFamily: "Inter_700Bold" },
  countLbl: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
});
