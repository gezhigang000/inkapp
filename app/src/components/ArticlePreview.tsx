import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";

interface ArticlePreviewProps {
  title: string;
  htmlContent: string;
  coverPath?: string;
}

export default function ArticlePreview({ title, htmlContent, coverPath }: ArticlePreviewProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["target", "rel"],
    ALLOW_DATA_ATTR: true,
  });

  // Hide broken images gracefully
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      img.onerror = () => {
        img.style.display = "none";
      };
    });
  }, [sanitizedHtml]);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = htmlContent;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleOpenInBrowser = async () => {
    try {
      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{max-width:680px;margin:40px auto;padding:0 20px;}</style>
</head><body>${htmlContent}</body></html>`;
      const path = await invoke<string>("write_temp_html", { content: fullHtml });
      await openPath(path);
    } catch (err) {
      console.error("Failed to open in browser:", err);
    }
  };

  return (
    <div
      className="rounded-[14px] overflow-hidden transition-shadow duration-200"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
      }}
    >
      <div
        className="p-5"
        style={{ borderBottom: "1px solid oklch(0.93 0 0)" }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold truncate flex-1 mr-4"
            style={{ color: "oklch(0.15 0.005 265)" }}
          >
            {title}
          </h3>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyHtml}
              className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color] duration-150"
              style={{
                background: copyFeedback ? "oklch(0.75 0.1 145)" : "oklch(0.965 0 0)",
                color: copyFeedback ? "oklch(1 0 0)" : "oklch(0.30 0.005 265)",
              }}
            >
              {copyFeedback ? "已复制 ✓" : "复制 HTML"}
            </button>
            <button
              onClick={handleOpenInBrowser}
              className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color,opacity] duration-150"
              style={{
                background: "oklch(0.27 0.005 265)",
                color: "oklch(0.98 0.002 90)",
              }}
            >
              在浏览器中打开
            </button>
          </div>
        </div>
      </div>

      {coverPath && (
        <div
          className="p-5"
          style={{
            borderBottom: "1px solid oklch(0.93 0 0)",
            background: "oklch(0.965 0 0)",
          }}
        >
          <p className="text-xs mb-2" style={{ color: "oklch(0.50 0 0)" }}>
            封面图
          </p>
          <img src={convertFileSrc(coverPath)} alt="封面" className="max-h-48 rounded-[10px] object-cover" />
        </div>
      )}

      <div
        ref={contentRef}
        className="p-5 prose prose-sm max-w-none overflow-auto max-h-[600px]"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
