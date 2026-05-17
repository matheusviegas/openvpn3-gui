import { useState, useEffect } from "react";
import { Loader2, Trash2, Plug, Unplug, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

interface SessionStats {
  tunBytesIn: number;
  tunBytesOut: number;
  pingMs: number | null;
  speedDown: number;
  speedUp: number;
}

interface ConfigItemProps {
  name: string;
  isConnected: boolean;
  loadingAction: string | null;
  onConnect: (name: string) => void;
  onDisconnect: (name: string) => void;
  onRemove: (name: string) => void;
  disabled: boolean;
  virtualIp?: string | null;
  connectedSince?: string | null;
  stats?: SessionStats;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1048576) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / 1048576).toFixed(1)} MB/s`;
}

export function ConfigItem({ name, isConnected, loadingAction, onConnect, onDisconnect, onRemove, disabled, virtualIp, connectedSince, stats }: ConfigItemProps) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState("");
  const isLoadingConnect = loadingAction === `connect-${name}`;
  const isLoadingDisconnect = loadingAction === `disconnect-${name}`;
  const isLoadingRemove = loadingAction === `remove-${name}`;

  useEffect(() => {
    if (!isConnected || !connectedSince) { setElapsed(""); return; }
    const update = () => {
      const start = new Date(connectedSince.replace(" ", "T")).getTime();
      const diff = Date.now() - start;
      if (isNaN(diff) || diff < 0) { setElapsed(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isConnected, connectedSince]);

  return (
    <li className="flex flex-col rounded-lg border bg-card p-3 gap-2">
      <div className="flex items-center justify-between">
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
      </div>

      {isConnected && (
        <div className="border-t pt-2 text-sm text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>{virtualIp && `IP: ${virtualIp}`}</span>
            <span>{stats?.pingMs != null && `${t("ping")}: ${stats.pingMs.toFixed(0)}ms`}</span>
            <span>{elapsed && `⏱ ${elapsed}`}</span>
          </div>
          {stats && (
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3" /> {formatSpeed(stats.speedDown)} ({t("total")}: {formatBytes(stats.tunBytesIn)})
              </span>
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" /> {formatSpeed(stats.speedUp)} ({t("total")}: {formatBytes(stats.tunBytesOut)})
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
