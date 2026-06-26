import { useState } from "react";
import {
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { useServerConfig } from "@/context/ServerConfigContext";
import { palette, brand } from "@/constants/brand";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

export default function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { saveServerUrl } = useServerConfig();

  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSave = async () => {
    Keyboard.dismiss();
    setError("");
    setSubmitting(true);

    let outcome: { ok: boolean; message: string };
    try {
      outcome = await saveServerUrl(url);
    } catch {
      outcome = { ok: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
    } finally {
      setSubmitting(false);
    }

    if (outcome.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/login");
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(outcome.message);
    }
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandAr}>{brand.nameAr}</Text>
            <Text style={styles.tagline}>{brand.tagline}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>
              ربط الخادم
            </Text>
            <Text style={[styles.cardSubtitle, { color: c.textMuted }]}>
              أدخل رابط نظام ERP الخاص بمنشأتك للاتصال بالخادم
            </Text>

            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: c.inputBg,
                  borderColor: error ? c.danger : c.border,
                },
              ]}
            >
              <Ionicons name="link" size={18} color={c.textMuted} />
              <TextInput
                testID="erp-url-input"
                value={url}
                onChangeText={(t) => {
                  setUrl(t);
                  if (error) setError("");
                }}
                placeholder="https://erp.midanic.com"
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                inputMode="url"
                textAlign="left"
                style={[styles.input, { color: c.text }]}
                onSubmitEditing={handleSave}
                returnKeyType="go"
              />
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={c.danger} />
                <Text style={[styles.errorText, { color: c.danger }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              testID="connect-button"
              label="اتصال"
              icon="arrow-forward"
              onPress={handleSave}
              loading={submitting}
              disabled={url.trim().length === 0}
              style={{ marginTop: 20 }}
            />
          </View>

          <Text style={styles.hint}>
            يُحفظ الرابط على جهازك ويمكنك تغييره لاحقاً من الإعدادات
          </Text>
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
    marginBottom: 36,
  },
  logo: {
    width: 220,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  brandAr: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 20,
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
    marginTop: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    textAlign: "right",
  },
  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 20,
  },
});
