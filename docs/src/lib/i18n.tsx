import { createContext, useContext, useState, type ReactNode } from "react";
import { locales, type Locale, type TranslationKey } from "@/locales";

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>(null!);

function detectLocale(): Locale {
  const stored = localStorage.getItem("locale");
  if (stored && stored in locales) return stored as Locale;
  const lang = navigator.language;
  if (lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("es")) return "es";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  const setAndSave = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("locale", l);
  };

  const t = (key: TranslationKey) => locales[locale]?.translations[key as string] ?? key;

  return <I18nContext.Provider value={{ locale, setLocale: setAndSave, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
