import { useState } from "react";
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
import { useGetAccountingSummary, useGetTransactions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

type TxType = "all" | "income" | "expense";
const TX_FILTERS: { key: TxType; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "income", label: "إيرادات" },
  { key: "expense", label: "مصروفات" },
];

export default function AccountingScreen() {
  const c = useColors();
  const [filter, setFilter] = useState<TxType>("all");
  const summary = useGetAccountingSummary();
  const tx = useGetTransactions();
  const allTransactions = (tx.data ?? []) as any[];
  const transactions = filter === "all" ? allTransactions : allTransactions.filter((t: any) => t.type === filter);

  const AddButton = (
    <Pressable
      onPress={() => router.push("/accounting-form")}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="المحاسبة" subtitle="Comptabilité" rightAction={AddButton} />

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="card-outline" message="لا توجد معاملات" />}
        refreshControl={
          <RefreshControl
            refreshing={tx.isFetching || summary.isFetching}
            onRefresh={() => { void tx.refetch(); void summary.refetch(); }}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {summary.data ? (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: c.success + "18", borderColor: c.success + "44" }]}>
                  <Ionicons name="trending-up" size={18} color={c.success} />
                  <Text style={[styles.summaryValue, { color: c.success }]}>{fmtNum(summary.data.totalIncome, CURRENCY)}</Text>
                  <Text style={[styles.summaryLabel, { color: c.success }]}>الإيرادات</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: c.danger + "18", borderColor: c.danger + "44" }]}>
                  <Ionicons name="trending-down" size={18} color={c.danger} />
                  <Text style={[styles.summaryValue, { color: c.danger }]}>{fmtNum(summary.data.totalExpenses, CURRENCY)}</Text>
                  <Text style={[styles.summaryLabel, { color: c.danger }]}>المصروفات</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: c.primary + "18", borderColor: c.primary + "44" }]}>
                  <Ionicons name="wallet" size={18} color={c.primary} />
                  <Text style={[styles.summaryValue, { color: c.primary }]}>{fmtNum(summary.data.netBalance, CURRENCY)}</Text>
                  <Text style={[styles.summaryLabel, { color: c.primary }]}>الرصيد</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.filtersRow}>
              {TX_FILTERS.map((f) => {
                const active = f.key === filter;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.filterBtn, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                  >
                    <Text style={[styles.filterText, { color: active ? c.onPrimary : c.textMuted }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tx.isLoading ? <LoadingState /> : tx.isError ? <ErrorState onRetry={() => void tx.refetch()} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.txCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.txLeft}>
              <View style={[styles.txIcon, { backgroundColor: item.type === "income" ? c.success + "22" : c.danger + "22" }]}>
                <Ionicons
                  name={item.type === "income" ? "trending-up" : "trending-down"}
                  size={18}
                  color={item.type === "income" ? c.success : c.danger}
                />
              </View>
              <View>
                <Text style={[styles.txDesc, { color: c.text }]} numberOfLines={1}>{item.description || "—"}</Text>
                <Text style={[styles.txDate, { color: c.textMuted }]}>{fmtDate(item.date)}</Text>
                {item.category ? <Text style={[styles.txCat, { color: c.textMuted }]}>{item.category}</Text> : null}
              </View>
            </View>
            <Text style={[styles.txAmount, { color: item.type === "income" ? c.success : c.danger }]}>
              {item.type === "income" ? "+" : "-"}{fmtNum(item.amount, CURRENCY)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  summaryValue: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"], textAlign: "center" },
  summaryLabel: { fontSize: 11, fontWeight: "600" },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: "center" },
  filterText: { fontSize: 13, fontWeight: "700" },
  txCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, borderWidth: 1, padding: 12 },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 12, marginTop: 2 },
  txCat: { fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
