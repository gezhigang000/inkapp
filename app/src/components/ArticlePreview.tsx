import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { listen } from "@tauri-apps/api/event";
import { useConfig } from "../hooks/useConfig";

interface ArticlePreviewProps {
  title: string;
  htmlContent: string;
  coverPath?: string;
  articlePath?: string;
  fileType?: string;
  metadataPath?: string;
}

export default function ArticlePreview({ title, htmlContent, coverPath, articlePath, fileType, metadataPath }: ArticlePreviewProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ type: "success" | "error" | "progress"; text: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { getConfig } = useConfig();

  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["target", "rel"],
    ALLOW_DATA_ATTR: true,
  });

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      img.onerror = () => { img.style.display = "none"; };
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

  const handleOpenFolder = async () => {
    if (!metadataPath) return;
    try {
      const dir = metadataPath.replace(/[/\\][^/\\]+$/, "");
      await openPath(dir);
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const handlePublish = async () => {
    const appId = getConfig("WECHAT_APP_ID");
    const appSecret = getConfig("WECHAT_APP_SECRET");
    if (!appId || !appSecret) {
      setPublishMsg({ type: "error", text: "请先在设置页配置微信公众号 AppID 和 AppSecret" });
      return;
    }
    if (!articlePath) {
      setPublishMsg({ type: "error", text: "文章路径不可用" });
      return;
    }

    setPublishing(true);
    setPublishMsg({ type: "progress", text: "正在发布..." });

    let unlisten: (() => void) | null = null;
    try {
      unlisten = await listen<Record<string, unknown>>("sidecar-event", (event) => {
        const d = event.payload;
        if (d.type === "progress" && d.stage === "publish") {
          setPublishMsg({ type: "progress", text: (d.message as string) || "处理中..." });
        }
      });

      await invoke("run_sidecar", {
        commandJson: JSON.stringify({
          action: "publish_wechat",
          app_id: appId,
          app_secret: appSecret,
          article_path: articlePath,
          cover_path: coverPath || "",
          title,
          author: getConfig("WECHAT_AUTHOR") || "Ink",
        }),
      });
      setPublishMsg({ type: "success", text: "已发布到微信公众号草稿箱 ✓" });
    } catch (err) {
      setPublishMsg({ type: "error", text: `发布失败: ${err instanceof Error ? err.message : err}` });
    } finally {
      setPublishing(false);
      unlisten?.();
    }
  };

  const fileTypeLabel: Record<string, string> = {
    docx: "Word 文档",
    xlsx: "Excel 表格",
    pdf: "PDF 文件",
  };

  const hasWechatConfig = !!(getConfig("WECHAT_APP_ID") && getConfig("WECHAT_APP_SECRET"));

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
            {fileType && fileType !== "html" && metadataPath && (
              <button
                onClick={handleOpenFolder}
                className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color] duration-150"
                style={{
                  background: "oklch(0.92 0.05 145)",
                  color: "oklch(0.30 0.08 145)",
                }}
              >
                {fileTypeLabel[fileType] || fileType.toUpperCase()} · 打开目录
              </button>
            )}
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
            {hasWechatConfig && articlePath && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40"
                style={{
                  background: "oklch(0.45 0.15 145)",
                  color: "oklch(1 0 0)",
                }}
              >
                {publishing ? "发布中..." : "发布到公众号"}
              </button>
            )}
          </div>
        </div>
        {publishMsg && (
          <p
            className="text-xs mt-2"
            style={{
              color: publishMsg.type === "success" ? "oklch(0.45 0.1 145)"
                : publishMsg.type === "error" ? "oklch(0.63 0.14 52)"
                : "oklch(0.50 0 0)",
            }}
          >
            {publishMsg.text}
          </p>
        )}
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
