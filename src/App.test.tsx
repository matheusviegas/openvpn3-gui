import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "./App";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

// Captures the callback passed to listen("tray-action", cb) so tests can fire it
// directly, the same way the Rust backend would via app.emit.
type TrayActionPayload = { kind: string; config_name: string };
type TrayActionHandler = (event: { payload: TrayActionPayload }) => void;
let trayActionHandler: TrayActionHandler | null = null;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, handler: TrayActionHandler) => {
    if (eventName === "tray-action") trayActionHandler = handler;
    return Promise.resolve(() => {});
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
  }),
}));

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));

function renderApp() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  );
}

const CONFIGS = [
  { name: "office", requires_auth: false, username: null },
  { name: "matheus-mfa", requires_auth: true, username: "matheus" },
];

beforeEach(() => {
  trayActionHandler = null;
  invokeMock.mockReset();
  invokeMock.mockImplementation((cmd: string) => {
    switch (cmd) {
      case "list_configs":
        return Promise.resolve(CONFIGS);
      case "get_status":
        return Promise.resolve([]);
      case "get_openvpn_version":
        return Promise.resolve("3.10");
      case "sync_tray_menu":
        return Promise.resolve(undefined);
      case "connect":
        return Promise.resolve("ok");
      case "disconnect":
        return Promise.resolve("ok");
      default:
        return Promise.resolve(undefined);
    }
  });
});

afterEach(cleanup);

describe("App tray-action listener", () => {
  it("connects a non-MFA profile directly when its tray entry is clicked", async () => {
    renderApp();
    await waitFor(() => expect(trayActionHandler).not.toBeNull());
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("list_configs"));

    trayActionHandler!({ payload: { kind: "connect", config_name: "office" } });

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "connect",
        expect.objectContaining({ configName: "office" })
      )
    );
  });

  it("opens the AuthDialog instead of connecting directly for an MFA profile", async () => {
    renderApp();
    await waitFor(() => expect(trayActionHandler).not.toBeNull());
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("list_configs"));

    trayActionHandler!({ payload: { kind: "connect", config_name: "matheus-mfa" } });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(screen.getByRole("dialog").textContent).toContain("matheus-mfa");
    expect(invokeMock).not.toHaveBeenCalledWith("connect", expect.anything());
  });

  it("disconnects a connected profile when its tray entry is clicked", async () => {
    invokeMock.mockImplementation((cmd: string) => {
      switch (cmd) {
        case "list_configs":
          return Promise.resolve(CONFIGS);
        case "get_status":
          return Promise.resolve([{ config_name: "office", device: "tun0", virtual_ip: "10.0.0.2", connected_since: "now" }]);
        case "get_session_stats":
          return Promise.resolve({ tun_bytes_in: 0, tun_bytes_out: 0, ping_ms: null });
        case "get_openvpn_version":
          return Promise.resolve("3.10");
        case "sync_tray_menu":
          return Promise.resolve(undefined);
        case "disconnect":
          return Promise.resolve("ok");
        default:
          return Promise.resolve(undefined);
      }
    });

    renderApp();
    await waitFor(() => expect(trayActionHandler).not.toBeNull());
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("get_status"));

    trayActionHandler!({ payload: { kind: "disconnect", config_name: "office" } });

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "disconnect",
        expect.objectContaining({ configName: "office" })
      )
    );
  });
});
