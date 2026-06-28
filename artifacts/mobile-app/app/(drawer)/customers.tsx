import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetErpCustomers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";

export default function CustomersScreen() {
  const c = useColors();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, isFetching, refetch } = useGetErpCustomers(
    search ? { search } : undefined,
  );
  const customers = useMemo(() => (data ?? []) as any[], [data]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="العملاء" subtitle="Clients" />

      <View style={[styles.searchWrap, { backgroundColor: c.background }]}>
        <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن عميل…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="people-outline" message="لا يوجد عملاء" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/customer-detail", params: { id: item.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: "#0EA5E9" + "22" }]}>
                <Ionicons name="person" size={20} color="#0EA5E9" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                {item.phone ? (
                  <Text style={[styles.sub, { color: c.textMuted }]} numberOfLines={1}>{item.phone}</Text>
                ) : null}
                {item.email ? (
                  <Text style={[styles.sub, { color: c.textMuted }]} numberOfLines={1}>{item.email}</Text>
                ) : null}
              </View>
              <View style={styles.statsCol}>
                <Text style={[styles.ordersCount, { color: c.text }]}>
                  {fmtInt(item.totalOrders ?? item.ordersCount ?? 0)}
                </Text>
                <Text style={[styles.ordersLabel, { color: c.textMuted }]}>طلب</Text>
                {item.totalSpent ? (
                  <Text style={[styles.spent, { color: c.success }]}>
                    {fmtNum(item.totalSpent, CURRENCY)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, textAlign: "right", height: "100%" as any },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  sub: { fontSize: 13, marginTop: 3, textAlign: "right" },
  statsCol: { alignItems: "center", minWidth: 56 },
  ordersCount: { fontSize: 20, fontWeight: "800" },
  ordersLabel: { fontSize: 11 },
  spent: { fontSize: 12, fontWeight: "600", marginTop: 2, textAlign: "center" },
});
