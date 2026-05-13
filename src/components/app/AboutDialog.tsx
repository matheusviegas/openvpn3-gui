import { openUrl } from "@tauri-apps/plugin-opener";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("about")}</DialogTitle>
        <DialogDescription>{t("aboutDescription")}</DialogDescription>
        <div className="mt-4 space-y-2 text-sm">
          <p><span className="text-muted-foreground">{t("version")}:</span> {__APP_VERSION__}</p>
          <p><span className="text-muted-foreground">{t("developer")}:</span> Matheus Souza</p>
          <p><span className="text-muted-foreground">{t("repository")}:</span>{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://github.com/matheusviegas/openvpn3-gui"); }} className="text-primary underline cursor-pointer">
              github.com/matheusviegas/openvpn3-gui
            </a>
          </p>
          <p className="text-muted-foreground pt-2">{t("contribute")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
