import { FileUp, Plug, Activity, AppWindow, Moon, Languages, BarChart3, PanelTop, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/locales";

const features: { icon: React.ReactNode; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: <FileUp className="h-6 w-6" />, titleKey: "features.import.title", descKey: "features.import.desc" },
  { icon: <Plug className="h-6 w-6" />, titleKey: "features.connect.title", descKey: "features.connect.desc" },
  { icon: <Layers className="h-6 w-6" />, titleKey: "features.multi.title", descKey: "features.multi.desc" },
  { icon: <BarChart3 className="h-6 w-6" />, titleKey: "features.stats.title", descKey: "features.stats.desc" },
  { icon: <Activity className="h-6 w-6" />, titleKey: "features.status.title", descKey: "features.status.desc" },
  { icon: <PanelTop className="h-6 w-6" />, titleKey: "features.titlebar.title", descKey: "features.titlebar.desc" },
  { icon: <AppWindow className="h-6 w-6" />, titleKey: "features.tray.title", descKey: "features.tray.desc" },
  { icon: <Moon className="h-6 w-6" />, titleKey: "features.theme.title", descKey: "features.theme.desc" },
  { icon: <Languages className="h-6 w-6" />, titleKey: "features.i18n.title", descKey: "features.i18n.desc" },
];

export function Features() {
  const { t } = useI18n();

  return (
    <section id="features" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-10 text-center text-3xl font-bold">{t("features.title")}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.titleKey} className="rounded-lg border border-border bg-card p-6">
            <div className="mb-3 text-primary">{f.icon}</div>
            <h3 className="mb-1 font-semibold">{t(f.titleKey)}</h3>
            <p className="text-sm text-muted-foreground">{t(f.descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
