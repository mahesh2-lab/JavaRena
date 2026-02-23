import React, { useRef, useEffect, useState } from "react";
import {
  Trash2,
  Terminal,
  ChevronRight,
  Keyboard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  BookOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { FlickeringGrid } from "./ui/flickering-grid";
import { Theme } from "../App";

export interface LogEntry {
  text: string;
  type: "info" | "success" | "error";
  timestamp: number;
}

export interface ErrorReview {
  error_type: "compilation" | "runtime";
  title: string;
  raw_error: string;
  explanation: string;
  line_numbers: number[];
  suggestions: string[];
}

interface ConsoleProps {
  output: LogEntry[];
  executionTime: number | null;
  onClear: () => void;
  theme: Theme;
  stdinInput: string;
  onStdinChange: (value: string) => void;
  errorReview?: ErrorReview | null;
  aiReview?: string | null;
  /** When true, suppress the Console's own header bar (parent provides one) */
  hideHeader?: boolean;
}

export const Console: React.FC<ConsoleProps> = ({
  output,
  executionTime,
  onClear,
  theme,
  stdinInput,
  onStdinChange,
  errorReview,
  aiReview,
  hideHeader = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(true);
  const [showAiReview, setShowAiReview] = useState<boolean>(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, errorReview, aiReview]);

  const flickerColor =
    theme === "light" ? "rgb(79, 70, 229)" : "rgb(99, 102, 241)";

  return (
    <div
      className="flex flex-col h-full"
      role="region"
      aria-label="Console output panel"
      style={{ background: "var(--bg-console)" }}
    >
      {/* Console Header */}
      {!hideHeader && <div
        className="px-4 py-2.5 flex items-center justify-between shrink-0 responsive-status-bar"
        style={{
          background: "var(--bg-panel-header)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Terminal
            className="w-4 h-4"
            style={{ color: "var(--accent-terminal)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-[0.12em]"
            style={{
              color: "var(--text-muted)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span className="hidden sm:inline">Console Output</span>
            <span className="sm:hidden">Output</span>
          </span>
          {executionTime !== null && (
            <span
              className="text-[10px] font-mono ml-1 sm:ml-2 px-2 py-0.5 rounded-full"
              style={{
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {executionTime}ms
            </span>
          )}
        </div>

        {/* Clear */}
        <button
          id="clear-console-button"
          onClick={onClear}
          className="p-1.5 rounded-md transition-all duration-200"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-muted)",
          }}
          title="Clear console"
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--bg-surface-hover)";
            el.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--bg-surface)";
            el.style.color = "var(--text-muted)";
          }}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>}

      {/* Stdin Input Area */}
      <div
        className="shrink-0"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Stdin Toggle Header */}
        <button
          onClick={() => setShowStdin(!showStdin)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors duration-200"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-muted)",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-surface-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-surface)";
          }}
        >
          <Keyboard
            className="w-3.5 h-3.5"
            style={{ color: "var(--accent-terminal)" }}
          />
          <span
            className="font-semibold uppercase tracking-[0.1em]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Stdin Input
          </span>
          {stdinInput && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
              style={{
                background: "var(--bg-surface-active)",
                color: "var(--status-text)",
              }}
            >
              {stdinInput.split("\n").length} line
              {stdinInput.split("\n").length > 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto">
            {showStdin ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {/* Stdin Textarea */}
        {showStdin && (
          <div
            className="px-4 py-2"
            style={{ background: "var(--bg-panel-header)" }}
          >
            <textarea
              value={stdinInput}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter input values here (one per line for multiple inputs)..."
              rows={3}
              aria-label="Standard input for Java program"
              className="w-full rounded-md px-3 py-2 text-xs font-mono resize-y focus:outline-none transition-colors duration-200"
              style={{
                background: "var(--bg-editor)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                minHeight: "60px",
                maxHeight: "120px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  "var(--accent-terminal)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  "var(--border-subtle)";
              }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Provide input for Scanner / System.in — each line is a separate
                input
              </p>
              {stdinInput && (
                <button
                  onClick={() => onStdinChange("")}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "var(--bg-surface-hover)";
                    el.style.color = "var(--text-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "var(--bg-surface)";
                    el.style.color = "var(--text-muted)";
                  }}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Console Output Area with FlickeringGrid background */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: "var(--bg-console)" }}
      >
        {/* FlickeringGrid as background */}
        <div className="absolute inset-0 pointer-events-none">
          <FlickeringGrid
            squareSize={4}
            gridGap={6}
            flickerChance={0.3}
            color={flickerColor}
            maxOpacity={theme === "light" ? 0.12 : 0.15}
            className="w-full h-full"
          />
        </div>

        {/* Scrollable console content on top */}
        <div
          className="absolute inset-0 overflow-auto p-4 font-mono text-sm"
          role="log"
          aria-live="polite"
          aria-label="Program output"
        >
          {output.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
              <Terminal
                className="w-10 h-10"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-xs font-medium tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                No output yet
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Press{" "}
                <kbd
                  className="px-1.5 py-0.5 rounded mx-0.5"
                  style={{
                    background: "var(--kbd-bg)",
                    border: "1px solid var(--kbd-border)",
                    color: "var(--kbd-text)",
                  }}
                >
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd
                  className="px-1.5 py-0.5 rounded mx-0.5"
                  style={{
                    background: "var(--kbd-bg)",
                    border: "1px solid var(--kbd-border)",
                    color: "var(--kbd-text)",
                  }}
                >
                  Enter
                </kbd>{" "}
                to run
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {output.map((line, i) => (
                <div
                  key={`${line.timestamp}-${i}`}
                  className="flex items-start gap-2 py-1 px-2 rounded-md transition-colors duration-150 animate-fade-in"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    lineHeight: "1.7",
                    animationDelay: `${i * 30}ms`,
                    color:
                      line.type === "error"
                        ? "var(--accent-error)"
                        : line.type === "success"
                          ? "var(--accent-success)"
                          : "var(--accent-info)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "var(--bg-surface)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }}
                >
                  <ChevronRight className="w-3 h-3 mt-[5px] shrink-0 opacity-30" />
                  {line.type === "error" && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider mt-[3px] opacity-50">
                      ERR
                    </span>
                  )}
                  <span className="break-all">{line.text}</span>
                </div>
              ))}
            </div>
          )}
          {/* ── Error Review Panel ── */}
          {errorReview && (
            <div
              className="mt-4 rounded-lg overflow-hidden animate-fade-in"
              style={{
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
              }}
            >
              {/* Review Header */}
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors duration-200"
                style={{
                  background: "var(--bg-panel-header)",
                  color: "var(--accent-error)",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: showReview
                    ? "1px solid var(--border-subtle)"
                    : "none",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span
                  className="font-semibold uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {errorReview.title}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono ml-1"
                  style={{
                    background: "var(--bg-surface-active)",
                    color: "var(--text-muted)",
                  }}
                >
                  {errorReview.error_type}
                </span>
                {errorReview.line_numbers.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
                    style={{
                      background: "var(--bg-surface-active)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Line {errorReview.line_numbers.join(", ")}
                  </span>
                )}
                <span className="ml-auto">
                  {showReview ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {/* Review Content */}
              {showReview && (
                <div className="px-4 py-3 space-y-3">
                  {/* Explanation */}
                  <div className="flex items-start gap-2">
                    <BookOpen
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      style={{ color: "var(--accent-info)" }}
                    />
                    <p
                      className="text-xs leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                      }}
                    >
                      {errorReview.explanation}
                    </p>
                  </div>

                  {/* Suggestions */}
                  {errorReview.suggestions.length > 0 && (
                    <div
                      className="rounded-md px-3 py-2.5"
                      style={{
                        background: "var(--bg-editor)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb
                          className="w-3 h-3"
                          style={{ color: "var(--status-text)" }}
                        />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                          style={{
                            color: "var(--status-text)",
                            fontFamily: "'Outfit', sans-serif",
                          }}
                        >
                          Suggestions
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {errorReview.suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs"
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "11px",
                              lineHeight: "1.6",
                            }}
                          >
                            <ChevronRight
                              className="w-3 h-3 mt-[3px] shrink-0"
                              style={{ color: "var(--accent-terminal)" }}
                            />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── AI Review Panel ── */}
          {aiReview && (
            <div
              className="mt-3 rounded-lg overflow-hidden animate-fade-in"
              style={{
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                animationDelay: "150ms",
              }}
            >
              {/* AI Review Header */}
              <button
                onClick={() => setShowAiReview(!showAiReview)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors duration-200"
                style={{
                  background: "var(--bg-panel-header)",
                  color: "var(--accent-terminal)",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: showAiReview
                    ? "1px solid var(--border-subtle)"
                    : "none",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span
                  className="font-semibold uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  AI Error Analysis
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono ml-1"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))",
                    color: "var(--accent-terminal)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  GPT
                </span>
                <span className="ml-auto">
                  {showAiReview ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {/* AI Review Content */}
              {showAiReview && (
                <div className="px-4 py-3 ai-review-markdown">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "12px",
                            lineHeight: "1.7",
                            margin: "0 0 8px 0",
                          }}
                        >
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {children}
                        </strong>
                      ),
                      code: ({ children }) => (
                        <code
                          style={{
                            background: "var(--bg-editor)",
                            color: "var(--accent-terminal)",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "'JetBrains Mono', monospace",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {children}
                        </code>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            margin: "6px 0",
                            paddingLeft: "0",
                            listStyle: "none",
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          style={{
                            margin: "6px 0",
                            paddingLeft: "16px",
                            color: "var(--text-secondary)",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "12px",
                            lineHeight: "1.7",
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li
                          className="flex items-start gap-2 py-0.5"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "12px",
                            lineHeight: "1.7",
                          }}
                        >
                          <ChevronRight
                            className="w-3 h-3 mt-[5px] shrink-0"
                            style={{ color: "var(--accent-terminal)" }}
                          />
                          <span>{children}</span>
                        </li>
                      ),
                      pre: ({ children }) => (
                        <pre
                          style={{
                            background: "var(--bg-editor)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            margin: "8px 0",
                            overflow: "auto",
                            fontSize: "11px",
                            fontFamily: "'JetBrains Mono', monospace",
                            color: "var(--accent-terminal)",
                          }}
                        >
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {aiReview}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
