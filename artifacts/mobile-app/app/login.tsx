import { useState } from "react";
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
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
import { useAuth } from "@/context/AuthContext";
import { useServerConfig } from "@/context/ServerConfigContext";
import { palette, brand } from "@/constants/brand";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

export default function Login() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { serverUrl } = useServerConfig();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    setSubmitting(true);

    let outcome: Awaited<ReturnType<typeof signIn>>;
    try {
      outcome = await signIn(email, password);
    } catch {
      outcome = { ok: false, message: "حدث خطأ غير متوقع. حاول مرة أخرى." };
    } finally {
      setSubmitting(false);
    }

    if (outcome.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // The sign-in result decides where to land: store picker or the dashboard.
      router.replace(outcome.needsStoreSelection ? "/select-store" : "/(tabs)");
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(outcome.message);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

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
            تسجيل الدخول
          </Text>
          <Text style={[styles.cardSubtitle, { color: c.textMuted }]}>
            أدخل بيانات حسابك للوصول إلى نظام الإدارة
          </Text>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: c.inputBg, borderColor: c.border },
            ]}
          >
            <Ionicons name="mail" size={18} color={c.textMuted} />
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              placeholder="admin@midanic.com"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              textAlign="left"
              style={[styles.input, { color: c.text }]}
              returnKeyType="next"
            />
          </View>

          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: c.inputBg,
                borderColor: error ? c.danger : c.border,
                marginTop: 12,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={18} color={c.textMuted} />
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError("");
              }}
              placeholder="كلمة المرور"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              textAlign="left"
              style={[styles.input, { color: c.text }]}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              testID="toggle-password"
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={c.textMuted}
              />
            </Pressable>
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
            testID="login-button"
            label="دخول"
            icon="log-in"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            style={{ marginTop: 20 }}
          />
        </View>

        <View style={styles.serverRow}>
          <Ionicons name="server" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.serverText} numberOfLines={1}>
            {serverUrl ?? "—"}
          </Text>
        </View>
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
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  serverText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    maxWidth: "80%",
  },
});
