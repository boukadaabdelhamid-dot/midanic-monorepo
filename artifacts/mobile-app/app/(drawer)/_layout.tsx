import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from "react-native";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Redirect, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useServerConfig } from "@/context/ServerConfigContext";

type NavItem = {
  labelAr: string;
  labelFr: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  adminOnly?: boolean;
  dividerBefore?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { labelAr: "الرئيسية", labelFr: "Accueil", icon: "home-outline", href: "/(drawer)/", dividerBefore: false },
  { labelAr: "حسابي", labelFr: "Mon Compte", icon: "person-circle-outline", href: "/(drawer)/mon-compte" },
  { labelAr: "لوحة التحكم", labelFr: "Dashboard", icon: "grid-outline", href: "/(drawer)/dashboard", dividerBefore: true },
  { labelAr: "الوقت الفعلي", labelFr: "Temps Réel", icon: "pulse-outline", href: "/(drawer)/realtime" },
  { labelAr: "الصناديق", labelFr: "Caisses", icon: "wallet-outline", href: "/(drawer)/caisse", dividerBefore: true },
  { labelAr: "تقرير الصناديق", labelFr: "Rapport caisses", icon: "bar-chart-outline", href: "/(drawer)/caisse-reports", adminOnly: true },
  { labelAr: "المبيعات", labelFr: "Ventes", icon: "cart-outline", href: "/(drawer)/orders", dividerBefore: true },
  { labelAr: "طلبات المتجر", labelFr: "Commandes en ligne", icon: "globe-outline", href: "/(drawer)/online-orders" },
  { labelAr: "المنتجات", labelFr: "Articles", icon: "cube-outline", href: "/(drawer)/products" },
  { labelAr: "المشتريات", labelFr: "Achats", icon: "document-text-outline", href: "/(drawer)/purchase-orders" },
  { labelAr: "المخزون", labelFr: "Stock", icon: "layers-outline", href: "/(drawer)/inventory" },
  { labelAr: "التحويلات", labelFr: "Transferts", icon: "swap-horizontal-outline", href: "/(drawer)/transfers" },
  { labelAr: "العملاء", labelFr: "Clients", icon: "people-outline", href: "/(drawer)/customers", dividerBefore: true },
  { labelAr: "الموردون", labelFr: "Fournisseurs", icon: "business-outline", href: "/(drawer)/suppliers" },
  { labelAr: "الموظفون", labelFr: "Employés", icon: "person-add-outline", href: "/(drawer)/employees", dividerBefore: true },
  { labelAr: "إدارة الحسابات", labelFr: "Accès / Staff", icon: "shield-checkmark-outline", href: "/(drawer)/staff", adminOnly: true },
  { labelAr: "الصلاحيات", labelFr: "Permissions", icon: "key-outline", href: "/(drawer)/permissions", adminOnly: true },
  { labelAr: "المتاجر", labelFr: "Magasins", icon: "storefront-outline", href: "/(drawer)/magasins", adminOnly: true },
  { labelAr: "الحضور", labelFr: "Présences", icon: "time-outline", href: "/(drawer)/attendance" },
  { labelAr: "الإجازات", labelFr: "Congés", icon: "calendar-outline", href: "/(drawer)/leaves" },
  { labelAr: "المحاسبة", labelFr: "Comptabilité", icon: "card-outline", href: "/(drawer)/accounting", dividerBefore: true },
  { labelAr: "التقارير", labelFr: "Rapports", icon: "trending-up-outline", href: "/(drawer)/reports", adminOnly: true },
  { labelAr: "الإعدادات", labelFr: "Paramètres", icon: "settings-outline", href: "/(drawer)/settings", dividerBefore: true },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user, stores, currentStoreId, signOut } = useAuth();
  const isAdmin = user?.role === "admin";
  const activeStore = stores.find((s) => s.id === currentStoreId);
  const webTop = Platform.OS === "web" ? 16 : 0;
  const [soundEnabled, setSoundEnabled] = useState(true);

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const navigate = (href: string) => {
    props.navigation.closeDrawer();
    router.navigate(href as never);
  };

  const handleSignOut = () => {
    props.navigation.closeDrawer();
    if (Platform.OS === "web") {
      void signOut().then(() => router.replace("/login"));
      return;
    }
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: () => void signOut().then(() => router.replace("/login")),
      },
    ]);
  };

  return (
    <View style={[styles.drawer, { backgroundColor: c.primaryDeep }]}>
      <View
        style={[
          styles.drawerHeader,
          { paddingTop: insets.top + webTop + 12, borderBottomColor: "rgba(255,255,255,0.1)" },
        ]}
      >
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Midanic ERP</Text>
            <Text style={styles.brandNameAr}>ميدانيك</Text>
          </View>
        </View>

        {activeStore && (
          <View style={styles.storeBadge}>
            <Ionicons name="storefront-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.storeName} numberOfLines={1}>
              {activeStore.nameAr || activeStore.nameEn}
            </Text>
          </View>
        )}

        {user && (
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color={c.primaryDeep} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userRole}>
                {user.role === "admin" ? "مدير" : "موظف"}
              </Text>
            </View>
          </View>
        )}
      </View>

      <DrawerContentScrollView
        {...props}
        scrollEnabled
        contentContainerStyle={styles.navList}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/(drawer)/"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(item.href.replace("/(drawer)", ""));

          return (
            <React.Fragment key={item.href}>
              {item.dividerBefore && (
                <View style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
              )}
              <Pressable
                onPress={() => navigate(item.href)}
                style={({ pressed }) => [
                  styles.navItem,
                  isActive && [styles.navItemActive, { backgroundColor: "rgba(255,255,255,0.12)" }],
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons
                  name={isActive ? (item.icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : item.icon}
                  size={20}
                  color={isActive ? "#FFFFFF" : "rgba(255,255,255,0.65)"}
                />
                <View style={styles.navLabelWrap}>
                  <Text style={[styles.navLabelAr, { color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.75)" }]}>
                    {item.labelAr}
                  </Text>
                  <Text style={styles.navLabelFr}>{item.labelFr}</Text>
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}

        <View style={{ height: 20 }} />
      </DrawerContentScrollView>

      <View
        style={[
          styles.drawerFooter,
          { paddingBottom: insets.bottom + 12, borderTopColor: "rgba(255,255,255,0.1)" },
        ]}
      >
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => setSoundEnabled((v) => !v)}
            style={({ pressed }) => [styles.soundBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={8}
          >
            <Ionicons
              name={soundEnabled ? "volume-high-outline" : "volume-mute-outline"}
              size={20}
              color={soundEnabled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)"}
            />
            <Text style={[styles.soundText, { color: soundEnabled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)" }]}>
              {soundEnabled ? "صوت" : "صامت"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#E07A63" />
            <Text style={styles.signOutText}>خروج</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { serverUrl, isLoading: serverLoading } = useServerConfig();
  const { isLoading: authLoading, isAuthenticated, needsStoreSelection } = useAuth();

  if (!serverLoading && !authLoading) {
    if (!serverUrl) return <Redirect href="/onboarding" />;
    if (!isAuthenticated) return <Redirect href="/login" />;
    if (needsStoreSelection) return <Redirect href="/select-store" />;
  }

  return (
    <Drawer
      screenOptions={{ headerShown: false, swipeEdgeWidth: 60 }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="index" />
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="orders" />
      <Drawer.Screen name="online-orders" />
      <Drawer.Screen name="products" />
      <Drawer.Screen name="employees" />
      <Drawer.Screen name="attendance" />
      <Drawer.Screen name="leaves" />
      <Drawer.Screen name="suppliers" />
      <Drawer.Screen name="purchase-orders" />
      <Drawer.Screen name="inventory" />
      <Drawer.Screen name="transfers" />
      <Drawer.Screen name="customers" />
      <Drawer.Screen name="accounting" />
      <Drawer.Screen name="caisse" />
      <Drawer.Screen name="caisse-reports" />
      <Drawer.Screen name="reports" />
      <Drawer.Screen name="staff" />
      <Drawer.Screen name="realtime" />
      <Drawer.Screen name="mon-compte" />
      <Drawer.Screen name="settings" />
      <Drawer.Screen name="permissions" />
      <Drawer.Screen name="magasins" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brandText: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  brandNameAr: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  storeName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    flex: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userRole: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },
  navList: {
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 1,
  },
  navItemActive: {
    borderRadius: 10,
  },
  navLabelWrap: {
    flex: 1,
  },
  navLabelAr: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "left",
  },
  navLabelFr: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  soundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  soundText: {
    fontSize: 12,
    fontWeight: "600",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E07A63",
  },
});
