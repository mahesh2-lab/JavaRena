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
    <nav
      className="h-14 flex items-center justify-between px-5 shrink-0 relative z-50 responsive-navbar"
      style={{
        background: "var(--bg-navbar)",
        borderBottom: "1px solid var(--bg-navbar-border)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Zap className="w-5 h-5" style={{ color: "var(--logo-accent-from)" }} />
        <span
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          <span style={{ color: "var(--logo-text)" }}>Java</span>
          <span className="text-gradient">Rena</span>
        </span>
      </div>

      {/* Center: Run Button */}
      <div className="flex items-center gap-2">
        {/* Run Button */}
        <button
          id="run-button"
          onClick={onRun}
          disabled={!isReady || isRunning}
          title={isRunning ? "Running..." : "Run Code"}
          className={`flex items-center justify-center font-semibold transition-all duration-150 shadow-sm ${isMobile
              ? "rounded-full"
              : "gap-2.5 rounded-md text-sm px-5 py-2"
            }`}
          style={{
            ...(isMobile
              ? { width: "34px", height: "34px", padding: 0 }
              : {}),
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
            <Loader2 className={isMobile ? "w-3.5 h-3.5 animate-spin-slow" : "w-4 h-4 animate-spin-slow"} />
          ) : (
            <Play className={isMobile ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current"} />
          )}
          {!isMobile && <span>{isRunning ? "Running" : "Run"}</span>}
        </button>
      </div>

      {/* Right: Status + Settings */}
      <div className="flex items-center gap-2 sm:gap-4 justify-end">
        {/* Status Indicator - Desktop only */}
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

        {/* Console Toggle Button - Desktop only */}
        {!isMobile && (
          <button
            onClick={onToggleConsole}
            title={showConsole ? "Hide console" : "Show console"}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              background: "transparent",
              color: showConsole ? "var(--text-secondary)" : "var(--text-muted)",
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
      </div>
    </nav>
  );
};
