import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/locales";

const screenshots: { src: string; labelKey: TranslationKey }[] = [
  { src: "/screenshots/home.png", labelKey: "screenshots.homeDark" },
  { src: "/screenshots/home_light.png", labelKey: "screenshots.homeLight" },
  { src: "/screenshots/connected.png", labelKey: "screenshots.connectedDark" },
  { src: "/screenshots/connected_light.png", labelKey: "screenshots.connectedLight" },
];

export function Screenshots() {
  const { t } = useI18n();

  return (
    <section id="screenshots" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-10 text-center text-3xl font-bold">{t("screenshots.title")}</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {screenshots.map((s) => (
          <figure key={s.src} className="overflow-hidden rounded-lg border border-border">
            <img src={s.src} alt={t(s.labelKey)} className="w-full" loading="lazy" />
            <figcaption className="bg-card px-3 py-2 text-center text-sm text-muted-foreground">
              {t(s.labelKey)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
