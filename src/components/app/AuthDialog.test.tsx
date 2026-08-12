import { StrictMode, useState } from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthDialog } from "./AuthDialog";
import { I18nProvider } from "@/lib/i18n";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));

afterEach(cleanup);

/// Mirrors how App.tsx drives the dialog: opened by a button, username coming from
/// the credential store, state owned by the parent.
function Harness({ savedUsername }: { savedUsername: string }) {
  const [state, setState] = useState({ open: false, username: "", password: "" });

  return (
    <StrictMode>
      <I18nProvider>
        <button onClick={() => setState({ open: true, username: savedUsername, password: "" })}>
          open
        </button>
        <AuthDialog
          open={state.open}
          configName="vpn-mfa"
          username={state.username}
          password={state.password}
          error=""
          onOpenChange={(open) => setState((s) => ({ ...s, open }))}
          onUsernameChange={(username) => setState((s) => ({ ...s, username }))}
          onPasswordChange={(password) => setState((s) => ({ ...s, password }))}
          onConfirm={() => {}}
        />
      </I18nProvider>
    </StrictMode>
  );
}

const getUsernameInput = () => screen.getByLabelText(/usu[aá]rio|username/i) as HTMLInputElement;
const getPasswordInput = () => screen.getByLabelText(/senha|password|contrase/i) as HTMLInputElement;

describe("AuthDialog initial focus", () => {
  it("focuses the password field when a username is already saved", async () => {
    const user = userEvent.setup();
    render(<Harness savedUsername="matheus-souza" />);

    await user.click(screen.getByText("open"));

    await waitFor(() => expect(document.activeElement).toBe(getPasswordInput()));
  });

  it("focuses the username field when there is nothing saved", async () => {
    const user = userEvent.setup();
    render(<Harness savedUsername="" />);

    await user.click(screen.getByText("open"));

    await waitFor(() => expect(document.activeElement).toBe(getUsernameInput()));
  });

  it("keeps the focus on the username field while the user types another username", async () => {
    const user = userEvent.setup();
    render(<Harness savedUsername="matheus-souza" />);

    await user.click(screen.getByText("open"));
    await waitFor(() => expect(document.activeElement).toBe(getPasswordInput()));

    await user.clear(getUsernameInput());
    await user.type(getUsernameInput(), "outro.usuario");

    expect(getUsernameInput().value).toBe("outro.usuario");
    expect(document.activeElement).toBe(getUsernameInput());

    // and it must not be stolen right after either
    await new Promise((r) => setTimeout(r, 150));
    expect(document.activeElement).toBe(getUsernameInput());
  });
});
