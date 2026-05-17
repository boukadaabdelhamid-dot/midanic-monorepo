import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface MoreItem {
  href: string;
  ar: string;
  en: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  adminOnly?: boolean;
}

const ITEMS: MoreItem[] = [
  { href: "/admin/transfers", ar: "التحويلات", en: "Transfers", icon: "shuffle" },
  { href: "/admin/purchase-orders", ar: "أوامر الشراء", en: "Purchase Orders", icon: "truck", adminOnly: true },
  { href: "/admin/products", ar: "المنتجات", en: "Products", icon: "tag", adminOnly: true },
  { href: "/admin/reports", ar: "التقارير", en: "Reports", icon: "bar-chart-2", adminOnly: true },
  { href: "/admin/customers", ar: "العملاء", en: "Customers", icon: "users" },
  { href: "/admin/stores", ar: "المتاجر", en: "Stores", icon: "map-pin", adminOnly: true },
  { href: "/admin/staff", ar: "الموظفون", en: "Staff", icon: "user-check", adminOnly: true },
  { href: "/admin/settings", ar: "الإعدادات", en: "Settings", icon: "settings" },
];

export function MoreSheet({ visible, onClose }: MoreSheetProps) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLang();
  const { isAdmin } = useAuth();

  const items = ITEMS.filter((it) => !it.adminOnly || isAdmin);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("المزيد", "More")}
          </Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {items.map((it) => (
              <Pressable
                key={it.href}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                  router.push(it.href as never);
                }}
              >
                <View style={[styles.tileIcon, { backgroundColor: colors.primary + "1A" }]}>
                  <Feather name={it.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.tileLabel, { color: colors.foreground }]}>{t(it.ar, it.en)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, maxHeight: "75%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31%", aspectRatio: 1, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 6 },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
});
