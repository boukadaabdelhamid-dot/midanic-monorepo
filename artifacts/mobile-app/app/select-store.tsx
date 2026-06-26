import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { palette, brand } from "@/constants/brand";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

export default function SelectStore() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { stores, chooseStore, signOut, user } = useAuth();

  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleSelect = async (storeId: number) => {
    if (pendingId != null) return;
    setError("");
    setPendingId(storeId);

    let outcome: { ok: boolean; message: string };
    try {
      outcome = await chooseStore(storeId);
    } catch {
      outcome = { ok: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
    } finally {
      setPendingId(null);
    }

    if (outcome.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(outcome.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.navy }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + WEB_TOP_INSET + 40,
            paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 32,
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandAr}>{brand.nameAr}</Text>
          <Text style={styles.tagline}>
            {user?.name ? `مرحباً ${user.name}` : "اختر المتجر"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>اختر المتجر</Text>
          <Text style={[styles.cardSubtitle, { color: c.textMuted }]}>
            لديك صلاحية الوصول إلى أكثر من متجر. اختر المتجر للمتابعة
          </Text>

          <View style={styles.list}>
            {stores.map((store) => {
              const busy = pendingId === store.id;
              const disabled = pendingId != null && !busy;
              return (
                <Pressable
                  key={store.id}
                  testID={`store-${store.id}`}
                  onPress={() => void handleSelect(store.id)}
                  disabled={pendingId != null}
                  style={({ pressed }) => [
                    styles.storeRow,
                    {
                      backgroundColor: c.surfaceAlt,
                      borderColor: c.border,
                      opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.storeIcon, { backgroundColor: c.primary }]}
                  >
                    <Ionicons name="storefront" size={20} color={c.onPrimary} />
                  </View>
                  <View style={styles.storeText}>
                    <Text
                      style={[styles.storeName, { color: c.text }]}
                      numberOfLines={1}
                    >
                      {store.nameAr}
                    </Text>
                    <Text
                      style={[styles.storeSlug, { color: c.textMuted }]}
                      numberOfLines={1}
                    >
                      {store.nameEn}
                    </Text>
                  </View>
                  <Ionicons
                    name={busy ? "ellipsis-horizontal" : "chevron-back"}
                    size={20}
                    color={c.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => void handleSignOut()}
          hitSlop={8}
          style={styles.signOutRow}
          testID="signout-from-store"
        >
          <Ionicons name="log-out" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 108,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  brandAr: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 18,
  },
  tagline: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    borderRadius: 22,
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "right",
  },
  list: {
    gap: 12,
    marginTop: 20,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  storeText: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  storeSlug: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "right",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    textAlign: "right",
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  signOutText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
});
