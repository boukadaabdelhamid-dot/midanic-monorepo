import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DrawerHeader } from "@/components/DrawerHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

type Module = {
  labelAr: string;
  labelFr: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: string;
};

const MODULES: Module[] = [
  { labelAr: "المنتجات", labelFr: "Articles", icon: "cube", color: "#06B6D4", href: "/(drawer)/products" },
  { labelAr: "المبيعات", labelFr: "Ventes", icon: "cart", color: "#10B981", href: "/(drawer)/orders" },
  { labelAr: "المشتريات", labelFr: "Achats", icon: "document-text", color: "#F43F5E", href: "/(drawer)/purchase-orders" },
  { labelAr: "الصناديق", labelFr: "Caisse", icon: "wallet", color: "#F59E0B", href: "/(drawer)/caisse" },
  { labelAr: "العملاء", labelFr: "Clients", icon: "people", color: "#0EA5E9", href: "/(drawer)/customers" },
  { labelAr: "الموردون", labelFr: "Fournisseurs", icon: "business", color: "#8B5CF6", href: "/(drawer)/suppliers" },
  { labelAr: "الموظفون", labelFr: "Employés", icon: "person-add", color: "#6366F1", href: "/(drawer)/employees" },
  { labelAr: "لوحة التحكم", labelFr: "Dashboard", icon: "grid", color: "#475569", href: "/(drawer)/dashboard" },
  { labelAr: "الوقت الفعلي", labelFr: "Temps Réel", icon: "pulse", color: "#EC4899", href: "/(drawer)/realtime" },
  { labelAr: "المخزون", labelFr: "Stock", icon: "layers", color: "#2563EB", href: "/(drawer)/inventory" },
  { labelAr: "الحضور", labelFr: "Présences", icon: "time", color: "#14B8A6", href: "/(drawer)/attendance" },
  { labelAr: "الإجازات", labelFr: "Congés", icon: "calendar", color: "#F97316", href: "/(drawer)/leaves" },
  { labelAr: "المحاسبة", labelFr: "Comptabilité", icon: "card", color: "#D946EF", href: "/(drawer)/accounting" },
];

const CIRCLE_SIZE = Math.min((Dimensions.get("window").width - 64) / 2, 130);

function ModuleButton({ mod }: { mod: Module }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.navigate(mod.href as never)}
      style={({ pressed }) => [
        styles.modButton,
        { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <View
        style={[
          styles.circle,
          {
            backgroundColor: mod.color,
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            shadowColor: mod.color,
          },
        ]}
      >
        <Ionicons name={mod.icon} size={CIRCLE_SIZE * 0.38} color="#FFFFFF" />
      </View>
      <Text style={[styles.modLabelAr, { color: c.text }]} numberOfLines={1}>
        {mod.labelAr}
      </Text>
      <Text style={[styles.modLabelFr, { color: c.textMuted }]} numberOfLines={1}>
        {mod.labelFr}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const c = useColors();
  const { user, stores, currentStoreId } = useAuth();
  const activeStore = stores.find((s) => s.id === currentStoreId);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader
        title="الرئيسية"
        subtitle={activeStore?.nameAr || activeStore?.nameEn}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeRow}>
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Ionicons name="briefcase" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeGreet, { color: c.textMuted }]}>
              {user?.name ? `مرحباً، ${user.name}` : "مرحباً بك في"}
            </Text>
            <Text style={[styles.welcomeTitle, { color: c.text }]}>
              نظام الإدارة
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>الوحدات</Text>

        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <ModuleButton key={mod.href} mod={mod} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeGreet: {
    fontSize: 13,
    textAlign: "right",
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 24,
  },
  modButton: {
    alignItems: "center",
    width: CIRCLE_SIZE,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modLabelAr: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  modLabelFr: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
});
