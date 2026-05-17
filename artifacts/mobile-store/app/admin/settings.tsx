import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface RowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}

function Row({ icon, label, value, danger, onPress }: RowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={18} color={danger ? colors.destructive : colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowVal, { color: colors.mutedForeground }]}>{value}</Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { lang, toggleLang, t } = useLang();
  const { logout, user } = useAuth();

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
            router.replace("/auth/login" as never);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("الإعدادات", "Settings")} showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
        <View>
          <Text style={[styles.sectionLbl, { color: colors.mutedForeground }]}>{t("الحساب", "Account")}</Text>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Row icon="user" label={user?.name ?? "—"} value={user?.email ?? ""} />
            <Row icon="award" label={t("الدور", "Role")} value={user?.role ?? ""} />
          </View>
        </View>

        <View>
          <Text style={[styles.sectionLbl, { color: colors.mutedForeground }]}>{t("التفضيلات", "Preferences")}</Text>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Row
              icon="globe"
              label={t("اللغة", "Language")}
              value={lang === "ar" ? "العربية" : "English"}
              onPress={() => { Haptics.selectionAsync(); toggleLang(); }}
            />
            <Row
              icon="map-pin"
              label={t("تبديل المتجر", "Switch Store")}
              onPress={() => router.push("/admin/stores" as never)}
            />
          </View>
        </View>

        <View>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Row
              icon="shopping-bag"
              label={t("الخروج إلى المتجر", "Exit to Shop")}
              onPress={() => { Haptics.selectionAsync(); router.replace("/(tabs)" as never); }}
            />
          </View>
        </View>

        <View>
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Row icon="log-out" label={t("تسجيل الخروج", "Sign Out")} onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1 },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  rowVal: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
