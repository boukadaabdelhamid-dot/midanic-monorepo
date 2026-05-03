import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface MenuRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
}

function MenuRow({ icon, label, onPress, value, danger }: MenuRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <Feather name={icon as never} size={18} color={danger ? colors.destructive : colors.mutedForeground} />
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang, toggleLang } = useLang();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleLogout = () => {
    Alert.alert(
      t("تسجيل الخروج", "Sign Out"),
      t("هل أنت متأكد؟", "Are you sure?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("خروج", "Sign Out"),
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View
          style={[styles.avatar, { backgroundColor: colors.muted }]}
        >
          <Feather name="user" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.foreground }]}>
          {t("مرحباً بك", "Welcome")}
        </Text>
        <Text style={[styles.guestSub, { color: colors.mutedForeground }]}>
          {t("سجّل دخولك للاستمتاع بتجربة أفضل", "Sign in for a better experience")}
        </Text>
        <Pressable
          style={[styles.authBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>
            {t("تسجيل الدخول", "Sign In")}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push("/auth/register")}>
          <Text style={[styles.registerLink, { color: colors.primary }]}>
            {t("إنشاء حساب", "Create Account")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.langBtn, { borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); toggleLang(); }}
        >
          <Feather name="globe" size={16} color={colors.primary} />
          <Text style={[styles.langText, { color: colors.primary }]}>
            {lang === "ar" ? "English" : "العربية"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
    >
      <View
        style={[
          styles.profileHeader,
          { backgroundColor: colors.primary, paddingTop: topPad + 20 },
        ]}
      >
        <View style={[styles.avatarLarge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.avatarInitial}>
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>{t("مدير", "Admin")}</Text>
          </View>
        )}
      </View>

      <View style={[styles.section, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {t("الحساب", "Account")}
        </Text>
        <View style={[styles.card, { borderColor: colors.border }]}>
          {!isAdmin && (
            <MenuRow
              icon="package"
              label={t("طلباتي", "My Orders")}
              onPress={() => router.push("/(tabs)/orders")}
            />
          )}
          {isAdmin && (
            <MenuRow
              icon="layers"
              label={t("إدارة الطلبات", "Manage Orders")}
              onPress={() => router.push("/admin")}
            />
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {t("الإعدادات", "Settings")}
        </Text>
        <View style={[styles.card, { borderColor: colors.border }]}>
          <MenuRow
            icon="globe"
            label={t("اللغة", "Language")}
            value={lang === "ar" ? "العربية" : "English"}
            onPress={() => { Haptics.selectionAsync(); toggleLang(); }}
          />
        </View>
      </View>

      <View style={[styles.section, { marginTop: 16 }]}>
        <View style={[styles.card, { borderColor: colors.border }]}>
          <MenuRow
            icon="log-out"
            label={t("تسجيل الخروج", "Sign Out")}
            onPress={handleLogout}
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 8 },
  guestSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  authBtn: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  authBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  registerLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  langText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  profileHeader: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", gap: 4 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarInitial: { color: "#fff", fontSize: 30, fontFamily: "Inter_700Bold" },
  userName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  userEmail: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  adminBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  adminBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 6, marginLeft: 4, textTransform: "uppercase" },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
