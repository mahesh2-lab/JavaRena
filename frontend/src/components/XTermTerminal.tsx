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
import { Theme, TerminalStatus } from "../types";
import { getBaseUrl } from "../lib/api-client";

// ──────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────

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
  background: "transparent",
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
  background: "transparent",
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
      [onStatusChange],
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
        // Using hex-alpha for actual transparency support
        theme: {
          ...(theme === "dark" ? DARK_THEME : LIGHT_THEME),
          background: theme === "dark" ? "#0d111700" : "#ffffff00",
        },
        allowProposedApi: true,
        allowTransparency: true,
        convertEol: false,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch (_) {}
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
      if (termRef.current) {
        termRef.current.options.theme = {
          ...(theme === "dark" ? DARK_THEME : LIGHT_THEME),
          background: theme === "dark" ? "#0d111700" : "#ffffff00",
        };
      }
    }, [theme]);

    // ── Initialize Socket.IO connection ───────────────────
    useEffect(() => {
      const baseUrl = getBaseUrl();
      // If baseUrl is empty string (production), connect to the current origin
      // Otherwise connect to the specified backend URL
      const socket = io(baseUrl || window.location.origin, {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connected", (data: { sid: string }) => {
        sidRef.current = data.sid;
        onSidReady?.(data.sid);
      });

      socket.on("terminal:output", (data: { data: string }) => {
        termRef.current?.write(data.data);
      });

      socket.on("terminal:exit", (data: { code: number; reason: string }) => {
        const term = termRef.current;
        if (!term) return;

        if (data.reason === "killed") {
          term.writeln("\r\n\x1b[33m⚡ Process terminated\x1b[0m");
        } else if (data.code === 0) {
          term.writeln(
            "\r\n\x1b[2m─────────────────────────────────────\x1b[0m",
          );
          term.writeln("\x1b[32m✓ Program exited successfully (code 0)\x1b[0m");
        } else if (data.reason !== "compilation_error") {
          term.writeln(
            "\r\n\x1b[2m─────────────────────────────────────\x1b[0m",
          );
          term.writeln(
            `\x1b[31m✗ Program exited with code ${data.code}\x1b[0m`,
          );
        }
        setStatus("exited");
      });

      socket.on("terminal:error", (data: { message: string }) => {
        termRef.current?.writeln(`\r\n\x1b[31m[ERROR] ${data.message}\x1b[0m`);
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
        if (statusRef.current !== "running" || !socketRef.current?.connected)
          return;

        if (data === "\r") {
          term.write("\r\n");
          socketRef.current.emit("terminal:input", { data: "\n" });
        } else if (data === "\u007f") {
          term.write("\b \b");
          socketRef.current.emit("terminal:input", { data: "\b" });
        } else {
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
          term.reset();
          term.clear();
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
            "\x1b[36m╔══════════════════════════════════════╗\x1b[0m",
          );
          termRef.current?.writeln(
            "\x1b[36m║  \x1b[1;32mJyvra Interactive Terminal\x1b[0m\x1b[36m       ║\x1b[0m",
          );
          termRef.current?.writeln(
            "\x1b[36m╚══════════════════════════════════════╝\x1b[0m",
          );
          termRef.current?.writeln("");
          setStatus("idle");
        },
      }),
      [setStatus],
    );

    return (
      <div
        className="terminal-wrapper"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: theme === "dark" ? "#0d1117" : "#ffffff",
        }}
      >
        {/* XTerm Container Layer */}
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            padding: "12px",
            boxSizing: "border-box",
            backgroundColor:
              theme === "dark"
                ? "rgba(13, 17, 23, 0.4)"
                : "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(4px)",
            // Precise dot grid matching Memory Graph
            backgroundImage: `radial-gradient(${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.15)"} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
          aria-label="Interactive Java terminal"
          role="application"
        />

        {/* Glass CSS Injection for xterm internals */}
        <style>{`
                    .terminal-wrapper .xterm-viewport,
                    .terminal-wrapper .xterm-screen,
                    .terminal-wrapper .xterm-rows {
                        background-color: transparent !important;
                    }
                `}</style>
      </div>
    );
  },
);

XTermTerminal.displayName = "XTermTerminal";
