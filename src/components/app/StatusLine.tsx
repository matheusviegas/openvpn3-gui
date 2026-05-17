import { useI18n } from "@/lib/i18n";

interface StatusLineProps {
  sessionCount: number;
  openvpnVersion: string;
}

export function StatusLine({ sessionCount, openvpnVersion }: StatusLineProps) {
  const { t } = useI18n();
  const connected = sessionCount > 0;

  return (
    <footer className="flex items-center gap-3 px-3 py-1.5 border-t text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-muted-foreground/40"}`} />
      {openvpnVersion && <span>{openvpnVersion}</span>}
      {connected && (
        <span>{sessionCount} {sessionCount === 1 ? t("activeSession") : t("activeSessions")}</span>
      )}
    </footer>
  );
}
