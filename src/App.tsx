import { useState, useEffect, useCallback, useRef } from "react";
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

interface SessionInfo {
  config_name: string;
  device: string;
  virtual_ip: string | null;
  connected_since: string | null;
}

interface SessionStatsRaw {
  tun_bytes_in: number;
  tun_bytes_out: number;
  ping_ms: number | null;
}

interface StatsState {
  tunBytesIn: number;
  tunBytesOut: number;
  pingMs: number | null;
  speedDown: number;
  speedUp: number;
}

function App() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, StatsState>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [importDialog, setImportDialog] = useState({ open: false, filePath: "", name: "", error: "" });
  const [aboutOpen, setAboutOpen] = useState(false);
  const prevStatsRef = useRef<Record<string, { bytesIn: number; bytesOut: number; timestamp: number }>>({});

  const NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

  const refreshConfigs = useCallback(async () => {
    try { setConfigs(await invoke<VpnConfig[]>("list_configs")); } catch (e) { console.error(e); }
  }, []);

  const refreshStatus = useCallback(async () => {
    try { setSessions(await invoke<SessionInfo[]>("get_status")); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    refreshConfigs();
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshConfigs, refreshStatus]);

  // Stats polling for active sessions
  useEffect(() => {
    if (sessions.length === 0) {
      setSessionStats({});
      prevStatsRef.current = {};
      return;
    }

    const poll = async () => {
      const now = Date.now();
      for (const session of sessions) {
        try {
          const raw = await invoke<SessionStatsRaw>("get_session_stats", { configName: session.config_name });
          const prev = prevStatsRef.current[session.config_name];
          let speedDown = 0;
          let speedUp = 0;
          if (prev) {
            const dt = (now - prev.timestamp) / 1000;
            if (dt > 0) {
              speedDown = Math.max(0, (raw.tun_bytes_in - prev.bytesIn) / dt);
              speedUp = Math.max(0, (raw.tun_bytes_out - prev.bytesOut) / dt);
            }
          }
          prevStatsRef.current[session.config_name] = { bytesIn: raw.tun_bytes_in, bytesOut: raw.tun_bytes_out, timestamp: now };
          setSessionStats(s => ({ ...s, [session.config_name]: { tunBytesIn: raw.tun_bytes_in, tunBytesOut: raw.tun_bytes_out, pingMs: raw.ping_ms, speedDown, speedUp } }));
        } catch (e) { console.error(e); }
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Clean up stats for disconnected sessions
  useEffect(() => {
    const activeNames = new Set(sessions.map(s => s.config_name));
    setSessionStats(prev => {
      const next: Record<string, StatsState> = {};
      for (const key of Object.keys(prev)) {
        if (activeNames.has(key)) next[key] = prev[key];
      }
      return next;
    });
  }, [sessions]);

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
      // Retry refreshStatus until session appears (openvpn3 may take a moment)
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const updated = await invoke<SessionInfo[]>("get_status");
        setSessions(updated);
        if (updated.some(s => s.config_name === name)) break;
      }
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

  const getSession = (name: string) => sessions.find(s => s.config_name === name);

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
      <StatusBar connected={sessions.length > 0} onAboutOpen={() => setAboutOpen(true)} />

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
            {configs.map((c, i) => {
              const session = getSession(c.name);
              return (
                <ConfigItem
                  key={`${c.name}-${i}`}
                  name={c.name}
                  isConnected={!!session}
                  loadingAction={loadingAction}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onRemove={handleRemove}
                  disabled={!!loadingAction}
                  virtualIp={session?.virtual_ip}
                  connectedSince={session?.connected_since}
                  stats={sessionStats[c.name]}
                />
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;
