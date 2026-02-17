import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ArticleMeta } from "./ArticleList";
import { useConfig } from "../hooks/useConfig";

interface ArticleActionsProps {
  article: ArticleMeta;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ArticleActions({
  article,
  onDelete,
  onClose,
}: ArticleActionsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");
  const { getConfig } = useConfig();

  const readArticleHtml = async (): Promise<string | null> => {
    if (!article.articlePath) return null;
    try {
      const result = await invoke<string>("run_sidecar", {
        commandJson: JSON.stringify({
          action: "read_file",
          path: article.articlePath,
        }),
      });
      for (const line of result.split("\n")) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "result" && parsed.content) return parsed.content;
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    return null;
  };

  const handlePreview = async () => {
    const html = await readArticleHtml();
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const handleCopyHtml = async () => {
    const html = await readArticleHtml();
    if (html) {
      try {
        await navigator.clipboard.writeText(html);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* clipboard API may fail */ }
    }
  };

  const handleOpenFolder = async () => {
    try {
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
      const targetPath = article.convertedPath || article.articlePath;
      if (targetPath) await revealItemInDir(targetPath);
    } catch {
      // fallback: do nothing if not in Tauri
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(article.id);
    setConfirmDelete(false);
  };

  const handlePublish = async () => {
    const appId = getConfig("WECHAT_APP_ID");
    const appSecret = getConfig("WECHAT_APP_SECRET");
    if (!appId || !appSecret || !article.articlePath) return;
    setPublishing(true);
    setPublishMsg("发布中...");
    let unlisten: (() => void) | null = null;
    let hasError = false;
    let errorMsg = "";
    try {
      unlisten = await listen<Record<string, unknown>>("sidecar-event", (event) => {
        const d = event.payload;
        if (d.type === "progress" && d.stage === "publish") {
          setPublishMsg((d.message as string) || "处理中...");
        }
        if (d.type === "error") {
          hasError = true;
          errorMsg = (d.message as string) || "发布失败";
        }
        if (d.type === "result" && d.status === "success") {
          hasError = false;
        }
      });
      await invoke("run_sidecar", {
        commandJson: JSON.stringify({
          action: "publish_wechat",
          app_id: appId,
          app_secret: appSecret,
          article_path: article.articlePath,
          cover_path: article.coverPath || "",
          title: article.title,
          author: getConfig("WECHAT_AUTHOR") || "Ink",
        }),
      });
      if (hasError) {
        setPublishMsg(`失败: ${errorMsg}`);
      } else {
        setPublishMsg("已发布到草稿箱 ✓");
      }
    } catch (err) {
      setPublishMsg(`失败: ${err instanceof Error ? err.message : err}`);
    } finally {
      setPublishing(false);
      unlisten?.();
    }
  };

  const hasWechatConfig = !!(getConfig("WECHAT_APP_ID") && getConfig("WECHAT_APP_SECRET"));

  const btnOutline = {
    border: "1px solid oklch(0.91 0 0)",
    color: "oklch(0.30 0.005 265)",
    background: "transparent",
  };

  return (
    <div
      className="rounded-[14px] p-5 transition-shadow duration-200"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <h3
          className="text-base font-semibold line-clamp-2 leading-snug flex-1 mr-3"
          style={{ color: "oklch(0.15 0.005 265)" }}
        >
          {article.title}
        </h3>
        <button
          onClick={onClose}
          className="text-lg leading-none shrink-0 cursor-pointer transition-opacity duration-150 hover:opacity-60"
          style={{ color: "oklch(0.50 0 0)" }}
        >
          ✕
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: "oklch(0.50 0 0)" }}>
        {article.date}
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={handlePreview}
          disabled={!article.articlePath}
          className="w-full px-4 h-9 text-sm rounded-[10px] font-medium transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: "oklch(0.27 0.005 265)",
            color: "oklch(0.98 0.002 90)",
          }}
        >
          预览
        </button>
        <button
          onClick={handleCopyHtml}
          disabled={!article.articlePath}
          className="w-full px-4 h-9 text-sm rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={btnOutline}
        >
          {copied ? "已复制 ✓" : "复制 HTML"}
        </button>
        <button
          onClick={handleOpenFolder}
          disabled={!article.articlePath}
          className="w-full px-4 h-9 text-sm rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={btnOutline}
        >
          打开文件夹{article.fileType && article.fileType !== "html" ? `（${article.fileType.toUpperCase()}）` : ""}
        </button>
        {hasWechatConfig && article.articlePath && article.status !== "published" && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full px-4 h-9 text-sm rounded-[10px] font-medium transition-[background-color,opacity] duration-150 disabled:opacity-40 cursor-pointer"
            style={{
              background: "oklch(0.45 0.15 145)",
              color: "oklch(1 0 0)",
            }}
          >
            {publishing ? publishMsg : "发布到公众号"}
          </button>
        )}
        {publishMsg && !publishing && publishMsg !== "" && (
          <p className="text-xs text-center" style={{ color: publishMsg.includes("✓") ? "oklch(0.45 0.1 145)" : "oklch(0.63 0.14 52)" }}>
            {publishMsg}
          </p>
        )}
        <button
          onClick={handleDelete}
          className="w-full px-4 h-9 text-sm rounded-[10px] transition-[background-color,opacity] duration-150 cursor-pointer"
          style={
            confirmDelete
              ? { background: "oklch(0.63 0.14 52)", color: "oklch(0.98 0.002 90)" }
              : { border: "1px solid oklch(0.63 0.14 52)", color: "oklch(0.63 0.14 52)", background: "transparent" }
          }
        >
          {confirmDelete ? "确认删除？" : "删除"}
        </button>
      </div>
    </div>
  );
}
