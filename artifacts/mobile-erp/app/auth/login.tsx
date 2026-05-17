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

export default function ErpLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL, lang, toggleLang } = useLang();
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
          if (data.user.role !== "admin" && data.user.role !== "employee") {
            Alert.alert(
              t("غير مسموح", "Not Allowed"),
              t(
                "هذا التطبيق مخصص للموظفين والمدراء فقط.",
                "This app is for staff and admins only.",
              ),
            );
            return;
          }
          await login(data.token, data.user);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/");
        },
        onError: () => {
          Alert.alert(t("خطأ", "Login Failed"), t("البريد أو كلمة المرور غير صحيحة", "Invalid email or password"));
        },
      },
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
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 40, paddingBottom: bottomPad + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/midanic-logo.jpg")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.brand, { color: colors.primary }]}>MIDANIC ERP</Text>
          <Text style={[styles.brandAr, { color: colors.mutedForeground }]}>
            {t("نظام الإدارة", "Management System")}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("تسجيل دخول الموظفين", "Staff Sign In")}
        </Text>

        <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <TextInput
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

        <Pressable
          style={[styles.langBtn, { borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); toggleLang(); }}
        >
          <Feather name="globe" size={16} color={colors.primary} />
          <Text style={[styles.langText, { color: colors.primary }]}>
            {lang === "ar" ? "English" : "العربية"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, gap: 14 },
  logoWrap: { alignItems: "center", marginBottom: 8, gap: 4 },
  logo: { width: 80, height: 80, borderRadius: 16 },
  brand: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  brandAr: { fontSize: 13, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  field: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignSelf: "center", marginTop: 8 },
  langText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
