import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGetErpStoresMine } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

interface AdminHeaderProps {
  title?: string;
  showBack?: boolean;
  onStorePress?: () => void;
}

export function AdminHeader({ title, showBack, onStorePress }: AdminHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, toggleLang } = useLang();
  const { token, user } = useAuth();
  const { unreadCount } = useNotifications();
  const { data: stores = [] } = useGetErpStoresMine({
    query: { enabled: !!token && (user?.role === "admin" || user?.role === "employee") } as never,
  });

  const [storeSlug, setStoreSlug] = React.useState<string | null>(null);
  React.useEffect(() => {
    AsyncStorage.getItem("midanic_erp_store_slug").then(setStoreSlug);
  }, []);

  const currentStore = stores.find((s) => s.slug === storeSlug) ?? stores[0];

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: topPad + 10,
        },
      ]}
    >
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn}>
          <Feather name="grid" size={18} color={colors.primary} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <Text style={[styles.brand, { color: colors.foreground }]} numberOfLines={1}>
            {t("ميدانك ERP", "Midanic ERP")}
          </Text>
        )}
        {currentStore ? (
          <Pressable onPress={onStorePress} style={styles.storeRow} hitSlop={6}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.storeName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {lang === "ar" ? currentStore.nameAr : currentStore.nameEn}
            </Text>
            {onStorePress ? <Feather name="chevron-down" size={11} color={colors.mutedForeground} /> : null}
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          toggleLang();
        }}
        style={styles.iconBtn}
        hitSlop={10}
      >
        <Text style={[styles.langText, { color: colors.primary }]}>
          {lang === "ar" ? "EN" : "AR"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/online-orders")}
        style={styles.iconBtn}
        hitSlop={10}
      >
        <Feather name="bell" size={18} color={colors.foreground} />
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  brand: { fontSize: 15, fontFamily: "Inter_700Bold" },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  storeName: { fontSize: 11, fontFamily: "Inter_500Medium", maxWidth: 160 },
  langText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
});
