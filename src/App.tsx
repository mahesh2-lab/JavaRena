import React, { useState, useCallback, useEffect, useRef } from "react";
import { Navbar } from "./components/NavBar";
import { Editor } from "./components/Editor";
import { Console, LogEntry, ErrorReview } from "./components/Console";
import {
  XTermTerminal,
  XTermTerminalRef,
  TerminalStatus,
} from "./components/XTermTerminal";
import { useIsMobile } from "./hooks/use-mobile";
import { Toaster } from "./components/ui/toaster";
import { SEOHead } from "./components/SEOHead";

const DEFAULT_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("⚡ Welcome to JavaRena! ☕");
    }
}`;

export type Theme = "dark" | "light";

declare global {
  interface Window {
    __SHARED_SESSION__?: {
      id: string;
      code: string;
      output: string;
      views: number;
      isFork: boolean;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TerminalPanel — proper component so hooks inside children don't remount
// ─────────────────────────────────────────────────────────────────────────────

interface TerminalPanelProps {
  theme: Theme;
  xtermRef: React.MutableRefObject<XTermTerminalRef | null>;
  interactiveMode: boolean;
  terminalStatus: TerminalStatus;
  output: LogEntry[];
  execTime: number | null;
  stdinInput: string;
  errorReview: ErrorReview | null;
  aiReview: string | null;
  onToggleMode: () => void;
  onStop: () => void;
  onClear: () => void;
  onClearStatic: () => void;
  onStdinChange: (v: string) => void;
  onStatusChange: (s: TerminalStatus) => void;
}

function TerminalPanel({
  theme,
  xtermRef,
  interactiveMode,
  terminalStatus,
  output,
  execTime,
  stdinInput,
  errorReview,
  aiReview,
  onToggleMode,
  onStop,
  onClear,
  onClearStatic,
  onStdinChange,
  onStatusChange,
}: TerminalPanelProps) {
  const isProcessActive =
    terminalStatus === "running" || terminalStatus === "compiling";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-console)",
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="terminal-panel-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 36,
          minHeight: 36,
          background: "var(--bg-panel-header)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-terminal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Terminal
          </span>
          {interactiveMode && <StatusBadge status={terminalStatus} />}
        </div>

        {/* Right — control buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Stop — only when process is active */}
          {interactiveMode && isProcessActive && (
            <button
              id="stop-process-button"
              className="hdr-btn"
              onClick={onStop}
              title="Kill running process"
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                height: 22,
                borderRadius: 4,
                background: "rgba(239,68,68,0.14)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.35)",
                cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              ■ Stop
            </button>
          )}

          {/* Clear */}
          <button
            id="clear-terminal-button"
            className="hdr-btn"
            onClick={interactiveMode ? onClear : onClearStatic}
            title="Clear terminal"
            style={{
              padding: "2px 6px",
              height: 22,
              borderRadius: 4,
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* XTerm — always mounted (keeps socket alive), hidden when in static mode */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            visibility: interactiveMode ? "visible" : "hidden",
            pointerEvents: interactiveMode ? "auto" : "none",
          }}
        >
          <XTermTerminal
            ref={xtermRef as React.RefObject<XTermTerminalRef>}
            theme={theme}
            onStatusChange={onStatusChange}
          />
        </div>

        {/* Static console — rendered on top when in static mode */}
        {!interactiveMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
            }}
          >
            <Console
              output={output}
              executionTime={execTime}
              onClear={onClearStatic}
              theme={theme}
              stdinInput={stdinInput}
              onStdinChange={onStdinChange}
              errorReview={errorReview}
              aiReview={aiReview}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TerminalStatus }) {
  const CONFIG: Record<
    TerminalStatus,
    { label: string; color: string; bg: string; border: string; dot?: string }
  > = {
    idle: {
      label: "Ready",
      color: "#6b7280",
      bg: "rgba(107,114,128,0.1)",
      border: "rgba(107,114,128,0.2)",
    },
    connecting: {
      label: "Connecting…",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
      dot: "#f59e0b",
    },
    compiling: {
      label: "Compiling…",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.1)",
      border: "rgba(96,165,250,0.3)",
      dot: "#60a5fa",
    },
    running: {
      label: "Running",
      color: "#34d399",
      bg: "rgba(52,211,153,0.1)",
      border: "rgba(52,211,153,0.3)",
      dot: "#34d399",
    },
    exited: {
      label: "Exited",
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.1)",
      border: "rgba(167,139,250,0.2)",
    },
    error: {
      label: "Error",
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.3)",
    },
  };

  const c = CONFIG[status];

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 9999,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        fontFamily: "'JetBrains Mono', monospace",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        lineHeight: 1.6,
      }}
    >
      {c.dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: c.dot,
            flexShrink: 0,
            animation:
              status === "running" || status === "compiling"
                ? "pulse 1.5s ease-in-out infinite"
                : "none",
          }}
        />
      )}
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const sharedSession =
    typeof window !== "undefined" ? window.__SHARED_SESSION__ : null;

  const [code, setCode] = useState<string>(() => {
    if (sharedSession?.code) return sharedSession.code;
    const saved = localStorage.getItem("java_code");
    return saved || DEFAULT_CODE;
  });

  const [output, setOutput] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [serverReady, setServerReady] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("app_theme") as Theme) || "dark"
  );
  const [showConsole, setShowConsole] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [editorWidth, setEditorWidth] = useState<number>(
    () => Number(localStorage.getItem("editor_width")) || 55
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"editor" | "console">(
    "editor"
  );
  const [stdinInput, setStdinInput] = useState<string>("");
  const [isForkedSession, setIsForkedSession] = useState<boolean>(false);
  const [errorReview, setErrorReview] = useState<ErrorReview | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);

  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("idle");
  const [interactiveMode, setInteractiveMode] = useState<boolean>(true);

  const xtermRef = useRef<XTermTerminalRef>(null);
  const isMobile = useIsMobile();
  const isReady = true;

  // ── Shared session bootstrap ──────────────────────────────
  useEffect(() => {
    if (sharedSession?.isFork) {
      setIsForkedSession(true);
      if (sharedSession.output) {
        setOutput(
          sharedSession.output.split("\n").map((line) => ({
            text: line,
            type: "info" as const,
            timestamp: Date.now(),
          }))
        );
      }
      setTimeout(() => {
        log(
          "👋 You're viewing a shared code snippet. Click Run to execute or edit the code!",
          "info"
        );
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme ─────────────────────────────────────────────────
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  // ── Fullscreen ────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Divider drag ──────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const mainEl = document.querySelector("main");
      if (!mainEl) return;
      const rect = mainEl.getBoundingClientRect();
      const pct = Math.max(
        20,
        Math.min(80, ((e.clientX - rect.left) / rect.width) * 100)
      );
      setEditorWidth(pct);
      localStorage.setItem("editor_width", pct.toString());
    };
    const onUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  // ── Log helper ────────────────────────────────────────────
  const log = useCallback(
    (text: string, type: "info" | "success" | "error" = "info") => {
      setOutput((prev) => [...prev, { text, type, timestamp: Date.now() }]);
    },
    []
  );

  // ── Server health ─────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setServerReady(data.java_available);
        }
      } catch {
        setServerReady(false);
      }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  // ── Run ───────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    if (isMobile) setMobileActiveTab("console");

    if (interactiveMode) {
      xtermRef.current?.run(code);
      return;
    }

    // Static REST mode
    setIsRunning(true);
    setExecTime(null);
    setOutput([]);
    setErrorReview(null);
    setAiReview(null);
    const start = performance.now();

    try {
      if (!serverReady) {
        throw new Error(
          "Java Compiler Server not available. Make sure Python server is running."
        );
      }
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, stdin: stdinInput }),
      });
      const result = await res.json();

      if (!result.success) {
        log(`Error: ${result.error}`, "error");
      } else {
        if (result.output) {
          result.output
            .trim()
            .split("\n")
            .forEach((line: string) => {
              if (line.trim()) log(line, "success");
            });
        }
        if (result.error?.trim()) log(result.error, "error");
      }
      if (result.error_review) setErrorReview(result.error_review);
      if (result.ai_review) setAiReview(result.ai_review);
    } catch (err) {
      log(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
    } finally {
      setExecTime(Math.round(performance.now() - start));
      setIsRunning(false);
    }
  }, [isRunning, code, log, serverReady, isMobile, stdinInput, interactiveMode]);

  const handleStop = useCallback(() => {
    xtermRef.current?.kill();
    setIsRunning(false);
  }, []);

  // ── Keyboard shortcut ─────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun]);

  const handleCodeChange = (val: string | undefined) => {
    if (val !== undefined) {
      setCode(val);
      localStorage.setItem("java_code", val);
    }
  };

  const effectivelyRunning =
    isRunning || terminalStatus === "running" || terminalStatus === "compiling";

  const clearStatic = useCallback(() => {
    setOutput([]);
    setErrorReview(null);
    setAiReview(null);
  }, []);

  const handleStatusChange = useCallback(
    (s: TerminalStatus) => {
      setTerminalStatus(s);
      setIsRunning(s === "running" || s === "compiling");
    },
    []
  );

  // ── Shared terminal panel props ───────────────────────────
  const terminalPanelProps: TerminalPanelProps = {
    theme,
    xtermRef,
    interactiveMode,
    terminalStatus,
    output,
    execTime,
    stdinInput,
    errorReview,
    aiReview,
    onToggleMode: () => setInteractiveMode((m) => !m),
    onStop: handleStop,
    onClear: () => xtermRef.current?.clear(),
    onClearStatic: clearStatic,
    onStdinChange: setStdinInput,
    onStatusChange: handleStatusChange,
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      data-theme={theme}
      className="flex flex-col"
      role="application"
      aria-label="JavaRena - Online Java Compiler"
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-root)",
        color: "var(--text-primary)",
        fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
      }}
    >
      <h1 className="sr-only">
        JavaRena — Online Java Compiler &amp; Code Playground
      </h1>

      <SEOHead
        title={
          isForkedSession
            ? "Shared Java Code — JavaRena Playground"
            : "JavaRena — Online Java Compiler & Code Playground"
        }
        description={
          isForkedSession
            ? "View and run this shared Java code snippet on JavaRena. Free online Java compiler with Monaco Editor."
            : "Write, compile, and run Java code instantly in your browser. Free online Java playground with Monaco Editor and real-time output."
        }
        canonicalUrl="https://javarena.hostmyidea.me/"
      />

      <Navbar
        theme={theme}
        onThemeChange={handleThemeChange}
        onRun={handleRun}
        isRunning={effectivelyRunning}
        isReady={isReady}
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <main
        className="flex overflow-hidden responsive-main"
        role="main"
        aria-label="Java code editor and console output"
        style={{ flex: "1 1 0", minHeight: 0 }}
      >
        {isMobile ? (
          // ═══ Mobile: Tabbed ═══
          <div className="flex flex-col w-full h-full">
            <nav
              className="flex gap-0 shrink-0 border-b"
              role="tablist"
              aria-label="Editor and output tabs"
              style={{
                background: "var(--bg-panel-header)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {(["editor", "console"] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mobileActiveTab === tab}
                  onClick={() => setMobileActiveTab(tab)}
                  className="flex-1 py-3 px-4 text-sm font-medium transition-colors"
                  style={{
                    color:
                      mobileActiveTab === tab
                        ? "var(--logo-accent-from)"
                        : "var(--text-muted)",
                    borderBottom:
                      mobileActiveTab === tab
                        ? "2px solid var(--logo-accent-from)"
                        : "none",
                    background: "transparent",
                    textTransform: "capitalize",
                  }}
                >
                  {tab === "console" ? "Terminal" : "Editor"}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-hidden">
              {mobileActiveTab === "editor" ? (
                <section className="h-full w-full">
                  <Editor
                    code={code}
                    onChange={handleCodeChange}
                    theme={theme}
                    output={output.map((o) => o.text).join("\n")}
                  />
                </section>
              ) : (
                <section className="h-full w-full">
                  <TerminalPanel {...terminalPanelProps} />
                </section>
              )}
            </div>
          </div>
        ) : (
          // ═══ Desktop: Split pane ═══
          <>
            <section
              aria-label="Java code editor"
              className="flex flex-col min-h-0 responsive-editor"
              style={{
                width: showConsole ? `${editorWidth}%` : "100%",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Editor
                code={code}
                onChange={handleCodeChange}
                theme={theme}
                output={output.map((o) => o.text).join("\n")}
              />
            </section>

            {showConsole && (
              <>
                {/* Resizable divider */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  tabIndex={0}
                  className="theme-divider shrink-0 responsive-divider group"
                  style={{
                    width: 5,
                    cursor: "col-resize",
                    position: "relative",
                    background: isDragging
                      ? "var(--divider-color)"
                      : "transparent",
                  }}
                  onMouseDown={() => setIsDragging(true)}
                >
                  <div
                    className="absolute inset-y-0 left-1/2 -translate-x-1/2"
                    style={{ width: 1, background: "var(--divider-color)" }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "var(--divider-color)" }}
                  />
                </div>

                {/* Terminal / Console panel */}
                <section
                  aria-label="Console output"
                  className="flex flex-col min-h-0 responsive-console"
                  style={{
                    width: `${100 - editorWidth}%`,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  <TerminalPanel {...terminalPanelProps} />
                </section>
              </>
            )}
          </>
        )}
      </main>

      <footer className="sr-only" aria-label="Site information">
        <p>
          JavaRena is a free online Java compiler and code playground. Built
          with React, Monaco Editor, and Flask.
        </p>
        <nav aria-label="Footer links">
          <a href="https://github.com/mahesh2-lab/JavaRena">
            GitHub Repository
          </a>
        </nav>
        <p>
          &copy; {new Date().getFullYear()} JavaRena by Mahesh Chopade. All
          rights reserved.
        </p>
      </footer>

      <Toaster />
    </div>
  );
}
