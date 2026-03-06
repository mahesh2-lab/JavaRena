import * as React from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
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
  Wand2,
} from "lucide-react";
import { Theme } from "../types";
import { ShareDialog } from "./ShareDialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./ui/drawer";
import { useIsMobile } from "../hooks/use-mobile";

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
    "scrollbarSlider.background": "#ffffff1a",
    "scrollbarSlider.hoverBackground": "#ffffff2d",
    "scrollbarSlider.activeBackground": "#ffffff3d",

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
    "scrollbarSlider.background": "#00000012",
    "scrollbarSlider.hoverBackground": "#00000025",
    "scrollbarSlider.activeBackground": "#00000035",

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
   Basic Java Formatter
   ───────────────────────────────────────────────────── */
const formatJavaCode = (code: string, tabSize: number): string => {
  let indent = 0;
  const lines = code.split("\n");

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Count braces
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;

      // De-indent if line starts with closing brace
      let currentIndent = indent;
      if (trimmed.startsWith("}")) {
        currentIndent = Math.max(0, indent - 1);
      }

      const result = " ".repeat(Math.max(0, currentIndent * tabSize)) + trimmed;

      indent += openBraces - closeBraces;
      if (indent < 0) indent = 0;

      return result;
    })
    .join("\n");
};

/* ─────────────────────────────────────────────────────
   Editor Skeleton Loader
   ───────────────────────────────────────────────────── */
const EditorSkeleton: React.FC<{ theme: Theme }> = ({ theme }) => {
  const isDark = theme === "dark";
  const bgColor = isDark ? "#16171f" : "#ffffff";
  const skeletonColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const glossColor = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.6)";

  return (
    <div
      className="absolute inset-0 flex flex-col p-4 space-y-3 animate-pulse overflow-hidden"
      style={{ background: bgColor }}
    >
      {[...Array(20)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div
            className="w-8 h-3 shrink-0 rounded"
            style={{ background: skeletonColor }}
          />
          <div
            className="h-3 rounded"
            style={{
              background: skeletonColor,
              width: `${Math.floor(Math.random() * 60) + 20}%`,
              opacity: 1 - i * 0.04,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-pulse::after {
          content: "";
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background: linear-gradient(90deg, transparent, ${glossColor}, transparent);
          animation: shine 1.5s infinite;
        }
      `}</style>
    </div>
  );
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
  const editorRef = React.useRef<any>(null);
  const [cursorPos, setCursorPos] = React.useState({ line: 1, col: 1 });
  const [copied, setCopied] = React.useState(false);
  const [wordWrap, setWordWrap] = React.useState(true);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // Editor settings with localStorage persistence
  const [fontSize, setFontSize] = React.useState<number>(
    () => Number(localStorage.getItem("editor_fontSize")) || 14,
  );
  const [tabSize, setTabSize] = React.useState<number>(
    () => Number(localStorage.getItem("editor_tabSize")) || 4,
  );
  const [minimap, setMinimap] = React.useState<boolean>(
    () => localStorage.getItem("editor_minimap") === "true",
  );
  const [lineNumbers, setLineNumbers] = React.useState<boolean>(
    () => localStorage.getItem("editor_lineNumbers") !== "false",
  );

  // Extract Java class name from code
  const getJavaClassName = (code: string): string => {
    const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    return match ? match[1] : "Main";
  };
  const javaClassName = getJavaClassName(code);
  const [ligatures, setLigatures] = React.useState<boolean>(
    () => localStorage.getItem("editor_ligatures") !== "false",
  );
  const [bracketColors, setBracketColors] = React.useState<boolean>(
    () => localStorage.getItem("editor_bracketColors") !== "false",
  );
  const [whitespace, setWhitespace] = React.useState<string>(
    () => localStorage.getItem("editor_whitespace") || "none",
  );
  const [cursorStyle, setCursorStyleState] = React.useState<string>(
    () => localStorage.getItem("editor_cursorStyle") || "line",
  );

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  const customThemeName =
    theme === "light" ? "aurora-light-studio" : "eclipse-emerald-pro";

  // Register both custom themes and Java language before Monaco mounts
  const handleBeforeMount: BeforeMount = (monacoInstance) => {
    monacoInstance.editor.defineTheme("eclipse-emerald-pro", eclipseEmeraldPro);
    monacoInstance.editor.defineTheme("aurora-light-studio", auroraLightStudio);

    // Register Java language
    monacoInstance.languages.register({ id: "java" });

    // Java keywords, classes, methods
    const JAVA_KEYWORDS = [
      "abstract",
      "assert",
      "boolean",
      "break",
      "byte",
      "case",
      "catch",
      "char",
      "class",
      "const",
      "continue",
      "default",
      "do",
      "double",
      "else",
      "enum",
      "extends",
      "final",
      "finally",
      "float",
      "for",
      "goto",
      "if",
      "implements",
      "import",
      "instanceof",
      "int",
      "interface",
      "long",
      "native",
      "new",
      "package",
      "private",
      "protected",
      "public",
      "return",
      "short",
      "static",
      "strictfp",
      "super",
      "switch",
      "synchronized",
      "this",
      "throw",
      "throws",
      "transient",
      "try",
      "void",
      "volatile",
      "while",
    ];
    const JAVA_CLASSES = [
      "String",
      "System",
      "Math",
      "Integer",
      "Double",
      "Boolean",
      "Character",
      "ArrayList",
      "LinkedList",
      "HashMap",
      "HashSet",
      "Scanner",
      "Thread",
      "Runnable",
      "Exception",
      "IOException",
    ];
    const STRING_METHODS = [
      "length()",
      "substring()",
      "charAt()",
      "toUpperCase()",
      "toLowerCase()",
      "equals()",
      "contains()",
      "replace()",
    ];
    const MATH_METHODS = [
      "abs()",
      "max()",
      "min()",
      "sqrt()",
      "pow()",
      "random()",
      "round()",
    ];

    // Extract user symbols
    function extractUserSymbols(code: string): {
      classes: string[];
      methods: string[];
      variables: { [key: string]: string };
    } {
      const classes: string[] = [];
      const methods: string[] = [];
      const variables: { [key: string]: string } = {};
      let match: RegExpExecArray | null;
      const classRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)/g;
      while ((match = classRegex.exec(code)) !== null) {
        classes.push(match[1]);
      }
      const methodRegex =
        /(public|private|protected)?\s*(static)?\s*\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      while ((match = methodRegex.exec(code)) !== null) {
        methods.push(match[3]);
      }
      const varRegex =
        /\b(int|double|String|boolean|char|float|long)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      while ((match = varRegex.exec(code)) !== null) {
        variables[match[2]] = match[1];
      }
      return { classes, methods, variables };
    }

    // Register Java formatting provider
    monacoInstance.languages.registerDocumentFormattingEditProvider("java", {
      provideDocumentFormattingEdits(
        model: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions,
      ) {
        const text = model.getValue();
        const formatted = formatJavaCode(text, options.tabSize);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });

    monacoInstance.languages.registerCompletionItemProvider("java", {
      triggerCharacters: [".", ...JAVA_KEYWORDS],
      provideCompletionItems: function (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        const code = model.getValue();
        const { classes, methods, variables } = extractUserSymbols(code);
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions: monaco.languages.CompletionItem[] = [];
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        // Dot-based smart suggest
        const dotMatch = textUntilPosition.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.$/);
        if (dotMatch) {
          const objectName = dotMatch[1];
          const type = variables[objectName as keyof typeof variables];
          if (type === "String") {
            STRING_METHODS.forEach((method) => {
              suggestions.push({
                label: method,
                kind: monacoInstance.languages.CompletionItemKind.Method,
                insertText: method,
                range,
              });
            });
          }
          if (objectName === "Math") {
            MATH_METHODS.forEach((method) => {
              suggestions.push({
                label: method,
                kind: monacoInstance.languages.CompletionItemKind.Method,
                insertText: method,
                range,
              });
            });
          }
          return { suggestions };
        }
        // Keywords
        JAVA_KEYWORDS.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          });
        });
        // Static classes
        JAVA_CLASSES.forEach((cls) => {
          suggestions.push({
            label: cls,
            kind: monacoInstance.languages.CompletionItemKind.Class,
            insertText: cls,
            range,
          });
        });
        // User classes
        classes.forEach((cls) => {
          suggestions.push({
            label: cls,
            kind: monacoInstance.languages.CompletionItemKind.Class,
            insertText: cls,
            range,
          });
        });
        // User methods
        methods.forEach((method) => {
          suggestions.push({
            label: method + "()",
            kind: monacoInstance.languages.CompletionItemKind.Method,
            insertText: method + "()",
            range,
          });
        });
        // User variables
        Object.keys(variables).forEach((variable) => {
          suggestions.push({
            label: variable,
            kind: monacoInstance.languages.CompletionItemKind.Variable,
            insertText: variable,
            range,
          });
        });
        // Snippets
        suggestions.push({
          label: "main",
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: [
            "public static void main(String[] args) {",
            "\t$0",
            "}",
          ].join("\n"),
          insertTextRules:
            monacoInstance.languages.CompletionItemInsertTextRule
              .InsertAsSnippet,
          range,
        });
        suggestions.push({
          label: "sout",
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: "System.out.println($1);",
          insertTextRules:
            monacoInstance.languages.CompletionItemInsertTextRule
              .InsertAsSnippet,
          range,
        });
        suggestions.push({
          label: "fori",
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: ["for (int i = 0; i < ${1:n}; i++) {", "\t$0", "}"].join(
            "\n",
          ),
          insertTextRules:
            monacoInstance.languages.CompletionItemInsertTextRule
              .InsertAsSnippet,
          range,
        });
        suggestions.push({
          label: "if",
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: ["if (${1:condition}) {", "\t$0", "}"].join("\n"),
          insertTextRules:
            monacoInstance.languages.CompletionItemInsertTextRule
              .InsertAsSnippet,
          range,
        });
        suggestions.push({
          label: "trycatch",
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: [
            "try {",
            "\t$0",
            "} catch (${1:Exception} e) {",
            "\te.printStackTrace();",
            "}",
          ].join("\n"),
          insertTextRules:
            monacoInstance.languages.CompletionItemInsertTextRule
              .InsertAsSnippet,
          range,
        });
        return { suggestions };
      },
    });
  };

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Add Format action to context menu
    editor.addAction({
      id: "format-code-action",
      label: "Format Code",
      keybindings: [
        monacoInstance.KeyMod.Alt |
          monacoInstance.KeyMod.Shift |
          monacoInstance.KeyCode.KeyF,
      ],
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: () => {
        editor.getAction("editor.action.formatDocument")?.run();
      },
    });

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
  };

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  React.useEffect(() => {
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
  const updateSetting = React.useCallback(
    (key: string, value: any, monacoOption: Record<string, any>) => {
      localStorage.setItem(`editor_${key}`, String(value));
      editorRef.current?.updateOptions(monacoOption);
    },
    [],
  );

  const handleFontSize = (delta: number) => {
    const next = Math.min(28, Math.max(10, fontSize + delta));
    setFontSize(next);
    updateSetting("fontSize", next, {
      fontSize: next,
      lineHeight: Math.floor(next * 1.6),
    });
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
      className="p-1 rounded transition-all duration-150 hdr-btn"
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

  // Download code as Main.java
  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Main.java";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-editor)",
      }}
    >
      {/* ── Top Tab Bar ── */}
      <div
        className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 shrink-0"
        style={{
          background: "var(--bg-panel-header)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Active file tab */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{
            background: "var(--bg-surface-active)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <FileCode2
            className="w-3 h-3"
            style={{ color: "var(--accent-file)" }}
          />
          <span
            className="text-[11px] font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {javaClassName}.java
          </span>
          <div
            className="w-1 h-1 rounded-full ml-0.5"
            style={{ background: "var(--accent-lang)" }}
            title="Unsaved changes"
          />
        </div>

        <div className="flex-1" />

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-1">
          <IconBtn
            onClick={toggleWordWrap}
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText
              className="w-4 h-4 sm:w-3.5 sm:h-3.5"
              style={{ opacity: wordWrap ? 1 : 0.5 }}
            />
          </IconBtn>
          <IconBtn onClick={handleCopy} title="Copy code">
            {copied ? (
              <Check
                className="w-4 h-4 sm:w-3.5 sm:h-3.5"
                style={{ color: "var(--accent-success)" }}
              />
            ) : (
              <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            )}
          </IconBtn>
          <IconBtn onClick={handleDownload} title="Download as Main.java">
            <svg
              className="w-4 h-4 sm:w-3.5 sm:h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
              />
            </svg>
          </IconBtn>
          <IconBtn onClick={() => setShareDialogOpen(true)} title="Share code">
            <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </IconBtn>
          <IconBtn onClick={handleFormat} title="Format Code">
            <Wand2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </IconBtn>

          {/* Settings — Drawer on mobile, Popover on desktop */}
          {isMobile ? (
            <button
              onClick={() => setSettingsOpen(true)}
              title="Editor settings"
              className="p-1 rounded transition-all duration-150"
              style={{ color: "var(--text-muted)" }}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <button
                  title="Editor settings"
                  className="p-1 rounded transition-all duration-150"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--bg-surface-hover)";
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
                className="w-60 p-0 border-0 overflow-hidden"
                style={{
                  background: theme === "dark" ? "#1a1b26" : "#ffffff",
                  border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                  borderRadius: 10,
                  boxShadow:
                    theme === "dark"
                      ? "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
                      : "0 10px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="px-3.5 py-2 flex items-center gap-2"
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
                <div
                  className="py-2.5 px-3.5 space-y-3 max-h-90 overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
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
                  <SettingRow label="Tab Size" theme={theme}>
                    <div className="flex items-center gap-1">
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleTabSize(size)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all"
                          style={{
                            background:
                              tabSize === size
                                ? theme === "dark"
                                  ? "#10b981"
                                  : "#16a34a"
                                : theme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.05)",
                            color:
                              tabSize === size
                                ? "#fff"
                                : theme === "dark"
                                  ? "#8b949e"
                                  : "#64748b",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
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
                  <div
                    style={{
                      height: 1,
                      background:
                        theme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.07)",
                    }}
                  />
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
          )}

          {isMobile && (
            <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DrawerContent
                className="border-0 p-0 overflow-hidden"
                style={{ background: theme === "dark" ? "#1a1b26" : "#ffffff" }}
              >
                <DrawerTitle className="sr-only">Editor Settings</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Adjust editor preferences
                </DrawerDescription>
                <div
                  className="px-5 py-3.5 flex items-center gap-2.5"
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
                <div
                  className="py-4 px-5 space-y-5 max-h-[65vh] overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <SettingRow label="Font Size" theme={theme}>
                    <div className="flex items-center gap-2">
                      <SettingSmallBtn
                        onClick={() => handleFontSize(-1)}
                        theme={theme}
                        mobile
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </SettingSmallBtn>
                      <span
                        className="text-sm font-mono w-8 text-center tabular-nums"
                        style={{
                          color: theme === "dark" ? "#c0caf5" : "#1e293b",
                        }}
                      >
                        {fontSize}
                      </span>
                      <SettingSmallBtn
                        onClick={() => handleFontSize(1)}
                        theme={theme}
                        mobile
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </SettingSmallBtn>
                    </div>
                  </SettingRow>
                  <SettingRow label="Tab Size" theme={theme}>
                    <div className="flex items-center gap-1.5">
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleTabSize(size)}
                          className="px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
                          style={{
                            background:
                              tabSize === size
                                ? theme === "dark"
                                  ? "#10b981"
                                  : "#16a34a"
                                : theme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.05)",
                            color:
                              tabSize === size
                                ? "#fff"
                                : theme === "dark"
                                  ? "#8b949e"
                                  : "#64748b",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                  <SettingRow label="Cursor" theme={theme}>
                    <StyledSelect
                      value={cursorStyle}
                      onChange={(e) => handleCursorStyle(e.target.value)}
                      theme={theme}
                      mobile
                    >
                      <option value="line">Line</option>
                      <option value="block">Block</option>
                      <option value="underline">Underline</option>
                      <option value="line-thin">Thin Line</option>
                      <option value="block-outline">Block Outline</option>
                      <option value="underline-thin">Thin Underline</option>
                    </StyledSelect>
                  </SettingRow>
                  <SettingRow label="Whitespace" theme={theme}>
                    <StyledSelect
                      value={whitespace}
                      onChange={(e) => handleWhitespace(e.target.value)}
                      theme={theme}
                      mobile
                    >
                      <option value="none">None</option>
                      <option value="boundary">Boundary</option>
                      <option value="selection">Selection</option>
                      <option value="trailing">Trailing</option>
                      <option value="all">All</option>
                    </StyledSelect>
                  </SettingRow>
                  <div
                    style={{
                      height: 1,
                      background:
                        theme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.07)",
                    }}
                  />
                  <SettingsToggle
                    label="Minimap"
                    checked={minimap}
                    onChange={handleMinimap}
                    theme={theme}
                    mobile
                  />
                  <SettingsToggle
                    label="Line Numbers"
                    checked={lineNumbers}
                    onChange={handleLineNumbers}
                    theme={theme}
                    mobile
                  />
                  <SettingsToggle
                    label="Font Ligatures"
                    checked={ligatures}
                    onChange={handleLigatures}
                    theme={theme}
                    mobile
                  />
                  <SettingsToggle
                    label="Bracket Colors"
                    checked={bracketColors}
                    onChange={handleBracketColors}
                    theme={theme}
                    mobile
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </div>
      {/* ── Monaco Editor ── */}
      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          height="100%"
          language="java"
          theme={customThemeName}
          value={code}
          onChange={onChange}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          loading={<EditorSkeleton theme={theme} />}
          options={{
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize,
            fontLigatures: ligatures,
            lineHeight: Math.floor(fontSize * 1.6),
            letterSpacing: 0.4,
            minimap: { enabled: minimap },
            wordWrap: wordWrap ? "on" : "off",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: cursorStyle as any,
            cursorWidth: 2,
            padding: { top: 12, bottom: 20 },
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            scrollBeyondLastLine: true,
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
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalSliderSize: 6,
              horizontalSliderSize: 6,
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      </div>
      {/* ── Bottom Status Bar ── */}
      <div
        className="px-3 sm:px-4 py-1.5 flex items-center justify-between shrink-0 responsive-status-bar"
        style={{
          background: "var(--bg-panel-header)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1">
            <span
              className="text-[10px] sm:text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
          </div>
          <div
            className="w-px h-3"
            style={{ background: "var(--border-subtle)" }}
          />
          <span
            className="text-[10px] sm:text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            UTF-8
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 responsive-hide-mobile">
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              {lineCount} lines
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Tab: {tabSize}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <IconBtn onClick={() => {}} title="Output">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 17l6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
            </IconBtn>
            <a
              href="https://github.com/mahesh2-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center transition-colors duration-200"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>
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
      className="text-[11px] font-medium"
      style={{ color: theme === "dark" ? "#858da0" : "#64748b" }}
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
  mobile?: boolean;
}> = ({ onClick, theme, children, mobile }) => (
  <button
    onClick={onClick}
    className={`${mobile ? "w-8 h-8" : "w-6 h-6"} rounded flex items-center justify-center transition-all duration-150 active:scale-95`}
    style={{
      background:
        theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      color: theme === "dark" ? "#a9b1d6" : "#475569",
      border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
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
  mobile?: boolean;
}> = ({ value, onChange, theme, children, mobile }) => {
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
      className={`${mobile ? "text-sm py-2 px-3" : "text-[11px] py-1.5 px-2.5"} font-mono rounded-md outline-none cursor-pointer transition-colors duration-150 appearance-none`}
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
  mobile?: boolean;
}> = ({ label, checked, onChange, theme, mobile }) => {
  const trackW = mobile ? 42 : 32;
  const trackH = mobile ? 24 : 18;
  const knobSize = mobile ? 16 : 12;
  const gap = (trackH - knobSize) / 2;

  return (
    <div
      className="flex items-center justify-between"
      style={{ minHeight: mobile ? 36 : 24 }}
    >
      <span
        className={`${mobile ? "text-sm" : "text-[11px]"} font-medium select-none`}
        style={{ color: theme === "dark" ? "#858da0" : "#64748b" }}
      >
        {label}
      </span>
      <div
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange();
          }
        }}
        style={{
          position: "relative",
          width: trackW,
          height: trackH,
          flexShrink: 0,
          borderRadius: trackH,
          cursor: "pointer",
          backgroundColor: checked
            ? theme === "dark"
              ? "#10b981"
              : "#16a34a"
            : theme === "dark"
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.15)",
          transition: "background-color 0.2s ease",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: gap,
            left: gap,
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize,
            backgroundColor: checked
              ? "#fff"
              : theme === "dark"
                ? "#6b7280"
                : "#9ca3af",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transform: checked
              ? `translateX(${trackW - knobSize - gap * 2}px)`
              : "translateX(0)",
            transition: "transform 0.2s ease, background-color 0.2s ease",
          }}
        />
      </div>
    </div>
  );
};
