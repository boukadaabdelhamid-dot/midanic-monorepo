import { Feather } from "@expo/vector-icons";
import { useGetMyOrders } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useNotifications, type WsNotification } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import type { Order } from "@workspace/api-client-react";

function NotificationItem({ notif }: { notif: WsNotification }) {
  const colors = useColors();
  const isOrder = notif.type === "new_order";
  return (
    <View
      style={[
        styles.notifCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.notifIcon,
          { backgroundColor: isOrder ? colors.primary + "22" : colors.warning + "22" },
        ]}
      >
        <Feather
          name={isOrder ? "shopping-bag" : "alert-triangle"}
          size={18}
          color={isOrder ? colors.primary : colors.warning}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: colors.foreground }]}>
          {notif.title}
        </Text>
        <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>
          {notif.body}
        </Text>
        <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
          {new Date(notif.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {!notif.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}

function OrderItem({ order, onPress }: { order: Order; onPress: () => void }) {
  const colors = useColors();
  const { t } = useLang();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.orderCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.orderHeader}>
        <Text style={[styles.orderNum, { color: colors.foreground }]}>
          {t("طلب", "Order")} #{order.id}
        </Text>
        <OrderStatusBadge status={order.status} />
      </View>
      <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
      </Text>
      <View style={styles.orderFooter}>
        <Text style={[styles.orderTotal, { color: colors.primary }]}>
          {t(`${Number(order.totalAmount).toFixed(2)} ر.س`, `SAR ${Number(order.totalAmount).toFixed(2)}`)}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { user, isAdmin } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const router = useRouter();

  const { data: orders = [], isLoading } = useGetMyOrders({
    query: { enabled: !!user && !isAdmin },
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="package" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("طلباتي", "My Orders")}
        </Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
            {t("تسجيل الدخول", "Sign In")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("الإشعارات", "Notifications")}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <Pressable style={styles.clearBtn} onPress={markAllRead}>
            <Feather name="check-circle" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable style={styles.clearBtn} onPress={clearAll}>
            <Feather name="trash-2" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 80 },
            notifications.length === 0 && styles.centerContent,
          ]}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="bell" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                {t("لا توجد إشعارات", "No notifications")}
              </Text>
            </View>
          }
          renderItem={({ item }) => <NotificationItem notif={item} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("طلباتي", "My Orders")}
        </Text>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 80 },
            orders.length === 0 && styles.centerContent,
          ]}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="package" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                {t("لا توجد طلبات", "No orders yet")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderItem order={item} onPress={() => router.push(`/order/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerContent: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  clearBtn: { padding: 4 },
  list: { padding: 16, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  loginBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  loginBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNum: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  orderDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  orderTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  notifCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
