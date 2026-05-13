import { Stack } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { MoreSheet } from "@/components/admin/MoreSheet";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const colors = useColors();
  const [moreOpen, setMoreOpen] = useState(false);

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
      <AdminBottomNav onMore={() => setMoreOpen(true)} />
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
