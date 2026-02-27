import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import { Navbar } from "./components/NavBar";
const Editor = React.lazy(() =>
  import("./components/Editor").then((m) => ({ default: m.Editor })),
);
import type { XTermTerminalRef } from "./components/XTermTerminal";
import { useIsMobile } from "./hooks/use-mobile";
import { Toaster } from "./components/ui/toaster";
import { SEOHead } from "./components/SEOHead";
import {
  Eye,
  Terminal as TerminalIcon,
  GitGraph,
  Maximize2,
  Loader2,
  Github,
} from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { useHealthCheck, useCompile, useVisualize } from "./hooks/use-java-api";
const TerminalPanel = React.lazy(() =>
  import("./components/TerminalPanel").then((m) => ({
    default: m.TerminalPanel,
  })),
);
import type { TerminalPanelProps } from "./components/TerminalPanel";
import { StatusBadge } from "./components/StatusBadge";

const DEFAULT_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("⚡ Welcome to JavaRena! ☕");
    }
}`;

import { Theme, LogEntry, ErrorReview, TerminalStatus } from "./types";

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

// Sub-components moved to separate files for optimization.

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
    () => (localStorage.getItem("app_theme") as Theme) || "dark",
  );
  const [showConsole, setShowConsole] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [editorWidth, setEditorWidth] = useState<number>(
    () => Number(localStorage.getItem("editor_width")) || 55,
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"editor" | "console">(
    "editor",
  );

  const xtermRef = useRef<XTermTerminalRef>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isReady = true;

  const [hasMountedConsole, setHasMountedConsole] = useState<boolean>(
    !isMobile && showConsole,
  );
  const [stdinInput, setStdinInput] = useState<string>("");
  const [isForkedSession, setIsForkedSession] = useState<boolean>(false);
  const [errorReview, setErrorReview] = useState<ErrorReview | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);

  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("idle");
  const [interactiveMode, setInteractiveMode] = useState<boolean>(true);

  // Visualization state
  const [activeTab, setActiveTab] = useState<string>("console");
  const [visualizeSteps, setVisualizeSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [showGraphTab, setShowGraphTab] = useState<boolean>(true);

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
          })),
        );
      }
      setTimeout(() => {
        log(
          "👋 You're viewing a shared code snippet. Click Run to execute or edit the code!",
          "info",
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

  useEffect(() => {
    if (showConsole || mobileActiveTab === "console") {
      setHasMountedConsole(true);
    }
  }, [showConsole, mobileActiveTab]);

  // ── Divider drag ──────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const mainEl = document.querySelector("main");
      if (!mainEl) return;
      const rect = mainEl.getBoundingClientRect();
      const pct = Math.max(
        20,
        Math.min(80, ((e.clientX - rect.left) / rect.width) * 100),
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
    [],
  );

  // ── API Hooks ──────────────────────────────────────────
  const { data: healthData } = useHealthCheck();
  const compileMutation = useCompile();
  const visualizeMutation = useVisualize();

  useEffect(() => {
    if (healthData) {
      setServerReady(healthData.java_available);
    }
  }, [healthData]);

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
          "Java Compiler Server not available. Make sure Python server is running.",
        );
      }

      const result = await compileMutation.mutateAsync({
        code,
        stdin: stdinInput,
      });

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
        "error",
      );
    } finally {
      setExecTime(Math.round(performance.now() - start));
      setIsRunning(false);
    }
  }, [
    isRunning,
    code,
    log,
    serverReady,
    isMobile,
    stdinInput,
    interactiveMode,
    compileMutation,
  ]);

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

  const handleStatusChange = useCallback((s: TerminalStatus) => {
    setTerminalStatus(s);
    setIsRunning(s === "running" || s === "compiling");
  }, []);

  // ── Visualize ─────────────────────────────────────────────
  const handleVisualize = useCallback(async () => {
    if (isVisualizing) return;

    setIsVisualizing(true);
    setActiveTab("graph");
    setCurrentStep(0);
    setVisualizeSteps([]);

    try {
      const data = await visualizeMutation.mutateAsync({ code });
      if (data.success) {
        setVisualizeSteps(data.steps);
      } else {
        throw new Error(data.error || "Unknown simulation error");
      }
    } catch (err) {
      toast({
        title: "Visualization Error",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      setActiveTab("console");
    } finally {
      setIsVisualizing(false);
    }
  }, [code, isVisualizing, toast, visualizeMutation]);

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
    // Visualization
    activeTab,
    onTabChange: setActiveTab,
    visualizeSteps,
    currentStep,
    onStepChange: setCurrentStep,
    isVisualizing,
    onVisualize: handleVisualize,
    showGraphTab,
    onToggleGraphTab: () => {
      if (showGraphTab && activeTab === "graph") {
        setActiveTab("console");
      }
      setShowGraphTab(!showGraphTab);
    },
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
        noIndex={isForkedSession}
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
              className="flex shrink-0"
              role="tablist"
              aria-label="Editor and output tabs"
              style={{
                background: "var(--bg-panel-header)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              {(["editor", "console"] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mobileActiveTab === tab}
                  onClick={() => setMobileActiveTab(tab)}
                  className="flex-1 py-2 text-[13px] font-bold tracking-wider transition-all duration-200 relative"
                  style={{
                    color:
                      mobileActiveTab === tab
                        ? "var(--logo-accent-from)"
                        : "var(--text-muted)",
                    background: "transparent",
                    textTransform: "uppercase",
                  }}
                >
                  {tab === "console" ? "Terminal" : "Editor"}
                  {mobileActiveTab === tab && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"
                      style={{ background: "var(--logo-accent-from)" }}
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-hidden relative">
              <section
                className="h-full w-full"
                style={{
                  display: mobileActiveTab === "editor" ? "block" : "none",
                }}
              >
                <Suspense
                  fallback={
                    <div className="flex w-full h-full items-center justify-center text-slate-500">
                      <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading
                      editor...
                    </div>
                  }
                >
                  <Editor
                    code={code}
                    onChange={handleCodeChange}
                    theme={theme}
                    output={output.map((o) => o.text).join("\n")}
                  />
                </Suspense>
              </section>
              <section
                className="h-full w-full"
                style={{
                  display: mobileActiveTab === "console" ? "block" : "none",
                }}
              >
                {hasMountedConsole ? (
                  <Suspense
                    fallback={
                      <div className="flex w-full h-full items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin w-6 h-6 mr-2" />{" "}
                        Loading terminal...
                      </div>
                    }
                  >
                    <TerminalPanel {...terminalPanelProps} />
                  </Suspense>
                ) : null}
              </section>
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
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading
                    editor...
                  </div>
                }
              >
                <Editor
                  code={code}
                  onChange={handleCodeChange}
                  theme={theme}
                  output={output.map((o) => o.text).join("\n")}
                />
              </Suspense>
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
                  {hasMountedConsole ? (
                    <Suspense
                      fallback={
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                          <Loader2 className="animate-spin w-6 h-6 mr-2" />{" "}
                          Loading terminal...
                        </div>
                      }
                    >
                      <TerminalPanel {...terminalPanelProps} />
                    </Suspense>
                  ) : null}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <footer
        className="prose mx-auto mt-12 mb-8"
        aria-label="Site information"
      >
        <section>
          <h2>About JavaRena</h2>
          <p>
            <strong>JavaRena</strong> is a modern, free online Java compiler,
            code playground, and learning platform. Instantly write, run, and
            share Java code with syntax highlighting, real-time output, and
            interactive terminal. JavaRena is designed for students,
            professionals, and educators to practice Java, build projects, and
            explore the Java ecosystem.
          </p>
          <ul>
            <li>Java online compiler, interpreter, and code runner</li>
            <li>Java tutorials, guides, and beginner resources</li>
            <li>Spring Boot, microservices, and REST API examples</li>
            <li>Java collections, JVM, and advanced topics</li>
            <li>Share code snippets and collaborate in real time</li>
            <li>
              Syntax highlighting, Monaco Editor, and interactive terminal
            </li>
            <li>Built with React, Flask, and modern web technologies</li>
            <li>
              SEO keywords: java online compiler, java playground, java
              tutorial, spring boot, microservices, java beginner, java
              interview, java code sharing, java learning, java development,
              java ecosystem, java collections, JVM, REST API, code editor,
              collaborative coding
            </li>
          </ul>
          <nav aria-label="Footer links">
            <a
              href="https://github.com/mahesh2-lab/JavaRena"
              rel="noopener"
              target="_blank"
            >
              GitHub Repository
            </a>
            <span> | </span>
            <a href="/blog/docker-for-java-beginners">Java Blog</a>
            <span> | </span>
            <a href="/sitemap.xml">Sitemap</a>
          </nav>
          <p>
            &copy; {new Date().getFullYear()} JavaRena by Mahesh Chopade. All
            rights reserved.
          </p>
        </section>
      </footer>

      <Toaster />
    </div>
  );
}
