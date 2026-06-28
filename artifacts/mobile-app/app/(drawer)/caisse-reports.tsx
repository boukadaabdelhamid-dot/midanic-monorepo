import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetErpCaisseReports } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum } from "@/lib/format";

export default function CaisseReportsScreen() {
  const c = useColors();
  const { data, isLoading, isError, isFetching, refetch } = useGetErpCaisseReports();
  const reports = (data ?? []) as any[];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="تقرير الصناديق" subtitle="Rapport caisses" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={reports}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="bar-chart-outline" message="لا توجد تقارير" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.icon, { backgroundColor: "#F59E0B22" }]}>
                  <Ionicons name="wallet" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.caisseName, { color: c.text }]} numberOfLines={1}>
                    {item.caisseName || item.name || `صندوق #${item.caisseId}`}
                  </Text>
                  <Text style={[styles.period, { color: c.textMuted }]}>
                    {fmtDate(item.openedAt || item.date)} — {fmtDate(item.closedAt || item.endDate)}
                  </Text>
                </View>
              </View>
              <View style={styles.kpis}>
                <View style={styles.kpi}>
                  <Text style={[styles.kpiValue, { color: c.success }]}>{fmtNum(item.totalIncome ?? item.income ?? 0, CURRENCY)}</Text>
                  <Text style={[styles.kpiLabel, { color: c.textMuted }]}>دخل</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={[styles.kpiValue, { color: c.danger }]}>{fmtNum(item.totalExpense ?? item.expense ?? 0, CURRENCY)}</Text>
                  <Text style={[styles.kpiLabel, { color: c.textMuted }]}>خروج</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={[styles.kpiValue, { color: c.primary }]}>{fmtNum(item.closingBalance ?? item.balance ?? 0, CURRENCY)}</Text>
                  <Text style={[styles.kpiLabel, { color: c.textMuted }]}>رصيد الإغلاق</Text>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  caisseName: { fontSize: 15, fontWeight: "700" },
  period: { fontSize: 12, marginTop: 2 },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, alignItems: "center", gap: 3 },
  kpiValue: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"], textAlign: "center" },
  kpiLabel: { fontSize: 11, textAlign: "center" },
});
