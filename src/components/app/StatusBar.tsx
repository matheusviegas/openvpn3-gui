import { Sun, Moon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { locales } from "@/locales";

interface StatusBarProps {
  connected: boolean;
  virtualIp: string | null;
  elapsed: string;
  onAboutOpen: () => void;
}

export function StatusBar({ connected, virtualIp, elapsed, onAboutOpen }: StatusBarProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const currentLocale = locales[locale];

  return (
    <header className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${connected ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" : "bg-muted-foreground/40"}`} />
        <span className="font-semibold">{connected ? t("connected") : t("disconnected")}</span>
        {connected && virtualIp && <span className="text-sm text-muted-foreground">IP: {virtualIp}</span>}
        {connected && elapsed && <span className="text-sm text-muted-foreground">⏱ {elapsed}</span>}
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <span className="text-base">{currentLocale.icon}</span>
              {currentLocale.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(locales).map(([key, { label, icon }]) => (
              <DropdownMenuItem key={key} onClick={() => setLocale(key)} className={locale === key ? "font-bold" : ""}>
                <span className="text-base">{icon}</span> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={onAboutOpen}>
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
