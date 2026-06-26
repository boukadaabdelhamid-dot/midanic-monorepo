import { useCallback } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetAccountingSummary,
  useGetAdminOrders,
  useGetDashboardGeneral,
  useGetLowStock,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { KpiCard, ErrorState } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";
import { brand } from "@/constants/brand";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;

type QuickLink = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: "/(tabs)/orders" | "/(tabs)/products";
};

const QUICK_LINKS: QuickLink[] = [
  { key: "orders", label: "الطلبات", icon: "receipt", href: "/(tabs)/orders" },
  { key: "products", label: "المنتجات والمخزون", icon: "cube", href: "/(tabs)/products" },
];

export default function Dashboard() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user, stores, currentStoreId } = useAuth();
  const activeStore = stores.find((s) => s.id === currentStoreId) ?? null;

  const general = useGetDashboardGeneral();
  const accounting = useGetAccountingSummary();
  const orders = useGetAdminOrders();
  const lowStock = useGetLowStock();

  const refreshing =
    general.isFetching ||
    accounting.isFetching ||
    orders.isFetching ||
    lowStock.isFetching;

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
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + WEB_TOP_INSET + 20 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: c.textMuted }]}>
            {user?.name ? `مرحباً ${user.name}` : "مرحباً بك في"}
          </Text>
          <Text style={[styles.brand, { color: c.text }]} numberOfLines={1}>
            {activeStore?.nameAr ?? `${brand.nameAr} ERP`}
          </Text>
        </View>
        <View style={[styles.logoBadge, { backgroundColor: c.primary }]}>
          <Ionicons name="briefcase" size={22} color={c.onPrimary} />
        </View>
      </View>

      {hasError ? (
        <ErrorState onRetry={onRefresh} />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            نظرة عامة
          </Text>

          <View style={styles.grid}>
            <KpiCard
              icon="cash"
              label="مبيعات إجمالية"
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

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>
            المحاسبة
          </Text>
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
              label="رصيد دفتر الأستاذ"
              value={fmtNum(accounting.data?.netBalance, CURRENCY)}
              tone={
                Number(accounting.data?.netBalance ?? 0) < 0
                  ? "negative"
                  : "positive"
              }
              loading={accounting.isLoading}
              style={{ width: "100%" }}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>
            الوحدات
          </Text>
          <View style={styles.grid}>
            {QUICK_LINKS.map((link) => (
              <Pressable
                key={link.key}
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [
                  styles.linkCard,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[styles.linkIcon, { backgroundColor: c.surfaceAlt }]}
                >
                  <Ionicons name={link.icon} size={22} color={c.primary} />
                </View>
                <Text style={[styles.linkLabel, { color: c.text }]}>
                  {link.label}
                </Text>
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={c.textMuted}
                  style={styles.linkChevron}
                />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    textAlign: "right",
  },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "right",
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 14,
    textAlign: "right",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  linkCard: {
    flexGrow: 1,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  linkChevron: {
    transform: [{ scaleX: 1 }],
  },
});
