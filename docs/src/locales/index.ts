import en from "./en.json";
import ptBR from "./pt-BR.json";
import es from "./es.json";

export interface LocaleEntry {
  label: string;
  icon: string;
  translations: Record<string, string>;
}

export const locales: Record<string, LocaleEntry> = {
  en: { label: "English", icon: "🇺🇸", translations: en },
  "pt-BR": { label: "Português", icon: "🇧🇷", translations: ptBR },
  es: { label: "Español", icon: "🇪🇸", translations: es },
};

export type Locale = keyof typeof locales;
export type TranslationKey = keyof typeof en;
