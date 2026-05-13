import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { locales, type Locale, type TranslationKey } from "@/locales";

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem("locale") as Locale) || "pt-BR");

  const setAndSave = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("locale", l);
  };

  useEffect(() => {
    invoke("set_tray_language", { locale }).catch(() => {});
  }, [locale]);

  const t = (key: TranslationKey) => locales[locale]?.translations[key] ?? key;

  return <I18nContext.Provider value={{ locale, setLocale: setAndSave, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
