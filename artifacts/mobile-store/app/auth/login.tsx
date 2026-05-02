import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useLogin } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const loginMutation = useLogin();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("خطأ", "Error"), t("يرجى ملء جميع الحقول", "Please fill all fields"));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loginMutation.mutate(
      { data: { email: email.trim(), password } },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/");
        },
        onError: () => {
          Alert.alert(t("خطأ", "Login Failed"), t("البريد أو كلمة المرور غير صحيحة", "Invalid email or password"));
        },
      }
    );
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: bottomPad + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/midanic-logo.jpg")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.brand, { color: colors.primary }]}>MIDANIC</Text>
          <Text style={[styles.brandAr, { color: colors.mutedForeground }]}>ميدانيك</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("تسجيل الدخول", "Sign In")}
        </Text>

        <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="email-input"
            style={[styles.input, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t("البريد الإلكتروني", "Email")}
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="password-input"
            style={[styles.input, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t("كلمة المرور", "Password")}
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoComplete="password"
          />
          <Pressable onPress={() => setShowPass(!showPass)}>
            <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Pressable
          testID="login-btn"
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleLogin}
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
              {t("دخول", "Sign In")}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/register")} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            {t("ليس لديك حساب؟", "Don't have an account?")}
          </Text>
          <Text style={[styles.switchLink, { color: colors.primary }]}>
            {t("إنشاء حساب", "Register")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 16 },
  logoWrap: { alignItems: "center", marginBottom: 8, gap: 4 },
  logo: { width: 70, height: 70, borderRadius: 14 },
  brand: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  brandAr: { fontSize: 13, fontFamily: "Inter_400Regular" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  field: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
