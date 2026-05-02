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
      if (stored === "ar" || stored === "en") setLang(stored);
    });
  }, []);

  const toggleLang = useCallback(async () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    await AsyncStorage.setItem("midanic_lang", next);
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
