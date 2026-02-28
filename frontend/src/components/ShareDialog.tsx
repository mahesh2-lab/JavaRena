import React, { useState, useRef, useEffect } from "react";
import { xxHash32 } from "js-xxhash";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./ui/drawer";
import { useToast } from "../hooks/use-toast";
import { useIsMobile } from "../hooks/use-mobile";
import {
  Link,
  Code,
  Copy,
  Check,
  Loader2,
  Download,
  Clock,
  Zap,
} from "lucide-react";
import { Theme } from "../types";
import { fetchApi } from "../lib/api-client";

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
  const isMobile = useIsMobile();

  // Persist share cache in localStorage
  const getShareCache = (): { hash: string; url: string } | null => {
    try {
      const raw = localStorage.getItem("share_cache");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const setShareCache = (hash: string, url: string) => {
    localStorage.setItem("share_cache", JSON.stringify({ hash, url }));
  };

  const brandName = "Jyvra";
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

  // xxHash32 content fingerprinting
  const currentHash = xxHash32(code + "\n---OUTPUT---\n" + output).toString(36);

  // Auto-show cached URL when dialog opens if code hasn't changed
  useEffect(() => {
    if (open) {
      const cached = getShareCache();
      if (cached && cached.hash === currentHash) {
        setShareUrl(cached.url);
      }
    }
  }, [open]);

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
      const data = await fetchApi("/api/share", {
        method: "POST",
        body: JSON.stringify({ code, output }),
      });

      const url = `${window.location.origin}/s/${data.id}`;
      setShareUrl(url);
      setShareCache(currentHash, url);

      toast({
        title: "Share link created! 🎉",
        description: "Your code is ready to share",
        variant: "success",
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

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to fallback
      }
    }
    // Fallback: hidden textarea + execCommand
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyUrl = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied! 📋",
        description: "Share link copied to clipboard",
        variant: "success",
      });
    } else {
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

      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;

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
        link.download = `jyvra_Snippet-${timestamp}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setImageGenerated(true);
        toast({
          title: "Downloaded! 📥",
          description: "Image saved to your device",
          variant: "success",
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
    // Only clear shareUrl if code has changed since last share
    const cached = getShareCache();
    if (!cached || cached.hash !== currentHash) {
      setShareUrl("");
    }
    setImageGenerated(false);
    setCopied(false);
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, maxLength - 3);
    return start + "...";
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setTimeout(handleReset, 200);
    }
  };

  /* ── Shared inner content (used by both Dialog and Drawer) ── */
  const shareContent = (
    <>
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-4 sm:py-6 pb-3 sm:pb-4 flex justify-between items-start"
        style={{ borderBottom: `1px solid ${colors.borderColor}` }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${colors.primaryGreen}15`,
              border: `1px solid ${colors.primaryGreen}33`,
            }}
          >
            <Zap
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: colors.primaryGreen }}
            />
          </div>
          <div className="min-w-0">
            <h1
              className="text-base sm:text-xl font-semibold tracking-tight"
              style={{ color: colors.textPrimary }}
            >
              Share Your Snippet
            </h1>
            <p
              className="text-xs sm:text-sm"
              style={{ color: colors.textMuted }}
            >
              Generate links and export code images
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="px-4 sm:px-6 py-4 sm:py-6 pt-2 space-y-4 sm:space-y-6 overflow-y-auto"
        style={{ maxHeight: isMobile ? "60vh" : "70vh" }}
      >
        {/* Share Link Section */}
        <div
          className="p-3.5 sm:p-5 rounded-xl border"
          style={{
            background: colors.cardBg,
            borderColor: `${colors.borderColor}80`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
            <Link
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: colors.textMuted }}
            />
            <h2
              className="font-medium text-sm sm:text-base"
              style={{ color: colors.textPrimary }}
            >
              Share Link
            </h2>
          </div>

          {!shareUrl ? (
            <div className="space-y-3 sm:space-y-4">
              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{ color: colors.textMuted }}
              >
                Generate a unique shareable link. Others can view and fork your
                code. Link expires in 30 days.
              </p>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="w-full py-3 sm:py-2.5 px-4 font-bold text-sm rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                style={{
                  background: loading
                    ? `${colors.primaryGreen}B3`
                    : colors.primaryGreen,
                  color: colors.darkBg,
                  boxShadow: `0 4px 6px -1px ${colors.primaryGreen}1A`,
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    e.currentTarget.style.background = colors.primaryGreenHover;
                }}
                onMouseLeave={(e) => {
                  if (!loading)
                    e.currentTarget.style.background = colors.primaryGreen;
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
            <div className="space-y-3 sm:space-y-4 animate-in fade-in">
              <div
                className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-md border flex items-center"
                style={{
                  background: colors.inputBg,
                  borderColor: colors.borderColor,
                }}
              >
                <code
                  className="font-mono text-xs sm:text-sm overflow-hidden text-ellipsis whitespace-nowrap block w-full"
                  style={{ color: `${colors.primaryGreen}E6` }}
                >
                  {shareUrl}
                </code>
              </div>

              <div
                className="flex items-center gap-1.5 px-1"
                style={{ color: colors.textMuted }}
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider font-medium">
                  Expires in 30 days
                </span>
              </div>

              <button
                onClick={handleCopyUrl}
                className="w-full py-3 sm:py-2.5 px-4 font-bold text-sm rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
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
          className="p-3.5 sm:p-5 rounded-xl border"
          style={{
            background: colors.cardBg,
            borderColor: `${colors.borderColor}80`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
            <Code
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: colors.textMuted }}
            />
            <h2
              className="font-medium text-sm sm:text-base"
              style={{ color: colors.textPrimary }}
            >
              Export Image
            </h2>
          </div>

          <div className="flex items-start gap-3 mb-3 sm:mb-5">
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: colors.textMuted }}
            >
              Create a high-resolution code card with professional syntax
              highlighting.
            </p>
          </div>

          <button
            onClick={handleGenerateAndDownloadImage}
            disabled={loading}
            className="w-full py-3 sm:py-2.5 px-4 bg-transparent border rounded-md flex items-center justify-center gap-2 transition-all font-medium text-sm"
            style={{
              borderColor: colors.borderColor,
              color: colors.textPrimary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)";
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
        className="px-4 sm:px-6 py-3 sm:py-4 flex justify-center items-center"
        style={{
          borderTop: `1px solid ${colors.borderColor}`,
          background: colors.inputBg,
        }}
      >
        <div
          className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono tracking-widest uppercase"
          style={{ color: colors.textMuted }}
        >
          JavaRena{" "}
          <Zap
            className="w-3 h-3 sm:w-3.5 sm:h-3.5"
            style={{ color: colors.primaryGreen }}
          />{" "}
          Engine
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent
            className="border-0 p-0 overflow-hidden"
            style={{
              background: colors.darkBg,
              borderTop: `1px solid ${colors.borderColor}`,
            }}
          >
            <DrawerTitle className="sr-only">Share Your Snippet</DrawerTitle>
            <DrawerDescription className="sr-only">
              Generate links and export code images
            </DrawerDescription>
            {shareContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent
            className="w-full max-w-[480px] p-0 overflow-hidden border-0"
            style={{
              background: colors.darkBg,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
            }}
          >
            {shareContent}
          </DialogContent>
        </Dialog>
      )}

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
    </>
  );
};
