import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";

function getAppVersion(): string {
  try {
    // In CI/release: use git tag (e.g. "v0.1.0" -> "0.1.0")
    const tag = execSync("git describe --tags --exact-match 2>/dev/null", { encoding: "utf8" }).trim();
    return tag.replace(/^v/, "");
  } catch {
    // In dev: use short commit hash
    try {
      const hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
      return `dev-${hash}`;
    } catch {
      return "dev";
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
