import { Loader2, Trash2, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

interface ConfigItemProps {
  name: string;
  isConnected: boolean;
  loadingAction: string | null;
  onConnect: (name: string) => void;
  onDisconnect: (name: string) => void;
  onRemove: (name: string) => void;
  disabled: boolean;
}

export function ConfigItem({ name, isConnected, loadingAction, onConnect, onDisconnect, onRemove, disabled }: ConfigItemProps) {
  const { t } = useI18n();
  const isLoadingConnect = loadingAction === `connect-${name}`;
  const isLoadingDisconnect = loadingAction === `disconnect-${name}`;
  const isLoadingRemove = loadingAction === `remove-${name}`;

  return (
    <li className="flex items-center justify-between rounded-lg border bg-card p-3">
      <span className="font-medium">{name}</span>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Button variant="destructive" size="sm" onClick={() => onDisconnect(name)} disabled={!!loadingAction}>
            {isLoadingDisconnect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            {isLoadingDisconnect ? t("disconnecting") : t("disconnect")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => onConnect(name)} disabled={disabled}>
            {isLoadingConnect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {isLoadingConnect ? t("connecting") : t("connect")}
          </Button>
        )}
        {!isConnected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!!loadingAction}>
                {isLoadingRemove ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>{t("removeConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmRemove")}</AlertDialogDescription>
              <div className="flex justify-end gap-2 mt-4">
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(name)}>{t("confirm")}</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </li>
  );
}
