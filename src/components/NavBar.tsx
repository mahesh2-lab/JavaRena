import React, { useState } from "react";
import {
  Settings,
  Play,
  Square,
  Zap,
  Loader2,
} from "lucide-react";
import { Theme } from "../App";

interface NavbarProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onRun: () => void;
  isRunning: boolean;
  isReady: boolean;
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
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <nav
      className="h-14 flex items-center justify-between px-5 shrink-0 relative z-50"
      style={{
        background: "var(--bg-navbar)",
        borderBottom: "1px solid var(--bg-navbar-border)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 min-w-[140px]">
        <Zap className="w-5 h-5" style={{ color: "var(--logo-accent-from)" }} />
        <span
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          <span style={{ color: "var(--logo-text)" }}>Java</span>
          <span className="text-gradient">Rena</span>
        </span>
      </div>

      {/* Center: Run + Stop Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Run Button */}
        <button
          id="run-button"
          onClick={onRun}
          disabled={!isReady || isRunning}
          style={{
            background:
              !isReady || isRunning
                ? "var(--btn-disabled-bg)"
                : "var(--btn-run-bg)",
            color:
              !isReady || isRunning
                ? "var(--btn-disabled-text)"
                : "var(--btn-run-text)",
            cursor: !isReady || isRunning ? "not-allowed" : "pointer",
          }}
          className="flex items-center gap-2 px-5 py-[7px] rounded-md text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
          onMouseEnter={(e) => {
            if (isReady && !isRunning) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--btn-run-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (isReady && !isRunning) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--btn-run-bg)";
            }
          }}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin-slow" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isRunning ? "Running..." : "Run"}</span>
        </button>

        {/* Stop Button */}
        <button
          id="stop-button"
          disabled={!isRunning}
          style={{
            background: isRunning
              ? "var(--btn-stop-bg)"
              : "var(--btn-disabled-bg)",
            color: isRunning
              ? "var(--btn-stop-text)"
              : "var(--btn-disabled-text)",
            cursor: isRunning ? "pointer" : "not-allowed",
          }}
          className="flex items-center gap-2 px-4 py-[7px] rounded-md text-sm font-medium transition-all duration-200 active:scale-[0.97]"
          onMouseEnter={(e) => {
            if (isRunning) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--btn-stop-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (isRunning) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--btn-stop-bg)";
            }
          }}
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>
      </div>

      {/* Right: Status + Settings */}
      <div className="flex items-center gap-4 min-w-[140px] justify-end">
        {/* Status Indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
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
            className="text-[11px] font-medium tracking-wide uppercase"
            style={{
              color: isReady
                ? "var(--status-text)"
                : "var(--text-muted)",
            }}
          >
            {isReady ? "Ready" : "Loading..."}
          </span>
        </div>

        {/* Settings / Theme Picker */}
        <div className="relative">
          <button
            id="settings-button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--bg-surface-hover)";
              el.style.color = "var(--text-secondary)";
              el.style.borderColor = "var(--border-subtle)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "var(--bg-surface)";
              el.style.color = "var(--text-muted)";
              el.style.borderColor = "transparent";
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
