import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useServerConfig } from "@/context/ServerConfigContext";
import { useAuth } from "@/context/AuthContext";

const WEB_TAB_EXTRA = Platform.OS === "web" ? 34 : 0;

export default function TabsLayout() {
  const c = useColors();
  const { serverUrl, isLoading: serverLoading } = useServerConfig();
  const {
    isLoading: authLoading,
    isAuthenticated,
    needsStoreSelection,
  } = useAuth();

  // Guard the tab shell so a direct deep-link can't bypass auth gating.
  if (!serverLoading && !authLoading) {
    if (!serverUrl) return <Redirect href="/onboarding" />;
    if (!isAuthenticated) return <Redirect href="/login" />;
    if (needsStoreSelection) return <Redirect href="/select-store" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textInverse + "99",
        tabBarStyle: {
          backgroundColor: c.primaryDeep,
          borderTopColor: "transparent",
          height: 64 + WEB_TAB_EXTRA,
          paddingTop: 8,
          paddingBottom: 10 + WEB_TAB_EXTRA,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "الطلبات",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "المنتجات",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
