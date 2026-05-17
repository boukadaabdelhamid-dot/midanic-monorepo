import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { MoreSheet } from "@/components/admin/MoreSheet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationBanner } from "@/components/NotificationBanner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");
setBaseUrl(apiUrl);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function Shell() {
  const colors = useColors();
  const pathname = usePathname();
  const { token, user, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAuthRoute = pathname?.startsWith("/auth");

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthRoute) {
    if (!token) return <Redirect href="/auth/login" />;
    const role = user?.role;
    if (role !== "admin" && role !== "employee") {
      return <Redirect href="/auth/login" />;
    }
  }

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
        <Stack.Screen name="auth/login" />
      </Stack>
      {!isAuthRoute ? (
        <>
          <AdminBottomNav onMore={() => setMoreOpen(true)} />
          <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
          <NotificationBanner />
        </>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LanguageProvider>
              <NotificationsProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <Shell />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </NotificationsProvider>
            </LanguageProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
