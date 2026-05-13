import en from "../../locales/en.json";
import ptBR from "../../locales/pt-BR.json";
import es from "../../locales/es.json";

export interface LocaleEntry {
  label: string;
  icon: string;
  translations: Record<string, string>;
}

// To add a new language: create locales/<code>.json, import it, and add an entry here.
export const locales: Record<string, LocaleEntry> = {
  en: { label: "English", icon: "🇺🇸", translations: en },
  "pt-BR": { label: "Português", icon: "🇧🇷", translations: ptBR },
  "es": { label: "Español", icon: "🇪🇸", translations: es },
};

export type Locale = keyof typeof locales;
export type TranslationKey = keyof typeof en;
