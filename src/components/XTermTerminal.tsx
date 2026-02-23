/**
 * XTermTerminal.tsx
 *
 * A real interactive terminal powered by xterm.js + Socket.IO.
 * Supports live stdin/stdout streaming for interactive Java programs.
 */

import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    useCallback,
} from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { io, Socket } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";
import { Theme } from "../App";

// ──────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────

export type TerminalStatus =
    | "idle"
    | "connecting"
    | "compiling"
    | "running"
    | "exited"
    | "error";

export interface XTermTerminalRef {
    /** Run Java source code in the interactive terminal */
    run: (code: string) => void;
    /** Kill the currently running process */
    kill: () => void;
    /** Clear the terminal screen */
    clear: () => void;
}

interface XTermTerminalProps {
    theme: Theme;
    onStatusChange?: (status: TerminalStatus) => void;
    onSidReady?: (sid: string) => void;
}

// ──────────────────────────────────────────────────────────
//  Theme palettes
// ──────────────────────────────────────────────────────────

const DARK_THEME = {
    background: "#0d1117",
    foreground: "#e6edf3",
    cursor: "#58a6ff",
    cursorAccent: "#0d1117",
    selectionBackground: "rgba(88,166,255,0.25)",
    black: "#484f58",
    red: "#ff7b72",
    green: "#3fb950",
    yellow: "#d29922",
    blue: "#58a6ff",
    magenta: "#bc8cff",
    cyan: "#39c5cf",
    white: "#b1bac4",
    brightBlack: "#6e7681",
    brightRed: "#ffa198",
    brightGreen: "#56d364",
    brightYellow: "#e3b341",
    brightBlue: "#79c0ff",
    brightMagenta: "#d2a8ff",
    brightCyan: "#56d4dd",
    brightWhite: "#f0f6fc",
};

const LIGHT_THEME = {
    background: "#f6f8fa",
    foreground: "#1f2328",
    cursor: "#0969da",
    cursorAccent: "#f6f8fa",
    selectionBackground: "rgba(9,105,218,0.2)",
    black: "#24292f",
    red: "#cf222e",
    green: "#116329",
    yellow: "#7d4e00",
    blue: "#0969da",
    magenta: "#8250df",
    cyan: "#1b7c83",
    white: "#6e7781",
    brightBlack: "#57606a",
    brightRed: "#a40e26",
    brightGreen: "#1a7f37",
    brightYellow: "#633c01",
    brightBlue: "#218bff",
    brightMagenta: "#a475f9",
    brightCyan: "#3192aa",
    brightWhite: "#8c959f",
};

// ──────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────

export const XTermTerminal = forwardRef<XTermTerminalRef, XTermTerminalProps>(
    ({ theme, onStatusChange, onSidReady }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const termRef = useRef<Terminal | null>(null);
        const fitAddonRef = useRef<FitAddon | null>(null);
        const socketRef = useRef<Socket | null>(null);
        const statusRef = useRef<TerminalStatus>("idle");
        const sidRef = useRef<string>("");

        const setStatus = useCallback(
            (s: TerminalStatus) => {
                statusRef.current = s;
                onStatusChange?.(s);
            },
            [onStatusChange]
        );

        // ── Initialize xterm + addons ──────────────────────────
        useEffect(() => {
            if (!containerRef.current) return;

            const term = new Terminal({
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: 13,
                lineHeight: 1.6,
                letterSpacing: 0.5,
                cursorBlink: true,
                cursorStyle: "block",
                scrollback: 5000,
                theme: theme === "dark" ? DARK_THEME : LIGHT_THEME,
                allowProposedApi: true,
                convertEol: false, // We handle \r\n on the server side
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();

            term.loadAddon(fitAddon);
            term.loadAddon(webLinksAddon);
            term.open(containerRef.current);
            fitAddon.fit();

            termRef.current = term;
            fitAddonRef.current = fitAddon;


            // Resize observer
            const resizeObserver = new ResizeObserver(() => {
                try {
                    fitAddon.fit();
                } catch (_) {
                    // ignore resize errors during teardown
                }
            });
            resizeObserver.observe(containerRef.current);

            return () => {
                resizeObserver.disconnect();
                term.dispose();
                termRef.current = null;
                fitAddonRef.current = null;
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        // ── Re-apply theme when it changes ────────────────────
        useEffect(() => {
            termRef.current?.options.theme !== undefined &&
                (termRef.current.options.theme =
                    theme === "dark" ? DARK_THEME : LIGHT_THEME);
        }, [theme]);

        // ── Initialize Socket.IO connection ───────────────────
        useEffect(() => {
            const socket = io(window.location.origin, {
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("[Socket] Connected:", socket.id);
            });

            socket.on("connected", (data: { sid: string }) => {
                sidRef.current = data.sid;
                onSidReady?.(data.sid);
                console.log("[Socket] SID received:", data.sid);
            });

            socket.on("terminal:output", (data: { data: string }) => {
                termRef.current?.write(data.data);
            });

            socket.on(
                "terminal:exit",
                (data: { code: number; reason: string }) => {
                    const term = termRef.current;
                    if (!term) return;

                    if (data.reason === "killed") {
                        term.writeln("\r\n\x1b[33m⚡ Process terminated\x1b[0m");
                    } else if (data.code === 0) {
                        term.writeln(
                            "\r\n\x1b[2m─────────────────────────────────────\x1b[0m"
                        );
                        term.writeln(
                            "\x1b[32m✓ Program exited successfully (code 0)\x1b[0m"
                        );
                    } else if (data.reason !== "compilation_error") {
                        term.writeln(
                            "\r\n\x1b[2m─────────────────────────────────────\x1b[0m"
                        );
                        term.writeln(
                            `\x1b[31m✗ Program exited with code ${data.code}\x1b[0m`
                        );
                    }

                    setStatus("exited");
                }
            );

            socket.on("terminal:error", (data: { message: string }) => {
                termRef.current?.writeln(
                    `\r\n\x1b[31m[ERROR] ${data.message}\x1b[0m`
                );
                setStatus("error");
            });

            socket.on("disconnect", () => {
                console.log("[Socket] Disconnected");
            });

            socket.on("connect_error", (err) => {
                termRef.current?.writeln(
                    `\r\n\x1b[31m[CONNECTION ERROR] ${err.message}\x1b[0m`
                );
                setStatus("error");
            });

            return () => {
                socket.disconnect();
                socketRef.current = null;
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        // ── Forward keyboard input → stdin ────────────────────
        useEffect(() => {
            const term = termRef.current;
            if (!term) return;

            const disposable = term.onData((data) => {
                // ⌨️ Handle User Input
                if (statusRef.current !== "running" || !socketRef.current?.connected) {
                    return;
                }

                // Local Echo: Since we don't have a real PTY, we echo characters back
                // manually so the user can see what they are typing.
                if (data === "\r") {
                    // Enter key
                    term.write("\r\n");
                    socketRef.current.emit("terminal:input", { data: "\n" });
                } else if (data === "\u007f") {
                    // Backspace (simple implementation)
                    // Note: Full backspace support would require tracking line state
                    term.write("\b \b");
                    socketRef.current.emit("terminal:input", { data: "\b" });
                } else {
                    // Normal characters
                    term.write(data);
                    socketRef.current.emit("terminal:input", { data });
                }
            });

            return () => disposable.dispose();
        }, []);

        // ── Expose imperative API via ref ─────────────────────
        useImperativeHandle(
            ref,
            () => ({
                run(code: string) {
                    const term = termRef.current;
                    const socket = socketRef.current;

                    if (!term || !socket) return;

                    setStatus("compiling");

                    socket.emit("terminal:run", { code });

                    setStatus("running");
                },

                kill() {
                    socketRef.current?.emit("terminal:kill");
                    setStatus("idle");
                },

                clear() {
                    termRef.current?.clear();
                    termRef.current?.writeln(
                        "\x1b[36m╔══════════════════════════════════════╗\x1b[0m"
                    );
                    termRef.current?.writeln(
                        "\x1b[36m║  \x1b[1;32mJavaRena Interactive Terminal\x1b[0m\x1b[36m       ║\x1b[0m"
                    );
                    termRef.current?.writeln(
                        "\x1b[36m╚══════════════════════════════════════╝\x1b[0m"
                    );
                    termRef.current?.writeln("");
                    setStatus("idle");
                },
            }),
            [setStatus]
        );

        return (
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    background: theme === "dark" ? DARK_THEME.background : LIGHT_THEME.background,
                    padding: "8px",
                    boxSizing: "border-box",
                    borderRadius: "0",
                    overflow: "hidden",
                }}
                aria-label="Interactive Java terminal"
                role="application"
            />
        );
    }
);

XTermTerminal.displayName = "XTermTerminal";
