import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetOrder,
  useUpdateOrderStatus,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LoadingState, ErrorState, Pill } from "@/components/ErpUi";
import { CURRENCY, fmtDate, fmtNum, orderStatusLabel } from "@/lib/format";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

function statusColor(status: string, c: ReturnType<typeof useColors>) {
  switch (status) {
    case "delivered": return c.success;
    case "cancelled": return c.danger;
    case "shipped": return c.primaryTint;
    case "processing": return c.warning;
    default: return c.textMuted;
  }
}

function BackHeader({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const webPad = Platform.OS === "web" ? 12 : 8;
  return (
    <View style={[styles.header, { backgroundColor: c.primaryDeep, paddingTop: insets.top + webPad }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );
}

export default function OrderDetailScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { id } = useLocalSearchParams<{ id?: string }>();
  const orderId = Number(id);

  const { data: order, isLoading, isError, refetch } = useGetOrder(orderId);
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (status: OrderStatus) => {
    const action = () =>
      updateStatus.mutate(
        { id: orderId, data: { status } },
        { onSuccess: () => { void refetch(); } },
      );
    if (Platform.OS === "web") { action(); return; }
    Alert.alert("تغيير الحالة", `تحديث الحالة إلى "${orderStatusLabel(status)}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "تأكيد", onPress: action },
    ]);
  };

  const o = order as any;
  const items = (o?.items ?? o?.orderItems ?? []) as any[];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title={`طلب #${orderId}`} />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : !o ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>معلومات الطلب</Text>
              <Pill label={orderStatusLabel(o.status)} color={statusColor(o.status, c)} />
            </View>
            <InfoLine icon="person-outline" label="العميل" value={o.customerName} c={c} />
            <InfoLine icon="call-outline" label="الهاتف" value={o.customerPhone} c={c} />
            <InfoLine icon="location-outline" label="العنوان" value={o.shippingAddress} c={c} />
            <InfoLine icon="calendar-outline" label="التاريخ" value={fmtDate(o.createdAt)} c={c} />
            <InfoLine icon="cash-outline" label="المجموع" value={fmtNum(o.totalAmount, CURRENCY)} c={c} />
          </View>

          {items.length > 0 && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>المنتجات ({items.length})</Text>
              {items.map((item: any, i: number) => (
                <View key={i} style={[styles.itemRow, { borderBottomColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: c.text }]} numberOfLines={2}>
                      {item.nameAr || item.nameEn || item.productName || item.name || "—"}
                    </Text>
                    <Text style={[styles.itemQty, { color: c.textMuted }]}>
                      الكمية: {item.quantity} × {fmtNum(item.unitPrice ?? item.price, CURRENCY)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: c.text }]}>
                    {fmtNum(item.totalPrice ?? (item.quantity * (item.unitPrice ?? item.price ?? 0)), CURRENCY)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {isAdmin && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>تغيير الحالة</Text>
              <View style={styles.statusGrid}>
                {ORDER_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    disabled={o.status === s || updateStatus.isPending}
                    style={({ pressed }) => [
                      styles.statusBtn,
                      {
                        backgroundColor: o.status === s ? statusColor(s, c) : c.surfaceAlt,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBtnText, { color: o.status === s ? "#FFFFFF" : c.text }]}>
                      {orderStatusLabel(s)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function InfoLine({ icon, label, value, c }: any) {
  if (!value) return null;
  return (
    <View style={[styles.infoLine, { borderBottomColor: c.border }]}>
      <Ionicons name={icon} size={15} color={c.textMuted} />
      <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontWeight: "800", textAlign: "right" },
  infoLine: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    paddingVertical: 8, borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13, minWidth: 70 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  itemName: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  itemQty: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  statusBtnText: { fontSize: 13, fontWeight: "700" },
});
