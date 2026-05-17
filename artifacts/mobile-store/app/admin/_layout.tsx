import { Redirect, Stack, usePathname } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { MoreSheet } from "@/components/admin/MoreSheet";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const colors = useColors();
  const pathname = usePathname();
  const { token, user, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!token) return <Redirect href={"/auth/login" as never} />;
  const role = user?.role;
  if (role !== "admin" && role !== "employee") {
    return <Redirect href={"/(tabs)" as never} />;
  }

  // Hide bottom nav on detail screens that benefit from full real estate
  const hideNav =
    pathname?.includes("/transfers/new") ||
    pathname?.includes("/purchase-orders/new");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="caisse" />
        <Stack.Screen name="online-orders" />
        <Stack.Screen name="inventory/index" />
        <Stack.Screen name="inventory/[productId]" />
        <Stack.Screen name="transfers" />
        <Stack.Screen name="transfers/new" />
        <Stack.Screen name="purchase-orders" />
        <Stack.Screen name="purchase-orders/new" />
        <Stack.Screen name="products/index" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="stores" />
        <Stack.Screen name="staff" />
        <Stack.Screen name="settings" />
      </Stack>
      {!hideNav ? (
        <>
          <AdminBottomNav onMore={() => setMoreOpen(true)} />
          <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
