import { useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useGetAccountingSummary,
  useGetAdminOrders,
  useGetDashboardGeneral,
  useGetLowStock,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";
import { KpiCard, ErrorState } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";

export default function DashboardScreen() {
  const c = useColors();

  const general = useGetDashboardGeneral();
  const accounting = useGetAccountingSummary();
  const orders = useGetAdminOrders();
  const lowStock = useGetLowStock();

  const refreshing =
    general.isFetching || accounting.isFetching || orders.isFetching || lowStock.isFetching;

  const onRefresh = useCallback(() => {
    void general.refetch();
    void accounting.refetch();
    void orders.refetch();
    void lowStock.refetch();
  }, [general, accounting, orders, lowStock]);

  const orderList = orders.data ?? [];
  const pendingCount = orderList.filter(
    (o) => o.status === "pending" || o.status === "processing",
  ).length;
  const ordersRevenue = orderList.reduce(
    (sum, o) => sum + Number(o.totalAmount ?? 0),
    0,
  );
  const lowStockCount = (lowStock.data ?? []).length;
  const hasError =
    general.isError && accounting.isError && orders.isError && lowStock.isError;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="لوحة التحكم" subtitle="Dashboard" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
      >
        {hasError ? (
          <ErrorState onRetry={onRefresh} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>نظرة عامة</Text>
            <View style={styles.grid}>
              <KpiCard
                icon="cash"
                label="إجمالي المبيعات"
                value={fmtNum(ordersRevenue, CURRENCY)}
                loading={orders.isLoading}
              />
              <KpiCard
                icon="receipt"
                label="طلبات قيد التنفيذ"
                value={fmtInt(pendingCount)}
                loading={orders.isLoading}
              />
              <KpiCard
                icon="cube"
                label="قيمة المخزون"
                value={fmtNum(general.data?.stockValue, CURRENCY)}
                loading={general.isLoading}
              />
              <KpiCard
                icon="alert-circle"
                label="منتجات منخفضة"
                value={fmtInt(lowStockCount)}
                tone={lowStockCount > 0 ? "negative" : "default"}
                loading={lowStock.isLoading}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: c.text }]}>المحاسبة</Text>
            <View style={styles.grid}>
              <KpiCard
                icon="trending-up"
                label="الإيرادات"
                value={fmtNum(accounting.data?.totalIncome, CURRENCY)}
                tone="positive"
                loading={accounting.isLoading}
              />
              <KpiCard
                icon="trending-down"
                label="المصروفات"
                value={fmtNum(accounting.data?.totalExpenses, CURRENCY)}
                tone="negative"
                loading={accounting.isLoading}
              />
              <KpiCard
                icon="wallet"
                label="صافي الرصيد"
                value={fmtNum(accounting.data?.netBalance, CURRENCY)}
                tone={Number(accounting.data?.netBalance ?? 0) >= 0 ? "positive" : "negative"}
                loading={accounting.isLoading}
                style={{ width: "100%" }}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: c.text }]}>المبيعات</Text>
            <View style={styles.grid}>
              <KpiCard
                icon="bag"
                label="إجمالي الطلبات"
                value={fmtInt(orderList.length)}
                loading={orders.isLoading}
              />
              <KpiCard
                icon="checkmark-circle"
                label="تم التسليم"
                value={fmtInt(orderList.filter((o) => o.status === "delivered").length)}
                tone="positive"
                loading={orders.isLoading}
              />
              <KpiCard
                icon="close-circle"
                label="ملغى"
                value={fmtInt(orderList.filter((o) => o.status === "cancelled").length)}
                tone="negative"
                loading={orders.isLoading}
              />
              <KpiCard
                icon="time"
                label="معالجة"
                value={fmtInt(orderList.filter((o) => o.status === "processing").length)}
                loading={orders.isLoading}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 14,
    marginTop: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
