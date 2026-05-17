import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import {
  useGetErpStoresMine,
  useSelectStore,
} from "@workspace/api-client-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function StoresScreen() {
  const colors = useColors();
  const { t, lang } = useLang();
  const { isAdmin, login, user, token } = useAuth();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const storesQ = useGetErpStoresMine();
  const select = useSelectStore();

  useEffect(() => {
    AsyncStorage.getItem("midanic_erp_store_slug").then(setActiveSlug);
  }, []);

  if (!isAdmin) return <Redirect href="/" />;

  const handleSwitch = async (storeId: number, slug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await select.mutateAsync({ data: { storeId } });
      await AsyncStorage.setItem("midanic_erp_store_slug", slug);
      setActiveSlug(slug);
      if (token && user && res?.token) {
        await login(res.token, { ...user, currentStoreId: storeId });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("المتاجر", "Stores")} showBack />
      {storesQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={storesQ.data ?? []}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={storesQ.isRefetching} onRefresh={storesQ.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="map-pin" ar="لا توجد متاجر" en="No stores" />}
          renderItem={({ item }) => {
            const active = item.slug === activeSlug;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderWidth: active ? 2 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => handleSwitch(item.id, item.slug)}
                disabled={select.isPending || active}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
                  <Feather name="map-pin" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {lang === "ar" ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={[styles.slug, { color: colors.mutedForeground }]}>{item.slug}</Text>
                </View>
                {active ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={12} color={colors.primaryForeground} />
                  </View>
                ) : (
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  list: { padding: 14, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontFamily: "Inter_700Bold" },
  slug: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
