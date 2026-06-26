import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ServerConfigProvider } from "@/context/ServerConfigContext";
import { AuthProvider } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ServerConfigProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="login" />
                <Stack.Screen name="select-store" />
                <Stack.Screen name="(drawer)" />
                <Stack.Screen name="order-detail" />
                <Stack.Screen name="product-form" />
                <Stack.Screen name="employee-form" />
                <Stack.Screen name="supplier-form" />
                <Stack.Screen name="customer-detail" />
                <Stack.Screen name="po-form" />
                <Stack.Screen name="accounting-form" />
                <Stack.Screen name="leave-form" />
                <Stack.Screen name="inventory-adjust" />
                <Stack.Screen name="transfer-detail" />
                <Stack.Screen name="staff-form" />
              </Stack>
            </AuthProvider>
          </ServerConfigProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
