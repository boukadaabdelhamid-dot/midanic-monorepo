import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useCloseErpCaisseSession,
  useGetErpCaisses,
  useGetErpCaisseSessions,
  useOpenErpCaisseSession,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtNum } from "@/lib/format";

function CaisseCard({ caisse }: { caisse: any }) {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const sessions = useGetErpCaisseSessions(caisse.id);
  const openSession = useOpenErpCaisseSession();
  const closeSession = useCloseErpCaisseSession();

  const activeSessions = ((sessions.data ?? []) as any[]).filter((s: any) => s.status === "open");
  const hasActive = activeSessions.length > 0;

  const handleOpen = () => {
    openSession.mutate({ data: { caisseId: caisse.id, openingBalance: 0 } }, {
      onSuccess: () => void sessions.refetch(),
      onError: () => { if (Platform.OS !== "web") Alert.alert("خطأ", "تعذّر فتح الصندوق"); },
    });
  };

  const handleClose = (sessionId: number) => {
    const action = () => closeSession.mutate(
      { id: sessionId, data: { actualClosingBalance: String(caisse.currentBalance ?? 0) } },
      { onSuccess: () => void sessions.refetch() },
    );
    if (Platform.OS === "web") { action(); return; }
    Alert.alert("إغلاق الصندوق", "هل تريد إغلاق هذه الجلسة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "إغلاق", style: "destructive", onPress: action },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.caisseInfo}>
          <View style={[styles.icon, { backgroundColor: "#F59E0B22" }]}>
            <Ionicons name="wallet" size={22} color="#F59E0B" />
          </View>
          <View>
            <Text style={[styles.caisseName, { color: c.text }]} numberOfLines={1}>{caisse.name}</Text>
            <Text style={[styles.balance, { color: c.primaryTint }]}>
              {fmtNum(caisse.currentBalance ?? caisse.balance ?? 0, CURRENCY)}
            </Text>
          </View>
        </View>
        <Pill label={hasActive ? "مفتوح" : "مغلق"} color={hasActive ? c.success : c.textMuted} />
      </View>

      {isAdmin && (
        <View style={styles.actions}>
          {!hasActive ? (
            <Pressable
              onPress={handleOpen}
              disabled={openSession.isPending}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: c.success + "22", opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="lock-open-outline" size={16} color={c.success} />
              <Text style={[styles.actionText, { color: c.success }]}>فتح</Text>
            </Pressable>
          ) : (
            activeSessions.map((s: any) => (
              <Pressable
                key={s.id}
                onPress={() => handleClose(s.id)}
                disabled={closeSession.isPending}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: c.danger + "22", opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="lock-closed-outline" size={16} color={c.danger} />
                <Text style={[styles.actionText, { color: c.danger }]}>إغلاق</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function CaisseScreen() {
  const c = useColors();
  const { data, isLoading, isError, isFetching, refetch } = useGetErpCaisses();
  const caisses = (data ?? []) as any[];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الصناديق" subtitle="Caisses" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <FlatList
          data={caisses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="wallet-outline" message="لا توجد صناديق" />}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={c.primary} />}
          renderItem={({ item }) => <CaisseCard caisse={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caisseInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  caisseName: { fontSize: 16, fontWeight: "700" },
  balance: { fontSize: 14, fontWeight: "800", marginTop: 2, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  actionText: { fontSize: 14, fontWeight: "700" },
});
