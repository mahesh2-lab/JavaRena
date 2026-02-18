import React, { useState, useCallback, useEffect } from "react";
import { Navbar } from "./components/NavBar";
import { Editor } from "./components/Editor";
import { Console, LogEntry, ErrorReview } from "./components/Console";
import { useIsMobile } from "./hooks/use-mobile";
import { Toaster } from "./components/ui/toaster";
import { SEOHead } from "./components/SEOHead";

const DEFAULT_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("⚡ Welcome to JavaRena! ☕");
    }
}`;

export type Theme = "dark" | "light";

// Declare global shared session interface
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

export default function App() {
  // Check for shared session on mount
  const sharedSession =
    typeof window !== "undefined" ? window.__SHARED_SESSION__ : null;

  const [code, setCode] = useState<string>(() => {
    // First priority: shared session
    if (sharedSession?.code) {
      return sharedSession.code;
    }
    // Second priority: localStorage
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
  const [stdinInput, setStdinInput] = useState<string>("");
  const [isForkedSession, setIsForkedSession] = useState<boolean>(false);
  const [errorReview, setErrorReview] = useState<ErrorReview | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const isReady = true; // Placeholder since CheerpJ is removed

  // Handle shared session on mount
  useEffect(() => {
    if (sharedSession?.isFork) {
      setIsForkedSession(true);
      // Parse output back into LogEntry format if it exists
      if (sharedSession.output) {
        const outputLines = sharedSession.output.split("\n");
        const logEntries = outputLines.map((line) => ({
          text: line,
          type: "info" as const,
          timestamp: Date.now(),
        }));
        setOutput(logEntries);
      }
      // Show a notification that this is a forked session
      setTimeout(() => {
        log(
          "👋 You're viewing a shared code snippet. Click Run to execute or edit the code!",
          "info",
        );
      }, 500);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle divider dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const mainElement = document.querySelector("main");
      if (!mainElement) return;

      const rect = mainElement.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;

      // Clamp between 20% and 80%
      const clampedPercentage = Math.max(20, Math.min(80, percentage));
      setEditorWidth(clampedPercentage);
      localStorage.setItem("editor_width", clampedPercentage.toString());
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const log = useCallback(
    (text: string, type: "info" | "success" | "error" = "info") => {
      setOutput((prev) => [...prev, { text, type, timestamp: Date.now() }]);
    },
    [],
  );

  // Check if compiler server is available
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`/api/health`);
        if (response.ok) {
          const data = await response.json();
          setServerReady(data.java_available);
        }
      } catch (err) {
        console.warn("Java compiler server not available");
        setServerReady(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRun = useCallback(async () => {
    if (isRunning) return; // Removed isReady check

    // Auto-switch to console on mobile when running code
    if (isMobile) {
      setMobileActiveTab("console");
    }

    setIsRunning(true);
    setExecTime(null);
    setOutput([]);
    setErrorReview(null);
    setAiReview(null);
    const start = performance.now();

    const originalLog = console.log;
    const originalErr = console.error;

    console.log = (...args: unknown[]) => {
      const msg = args.join(" ");
      log(msg, "success"); // Removed CheerpJ check
    };

    console.error = (...args: unknown[]) => {
      const msg = args.join(" ");
      log(msg, "error"); // Removed CheerpJ check
    };

    try {
      if (!serverReady) {
        throw new Error(
          "Java Compiler Server not available. Make sure Python server is running.",
        );
      }

      const response = await fetch(`/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, stdin: stdinInput }),
      });

      const result = await response.json();

      if (!result.success) {
        log(`Error: ${result.error}`, "error");
      } else {
        // Capture runtime stderr review even on success
        if (result.error && result.error.trim() && result.error_review) {
          setErrorReview(result.error_review);
        }
        if (result.error && result.error.trim() && result.ai_review) {
          setAiReview(result.ai_review);
        }
        if (result.output) {
          const lines = result.output.trim().split("\n");
          lines.forEach((line: string) => {
            if (line.trim()) log(line, "success");
          });
        }

        if (result.error && result.error.trim()) {
          log(result.error, "error");
        }
      }

      // Capture error reviews (compilation failures)
      if (result.error_review) {
        setErrorReview(result.error_review);
      }
      if (result.ai_review) {
        setAiReview(result.ai_review);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Error: ${msg}`, "error");
    } finally {
      console.log = originalLog;
      console.error = originalErr;

      const end = performance.now();
      setExecTime(Math.round(end - start));
      setIsRunning(false);
    }
  }, [isReady, isRunning, code, log, serverReady, isMobile, stdinInput]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleRun]);

  const handleCodeChange = (val: string | undefined) => {
    if (val !== undefined) {
      setCode(val);
      localStorage.setItem("java_code", val);
    }
  };

  return (
    <div
      data-theme={theme}
      className="flex flex-col h-screen w-screen overflow-hidden"
      role="application"
      aria-label="JavaRena - Online Java Compiler"
      style={{
        background: "var(--bg-root)",
        color: "var(--text-primary)",
        fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Visually hidden H1 for SEO — ensures proper heading hierarchy */}
      <h1 className="sr-only">
        JavaRena — Online Java Compiler &amp; Code Playground
      </h1>

      {/* Dynamic SEO meta tags */}
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

      {/* Top Navigation Bar */}
      <Navbar
        theme={theme}
        onThemeChange={handleThemeChange}
        onRun={handleRun}
        isRunning={isRunning}
        isReady={isReady}
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content: Mobile Tab View or Desktop Split View */}
      <main
        className="flex flex-1 overflow-hidden responsive-main"
        role="main"
        aria-label="Java code editor and console output"
      >
        {isMobile ? (
          // ═══════════════════════════════════════════════════════
          // Mobile Layout: Tabbed Interface
          // ═══════════════════════════════════════════════════════
          <div className="flex flex-col w-full h-full">
            {/* Tab Navigation */}
            <nav
              className="flex gap-0 shrink-0 border-b"
              role="tablist"
              aria-label="Editor and output tabs"
              style={{
                background: "var(--bg-panel-header)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <button
                role="tab"
                aria-selected={mobileActiveTab === "editor"}
                aria-controls="editor-panel"
                id="editor-tab"
                onClick={() => setMobileActiveTab("editor")}
                className="flex-1 py-3 px-4 text-sm font-medium transition-colors"
                style={{
                  color:
                    mobileActiveTab === "editor"
                      ? "var(--logo-accent-from)"
                      : "var(--text-muted)",
                  borderBottom:
                    mobileActiveTab === "editor"
                      ? "2px solid var(--logo-accent-from)"
                      : "none",
                  background: "transparent",
                }}
              >
                Editor
              </button>
              <button
                role="tab"
                aria-selected={mobileActiveTab === "console"}
                aria-controls="console-panel"
                id="console-tab"
                onClick={() => setMobileActiveTab("console")}
                className="flex-1 py-3 px-4 text-sm font-medium transition-colors"
                style={{
                  color:
                    mobileActiveTab === "console"
                      ? "var(--logo-accent-from)"
                      : "var(--text-muted)",
                  borderBottom:
                    mobileActiveTab === "console"
                      ? "2px solid var(--logo-accent-from)"
                      : "none",
                  background: "transparent",
                }}
              >
                Output
              </button>
            </nav>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {mobileActiveTab === "editor" ? (
                <section
                  id="editor-panel"
                  role="tabpanel"
                  aria-labelledby="editor-tab"
                  className="h-full w-full"
                >
                  <Editor
                    code={code}
                    onChange={handleCodeChange}
                    theme={theme}
                    output={output.map((o) => o.text).join("\n")}
                  />
                </section>
              ) : (
                <section
                  id="console-panel"
                  role="tabpanel"
                  aria-labelledby="console-tab"
                  className="h-full w-full"
                >
                  <Console
                    output={output}
                    executionTime={execTime}
                    onClear={() => {
                      setOutput([]);
                      setErrorReview(null);
                      setAiReview(null);
                    }}
                    theme={theme}
                    stdinInput={stdinInput}
                    onStdinChange={setStdinInput}
                    errorReview={errorReview}
                    aiReview={aiReview}
                  />
                </section>
              )}
            </div>
          </div>
        ) : (
          // ═══════════════════════════════════════════════════════
          // Desktop Layout: Side-by-Side with Draggable Divider
          // ═══════════════════════════════════════════════════════
          <>
            {/* Left: Code Editor Panel */}
            <section
              aria-label="Java code editor"
              className="flex flex-col min-h-0 responsive-editor"
              style={{
                width: showConsole ? `${editorWidth}%` : "100%",
                flexShrink: 0,
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
                {/* Resizable Divider */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize editor and console panels"
                  tabIndex={0}
                  className="theme-divider shrink-0 responsive-divider group"
                  style={{
                    width: "5px",
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
                    style={{
                      width: "1px",
                      background: "var(--divider-color)",
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      background: "var(--divider-color)",
                    }}
                  />
                </div>

                {/* Right: Console Output Panel */}
                <section
                  aria-label="Console output"
                  className="flex flex-col min-h-0 responsive-console"
                  style={{
                    width: `${100 - editorWidth}%`,
                    flexShrink: 0,
                  }}
                >
                  <Console
                    output={output}
                    executionTime={execTime}
                    onClear={() => {
                      setOutput([]);
                      setErrorReview(null);
                      setAiReview(null);
                    }}
                    theme={theme}
                    stdinInput={stdinInput}
                    onStdinChange={setStdinInput}
                    errorReview={errorReview}
                    aiReview={aiReview}
                  />
                </section>
              </>
            )}
          </>
        )}
      </main>

      {/* Visually hidden footer for SEO — crawlable semantic content */}
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
