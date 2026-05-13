import { useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { locales, type Locale } from "@/locales";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: t("nav.features") },
    { href: "#screenshots", label: t("nav.screenshots") },
    { href: "#download", label: t("nav.download") },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a href="#" className="flex items-center gap-2 font-bold text-lg">
          <img src="/icon.png" alt="OpenVPN3 GUI" className="h-7 w-7" />
          <span className="hidden sm:inline">OpenVPN3 GUI</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Language">
                <span className="text-base">{locales[locale]?.icon}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(locales).map(([code, { icon, label }]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setLocale(code as Locale)}
                  className={locale === code ? "bg-accent" : ""}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-3">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
