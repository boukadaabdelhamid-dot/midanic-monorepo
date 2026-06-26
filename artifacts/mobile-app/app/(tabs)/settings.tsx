import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useServerConfig } from "@/context/ServerConfigContext";
import { useAuth } from "@/context/AuthContext";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/Button";
import { brand } from "@/constants/brand";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;

export default function Settings() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { serverUrl, status, statusMessage, refreshConnection, disconnect } =
    useServerConfig();
  const { user, stores, currentStoreId, signOut } = useAuth();
  const [working, setWorking] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState<boolean>(false);

  const activeStore = stores.find((s) => s.id === currentStoreId) ?? null;

  const handleDisconnect = async () => {
    setWorking(true);
    await signOut();
    await disconnect();
    setWorking(false);
    router.replace("/onboarding");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.replace("/login");
  };

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      void handleSignOut();
      return;
    }
    Alert.alert(
      "تسجيل الخروج",
      "سيتم تسجيل خروجك من الحساب الحالي. هل تريد المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: () => void handleSignOut(),
        },
      ],
    );
  };

  const confirmDisconnect = () => {
    if (Platform.OS === "web") {
      void handleDisconnect();
      return;
    }
    Alert.alert(
      "تغيير الخادم",
      "سيتم فصل الاتصال الحالي والعودة لشاشة إدخال الرابط. هل تريد المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "متابعة",
          style: "destructive",
          onPress: () => void handleDisconnect(),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + WEB_TOP_INSET + 20 },
      ]}
    >
      <Text style={[styles.title, { color: c.text }]}>الإعدادات</Text>

      <View
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>الحساب</Text>

        <View style={styles.accountRow}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Ionicons name="person" size={22} color={c.onPrimary} />
          </View>
          <View style={styles.accountText}>
            <Text style={[styles.accountName, { color: c.text }]} numberOfLines={1}>
              {user?.name ?? "—"}
            </Text>
            <Text
              style={[styles.accountEmail, { color: c.textMuted }]}
              numberOfLines={1}
            >
              {user?.email ?? "—"}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: c.textMuted }]}>الدور</Text>
          <Text style={[styles.infoValue, { color: c.text }]}>
            {user?.role === "admin" ? "مدير" : user?.role === "employee" ? "موظف" : "—"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: c.textMuted }]}>المتجر</Text>
          <Text style={[styles.infoValue, { color: c.text }]} numberOfLines={1}>
            {activeStore?.nameAr ?? "—"}
          </Text>
        </View>

        <Button
          testID="signout-button"
          label="تسجيل الخروج"
          variant="danger"
          icon="log-out"
          onPress={confirmSignOut}
          loading={signingOut}
          style={{ marginTop: 16, height: 46 }}
        />
      </View>

      <View
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: c.text }]}>الخادم</Text>
          <StatusPill status={status} />
        </View>

        <View style={styles.urlRow}>
          <Ionicons name="link" size={16} color={c.textMuted} />
          <Text style={[styles.url, { color: c.textMuted }]} numberOfLines={1}>
            {serverUrl ?? "—"}
          </Text>
        </View>

        {statusMessage ? (
          <Text style={[styles.statusMessage, { color: c.textMuted }]}>
            {statusMessage}
          </Text>
        ) : null}

        <Button
          label="اختبار الاتصال"
          variant="secondary"
          icon="refresh"
          onPress={() => {
            void refreshConnection();
          }}
          loading={status === "checking"}
          style={{ marginTop: 16, height: 46 }}
        />

        <Button
          testID="disconnect-button"
          label="تغيير الخادم"
          variant="danger"
          icon="swap-horizontal"
          onPress={confirmDisconnect}
          loading={working}
          style={{ marginTop: 12, height: 46 }}
        />
      </View>

      <View
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>عن التطبيق</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: c.textMuted }]}>التطبيق</Text>
          <Text style={[styles.infoValue, { color: c.text }]}>
            {brand.nameEn} ERP
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: c.textMuted }]}>الإصدار</Text>
          <Text style={[styles.infoValue, { color: c.text }]}>1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "right",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  accountEmail: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "right",
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  url: {
    flex: 1,
    fontSize: 14,
  },
  statusMessage: {
    fontSize: 13,
    marginTop: 8,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
});
