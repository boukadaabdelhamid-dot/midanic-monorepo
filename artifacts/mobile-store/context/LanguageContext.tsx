import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, I18nManager, Platform } from "react-native";

export type Lang = "ar" | "en";

interface LanguageContextValue {
  lang: Lang;
  isRTL: boolean;
  toggleLang: () => void;
  t: (ar: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    AsyncStorage.getItem("midanic_lang").then((stored) => {
      const l: Lang = stored === "ar" || stored === "en" ? stored : "ar";
      setLang(l);
      I18nManager.forceRTL(l === "ar");
    });
  }, []);

  const toggleLang = useCallback(async () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    const directionChanges = (next === "ar") !== I18nManager.isRTL;
    setLang(next);
    I18nManager.forceRTL(next === "ar");
    await AsyncStorage.setItem("midanic_lang", next);
    if (directionChanges && Platform.OS !== "web") {
      Alert.alert(
        next === "ar" ? "تغيير الاتجاه" : "Direction Changed",
        next === "ar"
          ? "أعد تشغيل التطبيق لتطبيق الاتجاه الجديد بالكامل."
          : "Please restart the app to fully apply the new layout direction.",
        [{ text: next === "ar" ? "حسناً" : "OK" }]
      );
    }
  }, [lang]);

  const t = useCallback(
    (ar: string, en: string) => (lang === "ar" ? ar : en),
    [lang]
  );

  const value = useMemo(
    () => ({ lang, isRTL: lang === "ar", toggleLang, t }),
    [lang, toggleLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
