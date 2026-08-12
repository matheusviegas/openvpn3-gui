import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface AuthDialogProps {
  open: boolean;
  configName: string;
  username: string;
  password: string;
  error: string;
  onOpenChange: (open: boolean) => void;
  onUsernameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirm: () => void;
}

export function AuthDialog({
  open,
  configName,
  username,
  password,
  error,
  onOpenChange,
  onUsernameChange,
  onPasswordChange,
  onConfirm,
}: AuthDialogProps) {
  const { t } = useI18n();
  const passwordRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  // Read when the dialog opens, so typing in the username field never moves the focus
  const usernameAtOpen = useRef(username);
  usernameAtOpen.current = username;

  // Initial focus: password when the username is already saved, username otherwise.
  // Radix fires this after the portal content is mounted (refs are set) and skips its
  // own "focus the first tabbable element" once the event is prevented.
  const handleOpenAutoFocus = useCallback((event: Event) => {
    const target = usernameAtOpen.current ? passwordRef.current : usernameRef.current;
    if (!target) return;
    event.preventDefault();
    target.focus();
  }, []);

  const canSubmit = username.trim().length > 0 && password.length > 0;
  const inputClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={handleOpenAutoFocus}>
        <DialogTitle>{t("authRequired")}</DialogTitle>
        <DialogDescription>{t("authDescription").replace("{config}", configName)}</DialogDescription>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-username" className="text-sm font-medium">{t("username")}</label>
            <input
              id="auth-username"
              ref={usernameRef}
              className={inputClass}
              autoComplete="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder={t("usernamePlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onConfirm()}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="auth-password" className="text-sm font-medium">{t("password")}</label>
            <input
              id="auth-password"
              ref={passwordRef}
              type="password"
              className={inputClass}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onConfirm()}
            />
          </div>

          <p className="text-xs text-muted-foreground">{t("usernameSavedHint")}</p>
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={onConfirm} disabled={!canSubmit}>{t("connect")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
