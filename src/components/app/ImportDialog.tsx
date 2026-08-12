import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface ImportDialogProps {
  open: boolean;
  name: string;
  error: string;
  requiresAuth: boolean;
  username: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onUsernameChange: (username: string) => void;
  onConfirm: () => void;
}

export function ImportDialog({ open, name, error, requiresAuth, username, onOpenChange, onNameChange, onUsernameChange, onConfirm }: ImportDialogProps) {
  const { t } = useI18n();
  const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("importName")}</DialogTitle>
        <DialogDescription>{t("importNamePlaceholder")}</DialogDescription>
        <input
          className={`mt-3 ${inputClass}`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("importNamePlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}

        {requiresAuth && (
          <div className="mt-4 flex flex-col gap-1 border-t pt-3">
            <label htmlFor="import-username" className="text-sm font-medium">{t("username")}</label>
            <input
              id="import-username"
              className={inputClass}
              autoComplete="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder={t("usernamePlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            />
            <p className="text-xs text-muted-foreground">{t("importUsernameHint")}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={onConfirm}>{t("save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
