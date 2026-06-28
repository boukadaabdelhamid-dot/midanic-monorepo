import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetMonthlyReport,
  useGetProductProfitReport,
  useGetCustomerProfitReport,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { ErrorState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ReportsScreen() {
  const c = useColors();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthly = useGetMonthlyReport({ year, month });
  const products = useGetProductProfitReport({ year, month });
  const customers = useGetCustomerProfitReport({ year, month });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const monthlyData = monthly.data as any;
  const topProducts = ((products.data ?? []) as any[]).slice(0, 5);
  const topCustomers = ((customers.data ?? []) as any[]).slice(0, 5);

  const isLoading = monthly.isLoading || products.isLoading;
  const isError = monthly.isError && products.isError;

  const onRefresh = () => { void monthly.refetch(); void products.refetch(); void customers.refetch(); };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="التقارير" subtitle="Rapports" />

      <View style={[styles.periodPicker, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable onPress={prevMonth} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color={c.primary} />
        </Pressable>
        <Text style={[styles.periodLabel, { color: c.text }]}>{MONTHS[month - 1]} {year}</Text>
        <Pressable
          onPress={nextMonth}
          style={styles.arrow}
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}
        >
          <Ionicons
            name="chevron-back" size={20}
            color={year === now.getFullYear() && month === now.getMonth() + 1 ? c.textMuted : c.primary}
          />
        </Pressable>
      </View>

      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={onRefresh} /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={monthly.isFetching} onRefresh={onRefresh} tintColor={c.primary} />}
        >
          <Text style={[styles.section, { color: c.text }]}>ملخص الشهر</Text>
          <View style={styles.kpisGrid}>
            {[
              { label: "إجمالي الطلبات", value: fmtInt(monthlyData?.totalOrders ?? 0), icon: "receipt", color: c.primary },
              { label: "المبيعات", value: fmtNum(monthlyData?.totalRevenue ?? monthlyData?.revenue ?? 0, CURRENCY), icon: "trending-up", color: c.success },
              { label: "الربح الإجمالي", value: fmtNum(monthlyData?.grossProfit ?? 0, CURRENCY), icon: "cash", color: "#6366F1" },
              { label: "المرتجعات", value: fmtInt(monthlyData?.returns ?? 0), icon: "return-down-back", color: c.danger },
            ].map((kpi) => (
              <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.kpiIcon, { backgroundColor: kpi.color + "22" }]}>
                  <Ionicons name={kpi.icon as any} size={18} color={kpi.color} />
                </View>
                <Text style={[styles.kpiValue, { color: c.text }]}>{kpi.value}</Text>
                <Text style={[styles.kpiLabel, { color: c.textMuted }]}>{kpi.label}</Text>
              </View>
            ))}
          </View>

          {topProducts.length > 0 && (
            <>
              <Text style={[styles.section, { color: c.text }]}>أفضل المنتجات</Text>
              {topProducts.map((p: any, i: number) => (
                <View key={i} style={[styles.rankRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={[styles.rankBadge, { backgroundColor: c.primary + "22" }]}>
                    <Text style={[styles.rankNum, { color: c.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.rankName, { color: c.text }]} numberOfLines={1}>
                    {p.nameAr || p.nameEn || p.productName || "—"}
                  </Text>
                  <Text style={[styles.rankValue, { color: c.success }]}>
                    {fmtNum(p.revenue ?? p.profit ?? p.totalRevenue ?? 0, CURRENCY)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {topCustomers.length > 0 && (
            <>
              <Text style={[styles.section, { color: c.text }]}>أفضل العملاء</Text>
              {topCustomers.map((cu: any, i: number) => (
                <View key={i} style={[styles.rankRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={[styles.rankBadge, { backgroundColor: "#0EA5E922" }]}>
                    <Text style={[styles.rankNum, { color: "#0EA5E9" }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.rankName, { color: c.text }]} numberOfLines={1}>
                    {cu.name || cu.customerName || "—"}
                  </Text>
                  <Text style={[styles.rankValue, { color: c.success }]}>
                    {fmtNum(cu.totalSpent ?? cu.revenue ?? 0, CURRENCY)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodPicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16,
  },
  arrow: { padding: 4 },
  periodLabel: { fontSize: 16, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 48 },
  section: { fontSize: 17, fontWeight: "800", textAlign: "right", marginBottom: 12, marginTop: 16 },
  kpisGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, alignItems: "center" },
  kpiIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"], textAlign: "center" },
  kpiLabel: { fontSize: 12, textAlign: "center" },
  rankRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  rankBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rankNum: { fontSize: 14, fontWeight: "800" },
  rankName: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  rankValue: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
