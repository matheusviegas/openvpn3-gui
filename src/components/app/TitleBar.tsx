import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
    const appWindow = getCurrentWindow();

    return (
        <div data-tauri-drag-region className="flex items-center justify-between h-9 bg-card border-b select-none">
            <span data-tauri-drag-region className="pl-3 text-sm font-semibold">OpenVPN3 GUI</span>
            <div className="flex h-full">
                <button onClick={() => appWindow.minimize()} className="inline-flex items-center justify-center w-10 h-full hover:bg-muted">
                    <Minus className="h-4 w-4" />
                </button>
                <button onClick={() => appWindow.toggleMaximize()} className="inline-flex items-center justify-center w-10 h-full hover:bg-muted">
                    <Square className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => appWindow.close()} className="inline-flex items-center justify-center w-10 h-full hover:bg-destructive hover:text-destructive-foreground">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}