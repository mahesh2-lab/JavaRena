import React, { useRef, useState, useEffect } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import {
  FileCode2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  WrapText,
} from "lucide-react";
import { Theme } from "../App";

interface EditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  theme: Theme;
}

/* ─────────────────────────────────────────────────────
   Custom Monaco Theme Definitions
   ───────────────────────────────────────────────────── */

// 🌑 Eclipse Emerald Pro — Premium dark theme
const eclipseEmeraldPro = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    // Comments — muted gray italic
    { token: "comment", foreground: "565f89", fontStyle: "italic" },
    { token: "comment.block", foreground: "565f89", fontStyle: "italic" },
    { token: "comment.line", foreground: "565f89", fontStyle: "italic" },

    // Keywords — vibrant blue
    { token: "keyword", foreground: "7aa2f7", fontStyle: "bold" },
    { token: "keyword.control", foreground: "7aa2f7" },
    { token: "keyword.operator", foreground: "89ddff" },

    // Strings — warm orange
    { token: "string", foreground: "ff9e64" },
    { token: "string.escape", foreground: "c0caf5" },

    // Numbers — soft green
    { token: "number", foreground: "9ece6a" },
    { token: "number.float", foreground: "9ece6a" },
    { token: "number.hex", foreground: "9ece6a" },

    // Types — teal
    { token: "type", foreground: "2ac3de" },
    { token: "type.identifier", foreground: "2ac3de" },
    { token: "class", foreground: "2ac3de" },

    // Variables — light cyan
    { token: "variable", foreground: "c0caf5" },
    { token: "variable.predefined", foreground: "7dcfff" },

    // Functions — light blue
    { token: "entity.name.function", foreground: "7aa2f7" },
    { token: "support.function", foreground: "7aa2f7" },

    // Operators
    { token: "operator", foreground: "89ddff" },
    { token: "delimiter", foreground: "a9b1d6" },
    { token: "delimiter.bracket", foreground: "a9b1d6" },

    // Annotations
    { token: "annotation", foreground: "bb9af7" },
    { token: "tag", foreground: "f7768e" },

    // Constants
    { token: "constant", foreground: "ff9e64" },
    { token: "constant.language", foreground: "ff9e64", fontStyle: "italic" },
  ],
  colors: {
    // Editor background — deep charcoal
    "editor.background": "#16171f",
    "editor.foreground": "#c0caf5",

    // Active line — subtle emerald tint
    "editor.lineHighlightBackground": "#1a2e2a18",
    "editor.lineHighlightBorder": "#10b98112",

    // Selection — cool blue translucent
    "editor.selectionBackground": "#7aa2f733",
    "editor.selectionHighlightBackground": "#7aa2f71a",
    "editor.inactiveSelectionBackground": "#7aa2f71a",

    // Cursor — emerald green glow
    "editorCursor.foreground": "#10b981",

    // Line numbers
    "editorLineNumber.foreground": "#3b3f5c",
    "editorLineNumber.activeForeground": "#c0caf5",

    // Indent guides — subtle emerald
    "editorIndentGuide.background": "#1e2030",
    "editorIndentGuide.activeBackground": "#10b98140",

    // Bracket match
    "editorBracketMatch.background": "#7aa2f720",
    "editorBracketMatch.border": "#7aa2f740",

    // Gutter
    "editorGutter.background": "#16171f",
    "editorGutter.modifiedBackground": "#7aa2f7",
    "editorGutter.addedBackground": "#9ece6a",
    "editorGutter.deletedBackground": "#f7768e",

    // Widget & Overlays
    "editorWidget.background": "#1a1b26",
    "editorWidget.border": "#2a2b3d",
    "editorSuggestWidget.background": "#1a1b26",
    "editorSuggestWidget.border": "#2a2b3d",
    "editorSuggestWidget.selectedBackground": "#20283d",

    // Scrollbar
    "scrollbarSlider.background": "#ffffff0a",
    "scrollbarSlider.hoverBackground": "#ffffff15",
    "scrollbarSlider.activeBackground": "#ffffff20",

    // Minimap
    "minimap.background": "#16171f",

    // Find / Search
    "editor.findMatchBackground": "#ff9e6430",
    "editor.findMatchHighlightBackground": "#ff9e6418",

    // Whitespace
    "editorWhitespace.foreground": "#1e2030",

    // Overview ruler
    "editorOverviewRuler.border": "#00000000",
  },
};

// ☀️ Aurora Light Studio — Clean SaaS light theme
const auroraLightStudio = {
  base: "vs" as const,
  inherit: true,
  rules: [
    // Comments — dark gray italic
    { token: "comment", foreground: "8b95a5", fontStyle: "italic" },
    { token: "comment.block", foreground: "8b95a5", fontStyle: "italic" },
    { token: "comment.line", foreground: "8b95a5", fontStyle: "italic" },

    // Keywords — deep blue bold
    { token: "keyword", foreground: "1e40af", fontStyle: "bold" },
    { token: "keyword.control", foreground: "1e40af" },
    { token: "keyword.operator", foreground: "6366f1" },

    // Strings — warm brown
    { token: "string", foreground: "9a5b2f" },
    { token: "string.escape", foreground: "7c3aed" },

    // Numbers — forest green
    { token: "number", foreground: "2e7d32" },
    { token: "number.float", foreground: "2e7d32" },
    { token: "number.hex", foreground: "2e7d32" },

    // Types — deep teal
    { token: "type", foreground: "0e7490" },
    { token: "type.identifier", foreground: "0e7490" },
    { token: "class", foreground: "0e7490" },

    // Variables — slate dark
    { token: "variable", foreground: "1e293b" },
    { token: "variable.predefined", foreground: "1e40af" },

    // Functions
    { token: "entity.name.function", foreground: "6d28d9" },
    { token: "support.function", foreground: "6d28d9" },

    // Operators — muted purple
    { token: "operator", foreground: "7c3aed" },
    { token: "delimiter", foreground: "64748b" },
    { token: "delimiter.bracket", foreground: "64748b" },

    // Annotations
    { token: "annotation", foreground: "7c3aed" },
    { token: "tag", foreground: "dc2626" },

    // Constants
    { token: "constant", foreground: "9a5b2f" },
    { token: "constant.language", foreground: "1e40af", fontStyle: "italic" },
  ],
  colors: {
    // Editor background — pure white
    "editor.background": "#ffffff",
    "editor.foreground": "#1e293b",

    // Active line — very light cool gray
    "editor.lineHighlightBackground": "#f0f2f8",
    "editor.lineHighlightBorder": "#e2e6f0",

    // Selection — soft sky-blue translucent
    "editor.selectionBackground": "#3b82f628",
    "editor.selectionHighlightBackground": "#3b82f614",
    "editor.inactiveSelectionBackground": "#3b82f60f",

    // Cursor — vibrant blue
    "editorCursor.foreground": "#2563eb",

    // Line numbers
    "editorLineNumber.foreground": "#c1c8d6",
    "editorLineNumber.activeForeground": "#475569",

    // Indent guides
    "editorIndentGuide.background": "#e8ecf4",
    "editorIndentGuide.activeBackground": "#2563eb30",

    // Bracket match
    "editorBracketMatch.background": "#3b82f618",
    "editorBracketMatch.border": "#3b82f640",

    // Gutter
    "editorGutter.background": "#ffffff",
    "editorGutter.modifiedBackground": "#2563eb",
    "editorGutter.addedBackground": "#16a34a",
    "editorGutter.deletedBackground": "#dc2626",

    // Widget & Overlays
    "editorWidget.background": "#f7f8fc",
    "editorWidget.border": "#e2e6f0",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#e2e6f0",
    "editorSuggestWidget.selectedBackground": "#f0f2f8",

    // Scrollbar
    "scrollbarSlider.background": "#00000008",
    "scrollbarSlider.hoverBackground": "#00000012",
    "scrollbarSlider.activeBackground": "#0000001a",

    // Find / Search
    "editor.findMatchBackground": "#fbbf2440",
    "editor.findMatchHighlightBackground": "#fbbf2420",

    // Whitespace
    "editorWhitespace.foreground": "#e8ecf4",

    // Overview ruler
    "editorOverviewRuler.border": "#00000000",
  },
};

/* ─────────────────────────────────────────────────────
   Editor Component
   ───────────────────────────────────────────────────── */

export const Editor: React.FC<EditorProps> = ({ code, onChange, theme }) => {
  const editorRef = useRef<any>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  const customThemeName =
    theme === "light" ? "aurora-light-studio" : "eclipse-emerald-pro";

  // Register both custom themes before Monaco mounts
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("eclipse-emerald-pro", eclipseEmeraldPro);
    monaco.editor.defineTheme("aurora-light-studio", auroraLightStudio);
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  const toggleWordWrap = () => {
    const next = !wordWrap;
    setWordWrap(next);
    editorRef.current?.updateOptions({ wordWrap: next ? "on" : "off" });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const IconBtn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-1 rounded transition-all duration-150"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "var(--bg-surface-hover)";
        el.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "transparent";
        el.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-editor)",
        ...(isFullscreen && {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }),
      }}
    >
      {" "}
      {/* ── Top Tab Bar ── */}
      <div
        className="px-3 py-2 flex items-center gap-2 shrink-0"
        style={{
          background: "var(--bg-panel-header)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Active file tab */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{
            background: "var(--bg-surface-active)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <FileCode2
            className="w-3.5 h-3.5"
            style={{ color: "var(--accent-file)" }}
          />
          <span
            className="text-xs font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Main.java
          </span>
          <div
            className="w-1.5 h-1.5 rounded-full ml-0.5"
            style={{ background: "var(--accent-lang)" }}
            title="Unsaved changes"
          />
        </div>

        <div className="flex-1" />

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={toggleWordWrap}
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText
              className="w-3.5 h-3.5"
              style={{ opacity: wordWrap ? 1 : 0.5 }}
            />
          </IconBtn>
          <IconBtn
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </IconBtn>
          <IconBtn onClick={handleCopy} title="Copy code">
            {copied ? (
              <Check
                className="w-3.5 h-3.5"
                style={{ color: "var(--accent-success)" }}
              />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </IconBtn>
        </div>

        {/* Language badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md ml-1"
          style={{ background: "var(--bg-surface)" }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent-lang)" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Java
          </span>
        </div>
      </div>
      {/* ── Monaco Editor ── */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          defaultLanguage="java"
          theme={customThemeName}
          value={code}
          onChange={onChange}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 14,
            fontLigatures: true,
            lineHeight: 24,
            letterSpacing: 0.4,
            minimap: { enabled: false },
            wordWrap: wordWrap ? "on" : "off",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: "line",
            cursorWidth: 2,
            padding: { top: 20, bottom: 20 },
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            lineDecorationsWidth: 16,
            lineNumbersMinChars: 3,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "mouseover",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              bracketPairsHorizontal: true,
              highlightActiveBracketPair: true,
              indentation: true,
              highlightActiveIndentation: true,
            },
            matchBrackets: "always",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderWhitespace: "none",
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
            },
          }}
        />
      </div>
      {/* ── Bottom Status Bar ── */}
      <div
        className="px-4 py-1.5 flex items-center justify-between shrink-0"
        style={{
          background: "var(--bg-panel-header)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <div
            className="w-[1px] h-3"
            style={{ background: "var(--border-subtle)" }}
          />
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {lineCount} lines
          </span>
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {charCount} chars
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            UTF-8
          </span>
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            Spaces: 4
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              color: theme === "dark" ? "#10b981" : "#16a34a",
              background:
                theme === "dark"
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(22,163,74,0.06)",
            }}
          >
            {theme === "dark" ? "Eclipse Emerald" : "Aurora Light"}
          </span>
        </div>
      </div>
    </div>
  );
};
