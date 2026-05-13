import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Toaster, toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBar, ConfigItem, ImportDialog, AboutDialog } from "@/components/app";
import { useI18n } from "@/lib/i18n";
import "./index.css";

interface VpnConfig {
  name: string;
}

interface VpnStatus {
  connected: boolean;
  config_name: string | null;
  virtual_ip: string | null;
  connected_since: string | null;
}

function App() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [status, setStatus] = useState<VpnStatus>({ connected: false, config_name: null, virtual_ip: null, connected_since: null });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [importDialog, setImportDialog] = useState({ open: false, filePath: "", name: "", error: "" });
  const [aboutOpen, setAboutOpen] = useState(false);

  const NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

  const refreshConfigs = useCallback(async () => {
    try { setConfigs(await invoke<VpnConfig[]>("list_configs")); } catch (e) { console.error(e); }
  }, []);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await invoke<VpnStatus>("get_status")); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    refreshConfigs();
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshConfigs, refreshStatus]);

  useEffect(() => {
    if (!status.connected || !status.connected_since) { setElapsed(""); return; }
    const update = () => {
      const start = new Date(status.connected_since!.replace(" ", "T")).getTime();
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
  }, [status.connected, status.connected_since]);

  const translateError = (e: string): string => {
    if (e.includes("already exists")) return t("configAlreadyExists");
    if (e.includes("Invalid name")) return t("importNameInvalid");
    return e;
  };

  const handleImport = async () => {
    const file = await open({ filters: [{ name: "OpenVPN Config", extensions: ["ovpn", "conf"] }] });
    if (!file) return;
    const path = file as string;
    const defaultName = path.split("/").pop()?.replace(/\.(ovpn|conf)$/, "") || "config";
    setImportDialog({ open: true, filePath: path, name: defaultName, error: "" });
  };

  const handleImportConfirm = async () => {
    const { filePath, name } = importDialog;
    if (!NAME_REGEX.test(name)) {
      setImportDialog((s) => ({ ...s, error: t("importNameInvalid") }));
      return;
    }
    setImportDialog((s) => ({ ...s, open: false }));
    setLoadingAction("import");
    try {
      await invoke("import_config", { filePath, name });
      await refreshConfigs();
      toast.success(t("configImported"));
    } catch (e: any) {
      toast.error(t("importFailed"), { description: translateError(String(e)) });
    }
    setLoadingAction(null);
  };

  const handleRemove = async (name: string) => {
    setLoadingAction(`remove-${name}`);
    try {
      await invoke("remove_config", { name });
      await refreshConfigs();
      toast.success(t("configRemoved"));
    } catch (e: any) {
      toast.error(t("removeFailed"), { description: String(e) });
    }
    setLoadingAction(null);
  };

  const handleConnect = async (name: string) => {
    setLoadingAction(`connect-${name}`);
    await new Promise((r) => setTimeout(r, 0));
    try {
      await invoke("connect", { configName: name });
      await refreshStatus();
      toast.success(t("connectedMsg"));
    } catch (e: any) {
      toast.error(t("connectFailed"), { description: String(e) });
    }
    setLoadingAction(null);
  };

  const handleDisconnect = async (name: string) => {
    setLoadingAction(`disconnect-${name}`);
    await new Promise((r) => setTimeout(r, 0));
    try {
      await invoke("disconnect", { configName: name });
      await refreshStatus();
      toast.success(t("disconnectedMsg"));
    } catch (e: any) {
      toast.error(t("disconnectFailed"), { description: String(e) });
    }
    setLoadingAction(null);
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <Toaster richColors position="top-right" />
      <ImportDialog
        open={importDialog.open}
        name={importDialog.name}
        error={importDialog.error}
        onOpenChange={(open) => setImportDialog((s) => ({ ...s, open }))}
        onNameChange={(name) => setImportDialog((s) => ({ ...s, name, error: "" }))}
        onConfirm={handleImportConfirm}
      />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <StatusBar
        connected={status.connected}
        virtualIp={status.virtual_ip}
        elapsed={elapsed}
        onAboutOpen={() => setAboutOpen(true)}
      />

      <main className="flex-1 flex flex-col gap-3 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("configurations")}</h2>
          <Button size="sm" onClick={handleImport} disabled={!!loadingAction}>
            {loadingAction === "import" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("import")}
          </Button>
        </div>

        {configs.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("noConfigs")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {configs.map((c, i) => (
              <ConfigItem
                key={`${c.name}-${i}`}
                name={c.name}
                isConnected={status.connected && status.config_name === c.name}
                loadingAction={loadingAction}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRemove={handleRemove}
                disabled={!!loadingAction || status.connected}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;
