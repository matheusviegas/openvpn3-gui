import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 pt-28 pb-16 text-center">
      <img src="/icon.png" alt="OpenVPN3 GUI" className="h-24 w-24" />
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
        {t("hero.badge")}
      </span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("hero.title")}</h1>
      <p className="max-w-lg text-lg text-muted-foreground">{t("hero.subtitle")}</p>
      <a href="#download">
        <Button size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          {t("hero.cta")}
        </Button>
      </a>
    </section>
  );
}
