import { Github } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          {t("footer.madeBy")}{" "}
          <a href="https://github.com/matheusviegas" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Matheus Souza
          </a>
        </p>
        <div className="flex items-center gap-4">
          <a href="https://github.com/matheusviegas/openvpn3-gui/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            {t("footer.license")}
          </a>
          <a href="https://github.com/matheusviegas/openvpn3-gui" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
            <Github className="h-4 w-4" />
            {t("footer.source")}
          </a>
        </div>
      </div>
    </footer>
  );
}
