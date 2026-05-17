import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import {
  useGetAdminOrders,
  useGetErpCaisseReports,
  type CaisseReportRow,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const todayISO = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDZ = (v: string | number | null | undefined) =>
  Number(typeof v === "number" ? v : parseFloat(String(v ?? "0"))).toLocaleString("fr-DZ", { minimumFractionDigits: 2 }) + " دج";

type Preset = "today" | "7d" | "30d" | "custom";

export default function ReportsScreen() {
  const colors = useColors();
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const apply = (p: Preset) => {
    setPreset(p);
    if (p === "today") { setFrom(todayISO()); setTo(todayISO()); }
    else if (p === "7d") { setFrom(todayISO(-6)); setTo(todayISO()); }
    else if (p === "30d") { setFrom(todayISO(-29)); setTo(todayISO()); }
  };

  const reportsQ = useGetErpCaisseReports({ from, to }, { query: { enabled: isAdmin } as never });
  const ordersQ = useGetAdminOrders();

  const channelStats = useMemo(() => {
    const orders = ordersQ.data ?? [];
    const fromTs = new Date(from).getTime();
    const toTs = new Date(to).getTime() + 86400000;
    const filtered = orders.filter((o) => {
      const ts = new Date(o.createdAt ?? "").getTime();
      return ts >= fromTs && ts < toTs;
    });
    const online = filtered.filter((o) => !o.sellerUserId);
    const inStore = filtered.filter((o) => o.sellerUserId);
    const sumOnline = online.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const sumStore = inStore.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    return { online: { count: online.length, sum: sumOnline }, inStore: { count: inStore.length, sum: sumStore } };
  }, [ordersQ.data, from, to]);

  if (!isAdmin) return <Redirect href={"/admin" as never} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("التقارير", "Reports")} showBack />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 140, gap: 12 }}>
        <View style={styles.presetsRow}>
          {(["today", "7d", "30d", "custom"] as Preset[]).map((p) => {
            const a = preset === p;
            return (
              <Pressable
                key={p}
                onPress={() => apply(p)}
                style={[styles.preset, { backgroundColor: a ? colors.primary : colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.presetTxt, { color: a ? colors.primaryForeground : colors.foreground }]}>
                  {p === "today" ? t("اليوم", "Today")
                    : p === "7d" ? "7d"
                    : p === "30d" ? "30d"
                    : t("مخصص", "Custom")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {preset === "custom" ? (
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>{t("من", "From")}</Text>
              <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>{t("إلى", "To")}</Text>
              <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
            </View>
          </View>
        ) : null}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>{t("القنوات", "Channels")}</Text>
        <View style={styles.row2}>
          <ChannelCard label={t("أونلاين", "Online")} count={channelStats.online.count} sum={channelStats.online.sum} icon="globe" />
          <ChannelCard label={t("داخل المتجر", "In-store")} count={channelStats.inStore.count} sum={channelStats.inStore.sum} icon="home" />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}>{t("الصناديق", "Caisses")}</Text>
        {reportsQ.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : !reportsQ.data || (reportsQ.data.rows ?? []).length === 0 ? (
          <EmptyState icon="bar-chart-2" ar="لا توجد بيانات" en="No data" />
        ) : (
          <>
            {(reportsQ.data.rows as CaisseReportRow[]).map((r) => (
              <View key={r.caisseId} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHead}>
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {r.kind === "main" ? t("الصندوق الرئيسي", "Main Caisse") : (r.owner?.name || r.owner?.email || `Caisse #${r.caisseId}`)}
                  </Text>
                  <Text style={[styles.bal, { color: colors.primary }]}>{fmtDZ(r.currentBalance)}</Text>
                </View>
                <Stat lbl={t("المبيعات", "Sales")} val={fmtDZ(r.totalSales)} />
                <Stat lbl={t("تحويلات داخلة", "In")} val={fmtDZ(r.transfersIn)} />
                <Stat lbl={t("تحويلات خارجة", "Out")} val={fmtDZ(r.transfersOut)} />
              </View>
            ))}
            <View style={[styles.card, { backgroundColor: colors.primary + "1A", borderColor: colors.primary }]}>
              <Text style={[styles.totalLbl, { color: colors.primary }]}>{t("الإجمالي", "Totals")}</Text>
              <Stat lbl={t("المبيعات", "Sales")} val={fmtDZ(reportsQ.data.totals.totalSales)} />
              <Stat lbl={t("صافي الحركة", "Net Movement")} val={fmtDZ(reportsQ.data.totals.netMovement)} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface ChannelProps { label: string; count: number; sum: number; icon: React.ComponentProps<typeof Feather>["name"] }
function ChannelCard({ label, count, sum, icon }: ChannelProps) {
  const colors = useColors();
  return (
    <View style={[styles.chCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.chIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.chLbl, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.chCount, { color: colors.foreground }]}>{count}</Text>
      <Text style={[styles.chSum, { color: colors.primary }]}>{fmtDZ(sum)}</Text>
    </View>
  );
}

function Stat({ lbl, val }: { lbl: string; val: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>{lbl}</Text>
      <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  presetsRow: { flexDirection: "row", gap: 6 },
  preset: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  presetTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  dateRow: { flexDirection: "row", gap: 8 },
  lbl: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 4, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  row2: { flexDirection: "row", gap: 10 },
  chCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  chIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  chLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  chCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  chSum: { fontSize: 12, fontFamily: "Inter_700Bold" },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  bal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalLbl: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
});
