import React, { useRef, useState, useEffect, useCallback } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import {
  FileCode2,
  Copy,
  Check,
  WrapText,
  Github,
  Share2,
  Settings2,
  Minus,
  Plus,
} from "lucide-react";
import { Theme } from "../App";
import { ShareDialog } from "./ShareDialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface EditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  theme: Theme;
  output?: string;
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

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  theme,
  output = "",
}) => {
  const editorRef = useRef<any>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Editor settings with localStorage persistence
  const [fontSize, setFontSize] = useState<number>(
    () => Number(localStorage.getItem("editor_fontSize")) || 14,
  );
  const [tabSize, setTabSize] = useState<number>(
    () => Number(localStorage.getItem("editor_tabSize")) || 4,
  );
  const [minimap, setMinimap] = useState<boolean>(
    () => localStorage.getItem("editor_minimap") === "true",
  );
  const [lineNumbers, setLineNumbers] = useState<boolean>(
    () => localStorage.getItem("editor_lineNumbers") !== "false",
  );
  const [ligatures, setLigatures] = useState<boolean>(
    () => localStorage.getItem("editor_ligatures") !== "false",
  );
  const [bracketColors, setBracketColors] = useState<boolean>(
    () => localStorage.getItem("editor_bracketColors") !== "false",
  );
  const [whitespace, setWhitespace] = useState<string>(
    () => localStorage.getItem("editor_whitespace") || "none",
  );
  const [cursorStyle, setCursorStyleState] = useState<string>(
    () => localStorage.getItem("editor_cursorStyle") || "line",
  );

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

  const toggleWordWrap = () => {
    const next = !wordWrap;
    setWordWrap(next);
    editorRef.current?.updateOptions({ wordWrap: next ? "on" : "off" });
  };

  // Persist and apply a setting change
  const updateSetting = useCallback(
    (key: string, value: any, monacoOption: Record<string, any>) => {
      localStorage.setItem(`editor_${key}`, String(value));
      editorRef.current?.updateOptions(monacoOption);
    },
    [],
  );

  const handleFontSize = (delta: number) => {
    const next = Math.min(28, Math.max(10, fontSize + delta));
    setFontSize(next);
    updateSetting("fontSize", next, { fontSize: next });
  };

  const handleTabSize = (size: number) => {
    setTabSize(size);
    updateSetting("tabSize", size, { tabSize: size });
    editorRef.current?.getModel()?.updateOptions({ tabSize: size });
  };

  const handleMinimap = () => {
    const next = !minimap;
    setMinimap(next);
    updateSetting("minimap", next, { minimap: { enabled: next } });
  };

  const handleLineNumbers = () => {
    const next = !lineNumbers;
    setLineNumbers(next);
    updateSetting("lineNumbers", next, {
      lineNumbers: next ? "on" : "off",
    });
  };

  const handleLigatures = () => {
    const next = !ligatures;
    setLigatures(next);
    updateSetting("ligatures", next, { fontLigatures: next });
  };

  const handleBracketColors = () => {
    const next = !bracketColors;
    setBracketColors(next);
    updateSetting("bracketColors", next, {
      "bracketPairColorization.enabled": next,
    });
  };

  const handleWhitespace = (val: string) => {
    setWhitespace(val);
    updateSetting("whitespace", val, { renderWhitespace: val });
  };

  const handleCursorStyle = (val: string) => {
    setCursorStyleState(val);
    updateSetting("cursorStyle", val, { cursorStyle: val });
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
      }}
    >
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
          <IconBtn onClick={() => setShareDialogOpen(true)} title="Share code">
            <Share2 className="w-3.5 h-3.5" />
          </IconBtn>

          {/* Settings Popover */}
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <button
                title="Editor settings"
                className="p-1 rounded transition-all duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-surface-hover)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[280px] p-0 border-0"
              style={{
                background: theme === "dark" ? "#1a1b26" : "#ffffff",
                border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 12,
                boxShadow:
                  theme === "dark"
                    ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center gap-2.5"
                style={{
                  borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                <Settings2
                  className="w-4 h-4"
                  style={{ color: theme === "dark" ? "#10b981" : "#16a34a" }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: theme === "dark" ? "#c0caf5" : "#1e293b" }}
                >
                  Editor Settings
                </span>
              </div>

              {/* Settings List */}
              <div
                className="py-3 px-4 space-y-4 max-h-[360px] overflow-y-auto"
                style={{ scrollbarWidth: "thin" }}
              >
                {/* Font Size */}
                <SettingRow label="Font Size" theme={theme}>
                  <div className="flex items-center gap-1.5">
                    <SettingSmallBtn
                      onClick={() => handleFontSize(-1)}
                      theme={theme}
                    >
                      <Minus className="w-3 h-3" />
                    </SettingSmallBtn>
                    <span
                      className="text-xs font-mono w-7 text-center tabular-nums"
                      style={{
                        color: theme === "dark" ? "#c0caf5" : "#1e293b",
                      }}
                    >
                      {fontSize}
                    </span>
                    <SettingSmallBtn
                      onClick={() => handleFontSize(1)}
                      theme={theme}
                    >
                      <Plus className="w-3 h-3" />
                    </SettingSmallBtn>
                  </div>
                </SettingRow>

                {/* Tab Size */}
                <SettingRow label="Tab Size" theme={theme}>
                  <div className="flex items-center gap-1">
                    {[2, 4, 8].map((size) => {
                      const active = tabSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => handleTabSize(size)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all duration-150"
                          style={{
                            background: active
                              ? theme === "dark"
                                ? "#10b981"
                                : "#16a34a"
                              : theme === "dark"
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.05)",
                            color: active
                              ? "#fff"
                              : theme === "dark"
                                ? "#8b949e"
                                : "#64748b",
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </SettingRow>

                {/* Cursor Style */}
                <SettingRow label="Cursor" theme={theme}>
                  <StyledSelect
                    value={cursorStyle}
                    onChange={(e) => handleCursorStyle(e.target.value)}
                    theme={theme}
                  >
                    <option value="line">Line</option>
                    <option value="block">Block</option>
                    <option value="underline">Underline</option>
                    <option value="line-thin">Thin Line</option>
                    <option value="block-outline">Block Outline</option>
                    <option value="underline-thin">Thin Underline</option>
                  </StyledSelect>
                </SettingRow>

                {/* Whitespace */}
                <SettingRow label="Whitespace" theme={theme}>
                  <StyledSelect
                    value={whitespace}
                    onChange={(e) => handleWhitespace(e.target.value)}
                    theme={theme}
                  >
                    <option value="none">None</option>
                    <option value="boundary">Boundary</option>
                    <option value="selection">Selection</option>
                    <option value="trailing">Trailing</option>
                    <option value="all">All</option>
                  </StyledSelect>
                </SettingRow>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background:
                      theme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.07)",
                  }}
                />

                {/* Toggles */}
                <SettingsToggle
                  label="Minimap"
                  checked={minimap}
                  onChange={handleMinimap}
                  theme={theme}
                />
                <SettingsToggle
                  label="Line Numbers"
                  checked={lineNumbers}
                  onChange={handleLineNumbers}
                  theme={theme}
                />
                <SettingsToggle
                  label="Font Ligatures"
                  checked={ligatures}
                  onChange={handleLigatures}
                  theme={theme}
                />
                <SettingsToggle
                  label="Bracket Colors"
                  checked={bracketColors}
                  onChange={handleBracketColors}
                  theme={theme}
                />
              </div>
            </PopoverContent>
          </Popover>
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
            fontSize,
            fontLigatures: ligatures,
            lineHeight: 24,
            letterSpacing: 0.4,
            minimap: { enabled: minimap },
            wordWrap: wordWrap ? "on" : "off",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: cursorStyle as any,
            cursorWidth: 2,
            padding: { top: 20, bottom: 20 },
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            scrollBeyondLastLine: false,
            lineNumbers: lineNumbers ? "on" : "off",
            lineDecorationsWidth: 16,
            lineNumbersMinChars: 3,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "mouseover",
            bracketPairColorization: { enabled: bracketColors },
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
            renderWhitespace: whitespace as any,
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
        className="px-4 py-1.5 flex items-center justify-between shrink-0 responsive-status-bar"
        style={{
          background: "var(--bg-panel-header)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-4">
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
            className="text-[11px] font-mono hidden sm:inline"
            style={{ color: "var(--text-muted)" }}
          >
            {lineCount} lines
          </span>
          <span
            className="text-[11px] font-mono hidden sm:inline"
            style={{ color: "var(--text-muted)" }}
          >
            {charCount} chars
          </span>
          <span
            className="text-[11px] font-mono hidden sm:inline"
            style={{ color: "var(--text-muted)" }}
          >
            Tab: {tabSize}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span
            className="text-[11px] font-mono hidden md:inline"
            style={{ color: "var(--text-muted)" }}
          >
            UTF-8
          </span>
          <span
            className="text-[11px] font-mono hidden md:inline"
            style={{ color: "var(--text-muted)" }}
          >
            Font: {fontSize}px
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded hidden lg:inline"
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
          <div
            className="w-[1px] h-3 hidden sm:block"
            style={{ background: "var(--border-subtle)" }}
          />
          <a
            href="https://github.com/mahesh2-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono transition-colors duration-200"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Github className="w-3 h-3" />
            <span className="hidden sm:inline">@mahesh2-lab</span>
          </a>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        code={code}
        output={output}
        theme={theme}
      />
    </div>
  );
};

/* ── Helper components for Settings panel ── */

const SettingRow: React.FC<{
  label: string;
  theme: Theme;
  children: React.ReactNode;
}> = ({ label, theme, children }) => (
  <div className="flex items-center justify-between">
    <span
      className="text-xs font-medium"
      style={{ color: theme === "dark" ? "#8b949e" : "#64748b" }}
    >
      {label}
    </span>
    {children}
  </div>
);

const SettingSmallBtn: React.FC<{
  onClick: () => void;
  theme: Theme;
  children: React.ReactNode;
}> = ({ onClick, theme, children }) => (
  <button
    onClick={onClick}
    className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95"
    style={{
      background:
        theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      color: theme === "dark" ? "#a9b1d6" : "#475569",
      border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
    }}
  >
    {children}
  </button>
);

const StyledSelect: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  theme: Theme;
  children: React.ReactNode;
}> = ({ value, onChange, theme, children }) => {
  const isDark = theme === "dark";
  const optionBg = isDark ? "#1a1b26" : "#ffffff";
  const optionColor = isDark ? "#c0caf5" : "#1e293b";

  // Clone children to inject option styles
  const styledChildren = React.Children.map(children, (child) => {
    if (
      React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(
        child,
      ) &&
      child.type === "option"
    ) {
      return React.cloneElement(child, {
        style: {
          background: optionBg,
          color: optionColor,
          padding: "6px 8px",
          ...(child.props.style || {}),
        },
      });
    }
    return child;
  });

  return (
    <select
      value={value}
      onChange={onChange}
      className="text-[11px] font-mono rounded-md px-2.5 py-1.5 outline-none cursor-pointer transition-colors duration-150 appearance-none"
      style={{
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        color: isDark ? "#c0caf5" : "#1e293b",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${isDark ? "%238b949e" : "%2364748b"}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
        paddingRight: 22,
        colorScheme: isDark ? "dark" : "light",
      }}
    >
      {styledChildren}
    </select>
  );
};

const SettingsToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  theme: Theme;
}> = ({ label, checked, onChange, theme }) => (
  <div className="flex items-center justify-between">
    <span
      className="text-xs font-medium"
      style={{ color: theme === "dark" ? "#8b949e" : "#64748b" }}
    >
      {label}
    </span>
    <button
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-colors duration-200"
      style={{
        background: checked
          ? theme === "dark"
            ? "#10b981"
            : "#16a34a"
          : theme === "dark"
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.12)",
      }}
    >
      <span
        className="absolute top-[3px] w-[14px] h-[14px] rounded-full transition-all duration-200 shadow-sm"
        style={{
          background: checked
            ? "#fff"
            : theme === "dark"
              ? "#6b7280"
              : "#9ca3af",
          left: 3,
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  </div>
);
