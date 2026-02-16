import { useState } from "react";
import type { ArticleMeta } from "./ArticleList";

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

  const handlePreview = () => {
    if (article.articlePath) {
      window.open(article.articlePath, "_blank");
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(
        `<article>${article.title}</article>`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  };

  const handleOpenFolder = async () => {
    try {
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
      if (article.articlePath) await revealItemInDir(article.articlePath);
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

  return (
    <div className="bg-white rounded-xl border border-gray-200
      p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900
          line-clamp-2 leading-snug flex-1 mr-3">
          {article.title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600
            text-lg leading-none shrink-0 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{article.date}</p>
      <div className="flex flex-col gap-2">
        <button
          onClick={handlePreview}
          disabled={!article.articlePath}
          className="w-full px-4 py-2 text-sm rounded-lg
            bg-blue-600 text-white hover:bg-blue-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer"
        >
          预览
        </button>
        <button
          onClick={handleCopyHtml}
          className="w-full px-4 py-2 text-sm rounded-lg
            border border-gray-200 text-gray-700
            hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {copied ? "已复制 ✓" : "复制 HTML"}
        </button>
        <button
          onClick={handleOpenFolder}
          disabled={!article.articlePath}
          className="w-full px-4 py-2 text-sm rounded-lg
            border border-gray-200 text-gray-700
            hover:bg-gray-50 disabled:opacity-40
            disabled:cursor-not-allowed transition-colors
            cursor-pointer"
        >
          打开文件夹
        </button>
        <button
          onClick={handleDelete}
          className={`w-full px-4 py-2 text-sm rounded-lg
            transition-colors cursor-pointer ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-red-200 text-red-600 hover:bg-red-50"
            }`}
        >
          {confirmDelete ? "确认删除？" : "删除"}
        </button>
      </div>
    </div>
  );
}
