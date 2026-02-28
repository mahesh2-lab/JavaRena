import React, { useState } from "react";
import {
  Play,
  Zap,
  Loader2,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { Theme } from "../types";
import { useIsMobile } from "../hooks/use-mobile";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";

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

// Themes are now handled by AnimatedThemeToggler

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
  const isMobile = useIsMobile();

  return (
    <header
      className="h-12 flex items-center justify-between px-2 sm:px-5 shrink-0 relative z-50 responsive-navbar"
      role="banner"
      style={{
        background: "var(--bg-navbar)",
        borderBottom: "1px solid var(--bg-navbar-border)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <Zap
          className="w-5 h-5"
          aria-hidden="true"
          style={{ color: "var(--logo-accent-from)" }}
        />
        <a
          href="/"
          aria-label="Jyvra - Home"
          className="text-[14px] sm:text-[15px] font-bold tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", textDecoration: "none" }}
        >
          <span style={{ color: "var(--logo-text)" }}>Jy</span>
          <span className="text-gradient">vra</span>
        </a>
      </div>

      {/* Center: Run Button - Always centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          id="run-button"
          onClick={onRun}
          disabled={!isReady || isRunning}
          title={isRunning ? "Running..." : "Run Code"}
          className={`group flex items-center justify-center font-bold tracking-wide transition-all duration-200 active:scale-95 shadow-sm hdr-btn ${
            isMobile
              ? "gap-1 rounded-full text-[10px] px-3.5 py-1.5"
              : "gap-1.5 rounded-[6px] text-[11px] px-4 py-1.5 h-8"
          }`}
          style={{
            background:
              !isReady || isRunning
                ? "var(--btn-disabled-bg)"
                : "var(--logo-accent-from)",
            color:
              !isReady || isRunning ? "var(--btn-disabled-text)" : "#000000",
            border: "none",
            cursor: !isReady || isRunning ? "not-allowed" : "pointer",
          }}
        >
          {isRunning ? (
            <Loader2
              className={
                isMobile
                  ? "w-3 h-3 animate-spin-slow"
                  : "w-3.5 h-3.5 animate-spin-slow"
              }
            />
          ) : (
            <Play
              className={
                isMobile ? "w-3 h-3 fill-current" : "w-3.5 h-3.5 fill-current"
              }
            />
          )}
          <span>{isRunning ? "Running" : "Run"}</span>
        </button>
      </div>

      {/* Right: Tools */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Give a Star Button */}
        <a
          href="https://github.com/mahesh2-lab/jyvra"
          target="_blank"
          rel="noopener noreferrer"
          title="Star us on GitHub"
          className="flex items-center justify-center p-2 rounded-lg transition-all duration-200 hover:bg-white/5 active:scale-95 hdr-btn"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "none",
          }}
        >
          <Star className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          {!isMobile && (
            <span className="text-xs ml-1.5 font-medium">Star</span>
          )}
        </a>

        {/* Console Toggle Button - Desktop only */}
        {!isMobile && (
          <button
            onClick={onToggleConsole}
            title={showConsole ? "Hide console" : "Show console"}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 hdr-btn"
            style={{
              color: showConsole
                ? "var(--text-secondary)"
                : "var(--text-muted)",
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
          className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 active:scale-95 hdr-btn"
          style={{
            color: isFullscreen ? "var(--text-secondary)" : "var(--text-muted)",
          }}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          ) : (
            <Maximize className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          )}
        </button>

        {/* Theme Toggler */}
        <AnimatedThemeToggler
          onThemeChange={onThemeChange}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 active:scale-95 hdr-btn"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    </header>
  );
};
