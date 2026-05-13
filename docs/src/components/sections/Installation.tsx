import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const RELEASE_URL = "https://github.com/matheusviegas/openvpn3-gui/releases/latest";

export function Installation() {
  const { t } = useI18n();

  return (
    <section id="download" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-4 text-center text-3xl font-bold">{t("install.title")}</h2>
      <p className="mb-10 text-center text-sm text-muted-foreground">{t("install.prereq")}</p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* .deb */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">{t("install.deb.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("install.deb.desc")}</p>
          <code className="rounded bg-muted px-3 py-2 text-xs">{t("install.deb.cmd")}</code>
          <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer" className="mt-auto">
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              {t("install.button")}
            </Button>
          </a>
        </div>

        {/* AppImage */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">{t("install.appimage.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("install.appimage.desc")}</p>
          <code className="rounded bg-muted px-3 py-2 text-xs">{t("install.appimage.cmd")}</code>
          <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer" className="mt-auto">
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              {t("install.button")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
