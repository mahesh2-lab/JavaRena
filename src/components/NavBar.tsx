import React, { useState } from "react";
import {
  Settings,
  Play,
  Zap,
  Loader2,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { Theme } from "../App";
import { useIsMobile } from "../hooks/use-mobile";

interface NavbarProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onRun: () => void;
  isRunning: boolean;
  isReady: boolean;
  showConsole: boolean;
  onToggleConsole: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const THEMES: { key: Theme; label: string; swatch: string }[] = [
  { key: "dark", label: "Eclipse Emerald", swatch: "#16171f" },
  { key: "light", label: "Aurora Light", swatch: "#f7f8fc" },
];

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onThemeChange,
  onRun,
  isRunning,
  isReady,
  showConsole,
  onToggleConsole,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const isMobile = useIsMobile();

  return (
    <header
      className="h-14 flex items-center justify-between px-5 shrink-0 relative z-50 responsive-navbar"
      role="banner"
      style={{
        background: "var(--bg-navbar)",
        borderBottom: "1px solid var(--bg-navbar-border)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Zap
          className="w-5 h-5"
          aria-hidden="true"
          style={{ color: "var(--logo-accent-from)" }}
        />
        <a
          href="/"
          aria-label="JavaRena - Home"
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", textDecoration: "none" }}
        >
          <span style={{ color: "var(--logo-text)" }}>Java</span>
          <span className="text-gradient">Rena</span>
        </a>
      </div>

      {/* Center: Run Button */}
      <nav
        className="flex items-center gap-2"
        aria-label="Code execution controls"
      >
        {/* Run Button */}
        <button
          id="run-button"
          onClick={onRun}
          disabled={!isReady || isRunning}
          title={isRunning ? "Running..." : "Run Code"}
          className={`flex items-center justify-center font-semibold transition-all duration-150 shadow-sm ${isMobile
              ? "gap-1.5 rounded-md text-xs px-3 py-1.5"
              : "gap-2.5 rounded-md text-sm px-5 py-2"
            }`}
          style={{
            ...(isMobile ? {} : {}),
            background:
              !isReady || isRunning
                ? "var(--btn-disabled-bg)"
                : "var(--logo-accent-from)",
            color:
              !isReady || isRunning ? "var(--btn-disabled-text)" : "#000000",
            border: "none",
            cursor: !isReady || isRunning ? "not-allowed" : "pointer",
            boxShadow:
              !isReady || isRunning ? "none" : "0 1px 2px rgba(0, 0, 0, 0.1)",
          }}
          onMouseEnter={(e) => {
            if (isReady && !isRunning) {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--status-text)";
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (isReady && !isRunning) {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--logo-accent-from)";
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
            }
          }}
        >
          {isRunning ? (
            <Loader2
              className={
                isMobile
                  ? "w-3.5 h-3.5 animate-spin-slow"
                  : "w-4 h-4 animate-spin-slow"
              }
            />
          ) : (
            <Play
              className={
                isMobile ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current"
              }
            />
          )}
          <span>{isRunning ? "Running" : "Run"}</span>
        </button>
      </nav>

      {/* Right: Status + Settings */}
      <nav
        className="flex items-center gap-2 sm:gap-4 justify-end"
        aria-label="Settings and tools"
      >
        {/* Status Indicator - Desktop only - Commented out as requested
        {!isMobile && (
          <div
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="relative">
              <div
                className={`w-2 h-2 rounded-full ${isReady ? "animate-status-pulse" : ""}`}
                style={{
                  background: isReady
                    ? "var(--status-dot)"
                    : "var(--btn-disabled-text)",
                }}
              />
            </div>
            <span
              className="text-[11px] font-medium tracking-wide uppercase hidden sm:inline"
              style={{
                color: isReady ? "var(--status-text)" : "var(--text-muted)",
              }}
            >
              {isReady ? "Ready" : "Loading..."}
            </span>
          </div>
        )}
        */}

        {/* Give a Star Button */}
        <a
          href="https://github.com/mahesh2-lab/JavaRena"
          target="_blank"
          rel="noopener noreferrer"
          title="Star us on GitHub"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "var(--bg-surface-hover)";
            el.style.color = "var(--logo-accent-from)";
            el.style.transform = "translateY(-1px)";
            el.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "var(--bg-surface)";
            el.style.color = "var(--text-secondary)";
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "none";
          }}
        >
          <Star className="w-4 h-4" />
          {!isMobile && <span>Star</span>}
        </a>

        {/* Console Toggle Button - Desktop only */}
        {!isMobile && (
          <button
            onClick={onToggleConsole}
            title={showConsole ? "Hide console" : "Show console"}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              background: "transparent",
              color: showConsole
                ? "var(--text-secondary)"
                : "var(--text-muted)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--bg-surface-hover)";
              el.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "transparent";
              el.style.color = showConsole
                ? "var(--text-secondary)"
                : "var(--text-muted)";
            }}
          >
            {showConsole ? (
              <Eye className="w-[18px] h-[18px]" />
            ) : (
              <EyeOff className="w-[18px] h-[18px]" />
            )}
          </button>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="p-2 rounded-lg transition-all duration-200"
          style={{
            background: "transparent",
            color: isFullscreen ? "var(--text-secondary)" : "var(--text-muted)",
            border: "1px solid transparent",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--bg-surface-hover)";
            el.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "transparent";
            el.style.color = isFullscreen
              ? "var(--text-secondary)"
              : "var(--text-muted)";
          }}
        >
          {isFullscreen ? (
            <Minimize className="w-[18px] h-[18px]" />
          ) : (
            <Maximize className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* Settings / Theme Picker */}
        <div className="relative">
          <button
            id="settings-button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--bg-surface-hover)";
              el.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "transparent";
              el.style.color = "var(--text-muted)";
            }}
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          {showSettings && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSettings(false)}
              />
              <div
                className="absolute right-0 top-12 w-56 rounded-xl overflow-hidden animate-fade-in z-50"
                style={{
                  background: "var(--bg-panel-header)",
                  boxShadow: "var(--shadow-dropdown)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Choose Theme
                  </p>
                </div>
                <div className="py-1 max-h-[320px] overflow-y-auto">
                  {THEMES.map(({ key, label, swatch }) => (
                    <button
                      key={key}
                      onClick={() => {
                        onThemeChange(key);
                        setShowSettings(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200"
                      style={{
                        background:
                          theme === key
                            ? "var(--bg-surface-active)"
                            : "transparent",
                        color:
                          theme === key
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                      }}
                      onMouseEnter={(e) => {
                        if (theme !== key) {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.background = "var(--bg-surface-hover)";
                          el.style.color = "var(--text-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (theme !== key) {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.background = "transparent";
                          el.style.color = "var(--text-muted)";
                        }
                      }}
                    >
                      {/* Color swatch */}
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{
                          background: swatch,
                          border:
                            key === "light"
                              ? "1.5px solid rgba(0,0,0,0.12)"
                              : "1.5px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <span className="font-medium">{label}</span>
                      {theme === key && (
                        <span
                          className="ml-auto text-xs font-bold"
                          style={{ color: "var(--btn-run-bg)" }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
