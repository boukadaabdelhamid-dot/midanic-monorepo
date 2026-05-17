import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  useApproveErpTransfer,
  useCancelErpTransfer,
  useGetErpTransfers,
  usePrepareErpTransfer,
  useReceiveErpTransfer,
  useRejectErpTransfer,
  useShipErpTransfer,
  type StockTransferSummary,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Tab = "in" | "out" | "received";
type ActionKind = "approve" | "prepare" | "ship" | "receive" | "cancel" | "reject";

export default function TransfersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("in");

  const direction = tab === "received" ? undefined : tab;
  const status = tab === "received" ? "received" : undefined;
  const q = useGetErpTransfers({ direction, status } as never);

  const approve = useApproveErpTransfer();
  const prepare = usePrepareErpTransfer();
  const ship = useShipErpTransfer();
  const receive = useReceiveErpTransfer();
  const cancel = useCancelErpTransfer();
  const reject = useRejectErpTransfer();

  const run = async (action: ActionKind, id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const map = { approve, prepare, ship, receive, cancel, reject } as const;
      await map[action].mutateAsync({ id, data: {} });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      q.refetch();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const actionsFor = (item: StockTransferSummary): ActionKind[] => {
    const s = item.status;
    const isIn = tab === "in";
    if (s === "requested") return isIn ? ["approve", "reject"] : ["cancel"];
    if (s === "approved") return ["prepare", "cancel"];
    if (s === "prepared") return ["ship"];
    if (s === "in_transit") return isIn ? ["receive"] : [];
    return [];
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("التحويلات", "Transfers")} showBack />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(["in", "out", "received"] as Tab[]).map((tk) => {
          const active = tab === tk;
          return (
            <Pressable
              key={tk}
              onPress={() => setTab(tk)}
              style={[styles.tab, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
            >
              <Text style={[styles.tabTxt, { color: active ? colors.primaryForeground : colors.foreground }]}>
                {tk === "in" ? t("واردة", "Incoming") : tk === "out" ? t("صادرة", "Outgoing") : t("مكتملة", "Completed")}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.newBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/admin/transfers/new" as never)}
      >
        <Feather name="plus" size={14} color={colors.primaryForeground} />
        <Text style={[styles.newBtnTxt, { color: colors.primaryForeground }]}>
          {t("تحويل جديد", "New Transfer")}
        </Text>
      </Pressable>

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="shuffle" ar="لا توجد تحويلات" en="No transfers" />}
          renderItem={({ item }) => {
            const actions = actionsFor(item);
            const src = item.sourceStore;
            const dst = item.destinationStore;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHead}>
                  <Text style={[styles.cardId, { color: colors.foreground }]}>#{item.id}</Text>
                  <View style={[styles.statusPill, { backgroundColor: colors.primary + "1A" }]}>
                    <Text style={[styles.statusTxt, { color: colors.primary }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={[styles.cardLine, { color: colors.foreground }]} numberOfLines={1}>
                  {(lang === "ar" ? src?.nameAr : src?.nameEn) ?? "—"} → {(lang === "ar" ? dst?.nameAr : dst?.nameEn) ?? "—"}
                </Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  {item.itemCount ?? 0} {t("منتج", "items")}
                </Text>
                {actions.length > 0 ? (
                  <View style={styles.actions}>
                    {actions.map((a) => (
                      <Pressable
                        key={a}
                        onPress={() => run(a, item.id)}
                        style={[styles.actionBtn, { borderColor: a === "reject" || a === "cancel" ? colors.destructive : colors.primary }]}
                      >
                        <Text style={[styles.actionTxt, { color: a === "reject" || a === "cancel" ? colors.destructive : colors.primary }]}>
                          {a}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  tabs: { padding: 12, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tabTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  newBtn: { marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  newBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 12, gap: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardId: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusTxt: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  cardLine: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  actionTxt: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
});
