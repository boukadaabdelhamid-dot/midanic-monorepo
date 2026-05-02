import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs, Badge } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, Text } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useGetCart } from "@workspace/api-client-react";
import { useLang } from "@/context/LanguageContext";

function useTabData() {
  const { user, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const { data: cartItems = [] } = useGetCart({ query: { enabled: !!user } });
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  return { cartCount, notifCount: isAdmin ? unreadCount : 0, isAdmin };
}

function NativeTabLayout() {
  const { cartCount, notifCount } = useTabData();
  const { t } = useLang();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t("الرئيسية", "Home")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf="magnifyingglass" />
        <Label>{t("بحث", "Search")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} />
        <Label>{t("السلة", "Cart")}</Label>
        {cartCount > 0 && <Badge>{cartCount}</Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>{t("الطلبات", "Orders")}</Label>
        {notifCount > 0 && <Badge>{notifCount}</Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t("حسابي", "Profile")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function CartTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { cartCount } = useTabData();
  return (
    <View>
      {Platform.OS === "ios" ? (
        <SymbolView name={focused ? "cart.fill" : "cart"} tintColor={color} size={24} />
      ) : (
        <Feather name="shopping-cart" size={22} color={color} />
      )}
      {cartCount > 0 && (
        <View style={[badgeStyle.dot, { backgroundColor: "#EF4444" }]}>
          <Text style={badgeStyle.dotText}>{cartCount > 9 ? "9+" : cartCount}</Text>
        </View>
      )}
    </View>
  );
}

function OrdersTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { notifCount, isAdmin } = useTabData();
  return (
    <View>
      {Platform.OS === "ios" ? (
        <SymbolView name={focused ? (isAdmin ? "bell.fill" : "clock.fill") : (isAdmin ? "bell" : "clock")} tintColor={color} size={24} />
      ) : (
        <Feather name={isAdmin ? "bell" : "package"} size={22} color={color} />
      )}
      {notifCount > 0 && (
        <View style={[badgeStyle.dot, { backgroundColor: "#EF4444" }]}>
          <Text style={badgeStyle.dotText}>{notifCount > 9 ? "9+" : notifCount}</Text>
        </View>
      )}
    </View>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { t, isRTL } = useLang();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("الرئيسية", "Home"),
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "house.fill" : "house"} tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("بحث", "Search"),
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("السلة", "Cart"),
          tabBarIcon: (props) => <CartTabIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("الطلبات", "Orders"),
          tabBarIcon: (props) => <OrdersTabIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("حسابي", "Profile"),
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const badgeStyle = StyleSheet.create({
  dot: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  dotText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
});
