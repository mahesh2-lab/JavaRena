import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { Dialog, DialogContent } from "./ui/dialog";
import { useToast } from "../hooks/use-toast";
import {
  Link,
  Code,
  Copy,
  Check,
  Loader2,
  X,
  Download,
  Clock,
  Zap,
} from "lucide-react";
import { Theme } from "../App";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  output: string;
  theme: Theme;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  code,
  output,
  theme,
}) => {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [imageGenerated, setImageGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const brandName = "JavaRena";
  const isDark = theme === "dark";

  // Color palette adapts to theme
  const colors = isDark
    ? {
        darkBg: "#0D1117",
        cardBg: "#161B22",
        inputBg: "#090C10",
        borderColor: "#30363D",
        primaryGreen: "#00C853",
        primaryGreenHover: "#00E676",
        textPrimary: "#FFFFFF",
        textMuted: "#8B949E",
      }
    : {
        darkBg: "#FFFFFF",
        cardBg: "#F6F8FA",
        inputBg: "#EAEEF2",
        borderColor: "#D0D7DE",
        primaryGreen: "#00A846",
        primaryGreenHover: "#00C853",
        textPrimary: "#1F2328",
        textMuted: "#656D76",
      };

  const escapeHtml = (text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  const highlightJavaCode = (codeStr: string) => {
    const keywords = [
      "public",
      "private",
      "protected",
      "class",
      "interface",
      "extends",
      "implements",
      "new",
      "return",
      "void",
      "int",
      "String",
      "double",
      "float",
      "boolean",
      "static",
      "final",
      "if",
      "else",
      "for",
      "while",
      "import",
      "package",
    ];

    let highlighted = escapeHtml(codeStr);

    highlighted = highlighted.replace(
      /&quot;([^&]*)&quot;/g,
      '<span style="color: #98c379">&quot;$1&quot;</span>',
    );
    highlighted = highlighted.replace(
      /"([^"]*)"/g,
      '<span style="color: #98c379">"$1"</span>',
    );
    highlighted = highlighted.replace(
      /'([^']*)'/g,
      "<span style=\"color: #98c379\">'$1'</span>",
    );
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span style="color: #d19a66">$1</span>',
    );
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        '<span style="color: #c678dd">$1</span>',
      );
    });

    return highlighted;
  };

  const generateCanvasHTML = () => {
    const highlightedCode = highlightJavaCode(code);

    const outputLines = output
      .trim()
      .split("\n")
      .map(
        (line) =>
          `<div style="display: flex; gap: 16px;">
            <span style="color: rgba(0, 200, 83, 0.6);">$</span>
            <span style="color: rgba(255, 255, 255, 0.8);">${escapeHtml(line)}</span>
          </div>`,
      )
      .join("");

    return `
      <div style="position: relative; width: 1200px; min-height: 630px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; padding-bottom: 56px; background: radial-gradient(circle at center, #1c2128 0%, #0D1117 100%); border: 1px solid rgba(0, 200, 83, 0.1);">
        <div style="width: 100%; max-width: 1000px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: #1c2128; box-shadow: 0 0 20px rgba(6, 249, 103, 0.15), 0 0 1px rgba(6, 249, 103, 0.3), 0 25px 50px rgba(0,0,0,0.5); border: 1px solid rgba(255, 255, 255, 0.05);">
          <div style="padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; background: #161B22; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: rgba(255, 255, 255, 0.7); font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 14px; letter-spacing: 0.05em;">Main.java</span>
            </div>
            <div style="width: 48px;"></div>
          </div>
          <div style="padding: 32px;">
            <pre style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 18px; line-height: 1.75; color: rgba(255, 255, 255, 0.9); margin: 0; white-space: pre-wrap; word-break: break-word;">${highlightedCode}</pre>
          </div>
          ${
            output.trim()
              ? `
          <div style="padding: 24px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05); font-family: 'JetBrains Mono', 'Courier New', monospace;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); font-weight: bold;">
              <span>&#9000;</span>
              <span>Output</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${outputLines}
            </div>
          </div>
          `
              : ""
          }
        </div>
        <div style="position: absolute; bottom: 8px; right: 16px; display: flex; align-items: center; gap: 12px;">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="color: rgba(255, 255, 255, 0.3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Shared via</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: white; font-weight: bold; font-size: 24px; letter-spacing: -0.025em;">${escapeHtml(brandName)}</span>
              <span style="color: #06f967; font-size: 24px;">&#9889;</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Populate hidden canvas when dialog opens or code/output changes
  useEffect(() => {
    if (open && canvasRef.current) {
      canvasRef.current.innerHTML = generateCanvasHTML();
    }
  }, [code, output, open]);

  // ── Share Link ──
  const handleCreateLink = async () => {
    if (!code.trim()) {
      toast({
        title: "Cannot share",
        description: "Please write some code before sharing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, output }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create share link");
      }

      const data = await response.json();
      const url = `${window.location.origin}/s/${data.id}`;
      setShareUrl(url);

      toast({
        title: "Share link created! 🎉",
        description: "Your code is ready to share",
      });
    } catch (error) {
      toast({
        title: "Failed to create share link",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied! 📋",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  // ── Export Image (client-side html2canvas) ──
  const handleGenerateAndDownloadImage = async () => {
    if (!code.trim()) {
      toast({
        title: "Cannot generate image",
        description: "Please write some code before generating an image",
        variant: "destructive",
      });
      return;
    }

    if (!canvasRef.current) {
      toast({
        title: "Not ready",
        description: "Please wait a moment and try again",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Measure the actual rendered size of the content
      const el = canvasRef.current;
      const actualWidth = el.scrollWidth;
      const actualHeight = el.scrollHeight;

      const canvas = await html2canvas(el, {
        width: actualWidth,
        height: actualHeight,
        backgroundColor: "#0D1117",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, "-");
        link.download = `javarena_Snippet-${timestamp}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setImageGenerated(true);
        toast({
          title: "Downloaded! 📥",
          description: "Image saved to your device",
        });
      }, "image/png");
    } catch (err) {
      console.error("Download failed:", err);
      toast({
        title: "Failed to generate image",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShareUrl("");
    setImageGenerated(false);
    setCopied(false);
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength - 3);
    return start + "...";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setTimeout(handleReset, 200);
        }
      }}
    >
      <DialogContent
        className="w-full max-w-[480px] p-0 overflow-hidden border-0"
        style={{
          background: colors.darkBg,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-6 pb-4 flex justify-between items-start"
          style={{ borderBottom: `1px solid ${colors.borderColor}` }}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `${colors.primaryGreen}15`,
                border: `1px solid ${colors.primaryGreen}33`,
              }}
            >
              <Zap className="w-5 h-5" style={{ color: colors.primaryGreen }} />
            </div>
            <div>
              <h1
                className="text-xl font-semibold tracking-tight"
                style={{ color: colors.textPrimary }}
              >
                Share Your Snippet
              </h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Generate links and export code images
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 transition-colors"
            style={{ color: colors.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textMuted;
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 pt-2 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Share Link Section */}
          <div
            className="p-5 rounded-xl border"
            style={{
              background: colors.cardBg,
              borderColor: `${colors.borderColor}80`,
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <Link className="w-5 h-5" style={{ color: colors.textMuted }} />
              <h2 className="font-medium" style={{ color: colors.textPrimary }}>
                Share Link
              </h2>
            </div>

            {!shareUrl ? (
              <div className="space-y-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: colors.textMuted }}
                >
                  Generate a unique shareable link. Others can view and fork
                  your code. Link expires in 30 days.
                </p>
                <button
                  onClick={handleCreateLink}
                  disabled={loading}
                  className="w-full py-2.5 px-4 font-bold rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                  style={{
                    background: loading
                      ? `${colors.primaryGreen}B3`
                      : colors.primaryGreen,
                    color: colors.darkBg,
                    boxShadow: `0 4px 6px -1px ${colors.primaryGreen}1A`,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background =
                        colors.primaryGreenHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = colors.primaryGreen;
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>GENERATING...</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      <span>CREATE LINK</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                <div
                  className="px-4 py-3 rounded-md border flex items-center"
                  style={{
                    background: colors.inputBg,
                    borderColor: colors.borderColor,
                  }}
                >
                  <code
                    className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: `${colors.primaryGreen}E6` }}
                  >
                    {shareUrl}
                  </code>
                </div>

                <div
                  className="flex items-center gap-1.5 px-1"
                  style={{ color: colors.textMuted }}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Expires in 30 days
                  </span>
                </div>

                <button
                  onClick={handleCopyUrl}
                  className="w-full py-2.5 px-4 font-bold rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                  style={{
                    background: colors.primaryGreen,
                    color: colors.darkBg,
                    boxShadow: `0 4px 6px -1px ${colors.primaryGreen}1A`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.primaryGreenHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.primaryGreen;
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>COPY LINK</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Export Image Section */}
          <div
            className="p-5 rounded-xl border"
            style={{
              background: colors.cardBg,
              borderColor: `${colors.borderColor}80`,
            }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Code className="w-5 h-5" style={{ color: colors.textMuted }} />
              <h2 className="font-medium" style={{ color: colors.textPrimary }}>
                Export Image
              </h2>
            </div>

            <div className="flex items-start gap-3 mb-5">
              <p
                className="text-sm leading-relaxed"
                style={{ color: colors.textMuted }}
              >
                Create a high-resolution code card with professional syntax
                highlighting. The image automatically adjusts its size to fit
                your code and output.
              </p>
            </div>

            <button
              onClick={handleGenerateAndDownloadImage}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-transparent border rounded-md flex items-center justify-center gap-2 transition-all font-medium"
              style={{
                borderColor: colors.borderColor,
                color: colors.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = colors.textMuted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = colors.borderColor;
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>GENERATING...</span>
                </>
              ) : (
                <>
                  <Download
                    className="w-4 h-4"
                    style={{ color: colors.textMuted }}
                  />
                  <span>EXPORT IMAGE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-center items-center"
          style={{
            borderTop: `1px solid ${colors.borderColor}`,
            background: colors.inputBg,
          }}
        >
          <div
            className="flex items-center gap-1.5 text-xs font-mono tracking-widest uppercase"
            style={{ color: colors.textMuted }}
          >
            JavaRena{" "}
            <Zap
              className="w-3.5 h-3.5"
              style={{ color: colors.primaryGreen }}
            />{" "}
            Engine
          </div>
        </div>
      </DialogContent>

      {/* Hidden Canvas for client-side image generation */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          zIndex: -1,
        }}
      >
        <div ref={canvasRef}></div>
      </div>
    </Dialog>
  );
};
