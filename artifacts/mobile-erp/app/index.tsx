import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  useGetAnalytics,
  useGetAdminOrders,
  useGetLowStock,
} from "@workspace/api-client-react";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function fmtDZ(n: number) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2 }) + " دج";
}

export default function AdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLang();
  const { isAdmin } = useAuth();

  const analyticsQ = useGetAnalytics({ query: { enabled: isAdmin } as never });
  const ordersQ = useGetAdminOrders();
  const lowStockQ = useGetLowStock(undefined, { query: { enabled: isAdmin } as never });

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayStats = useMemo(() => {
    const orders = ordersQ.data ?? [];
    const today = orders.filter((o) => (o.createdAt ?? "").slice(0, 10) === todayKey);
    const revenue = today.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const online = today.filter((o) => !o.sellerUserId).length;
    const inStore = today.length - online;
    return { revenue, count: today.length, online, inStore };
  }, [ordersQ.data, todayKey]);

  const last7 = useMemo(() => {
    const orders = ordersQ.data ?? [];
    const days: { day: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = orders
        .filter((o) => (o.createdAt ?? "").slice(0, 10) === key)
        .reduce((s, o) => s + Number(o.totalAmount || 0), 0);
      days.push({ day: key.slice(5), total });
    }
    return days;
  }, [ordersQ.data]);

  const maxBar = Math.max(1, ...last7.map((d) => d.total));

  const profitMargin = analyticsQ.data && analyticsQ.data.totalRevenue > 0
    ? Math.round((analyticsQ.data.netProfit / analyticsQ.data.totalRevenue) * 1000) / 10
    : 0;

  const refreshing = ordersQ.isRefetching || analyticsQ.isRefetching;
  const onRefresh = () => {
    ordersQ.refetch();
    if (isAdmin) {
      analyticsQ.refetch();
      lowStockQ.refetch();
    }
  };

  const allActions: { ar: string; en: string; icon: React.ComponentProps<typeof Feather>["name"]; href: string; adminOnly?: boolean }[] = [
    { ar: "الصندوق", en: "Caisse", icon: "shopping-bag", href: "/caisse" },
    { ar: "الطلبات", en: "Online Orders", icon: "package", href: "/online-orders" },
    { ar: "المخزون", en: "Inventory", icon: "box", href: "/inventory" },
    { ar: "التحويلات", en: "Transfers", icon: "shuffle", href: "/transfers" },
    { ar: "أوامر الشراء", en: "Purchase Orders", icon: "truck", href: "/purchase-orders", adminOnly: true },
    { ar: "التقارير", en: "Reports", icon: "bar-chart-2", href: "/reports", adminOnly: true },
  ];
  const actions = allActions.filter((a) => !a.adminOnly || isAdmin);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {ordersQ.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {t("اليوم", "Today")}
        </Text>
        <View style={styles.kpiRow}>
          <KpiCard icon="dollar-sign" label={t("الإيراد", "Revenue")} value={fmtDZ(todayStats.revenue)} />
          <KpiCard icon="shopping-cart" label={t("الطلبات", "Orders")} value={String(todayStats.count)} />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard icon="globe" label={t("أونلاين", "Online")} value={String(todayStats.online)} tint={colors.primary} />
          <KpiCard icon="home" label={t("داخل المتجر", "In-store")} value={String(todayStats.inStore)} tint={colors.warning} />
        </View>

        {isAdmin ? (
          <View style={styles.kpiRow}>
            <KpiCard
              icon="trending-up"
              label={t("هامش الربح", "Profit Margin")}
              value={`${profitMargin}%`}
              tint={colors.success}
            />
            <KpiCard
              icon="alert-triangle"
              label={t("مخزون منخفض", "Low Stock")}
              value={String((lowStockQ.data ?? []).length)}
              tint={colors.destructive}
            />
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
          {t("آخر 7 أيام", "Last 7 days")}
        </Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartRow}>
            {last7.map((d) => (
              <View key={d.day} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.primary,
                        height: `${Math.max(4, (d.total / maxBar) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
          {t("اختصارات", "Quick Actions")}
        </Text>
        <View style={styles.grid}>
          {actions.map((a) => (
            <Pressable
              key={a.href}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(a.href as never);
              }}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.primary + "1A" }]}>
                <Feather name={a.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.foreground }]}>{t(a.ar, a.en)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, gap: 8 },
  center: { padding: 32, alignItems: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, marginBottom: 4 },
  kpiRow: { flexDirection: "row", gap: 10 },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 12, height: 140 },
  chartRow: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  barTrack: { width: "70%", height: "85%", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31%", aspectRatio: 1, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
});
