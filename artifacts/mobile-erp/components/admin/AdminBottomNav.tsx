import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface NavItem {
  key: string;
  ar: string;
  en: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  href?: string;
  onPress?: () => void;
}

interface AdminBottomNavProps {
  onMore: () => void;
}

export function AdminBottomNav({ onMore }: AdminBottomNavProps) {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  const items: NavItem[] = [
    { key: "/", ar: "الرئيسية", en: "Home", icon: "home", href: "/" },
    { key: "/caisse", ar: "الصندوق", en: "Caisse", icon: "shopping-bag", href: "/caisse" },
    { key: "/online-orders", ar: "الطلبات", en: "Orders", icon: "package", href: "/online-orders" },
    { key: "/inventory", ar: "المخزون", en: "Stock", icon: "box", href: "/inventory" },
    { key: "more", ar: "المزيد", en: "More", icon: "more-horizontal", onPress: onMore },
  ];

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomPad + 6,
        },
      ]}
    >
      {items.map((it) => {
        const active = it.href && (pathname === it.href || (it.href === "/inventory" && pathname.startsWith("/inventory")));
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              Haptics.selectionAsync();
              if (it.onPress) it.onPress();
              else if (it.href) router.push(it.href as never);
            }}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Feather
              name={it.icon}
              size={20}
              color={active ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.mutedForeground },
              ]}
            >
              {t(it.ar, it.en)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  label: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
