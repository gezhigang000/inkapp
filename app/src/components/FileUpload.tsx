import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface UploadedFile {
  path: string;
  name: string;
  extractedText?: string;
  chars?: number;
  error?: string;
  extracting?: boolean;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const SUPPORTED_EXTENSIONS = ["xlsx", "xls", "pdf", "docx", "doc", "txt", "md", "csv"];

export type { UploadedFile };

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const [extracting, setExtracting] = useState(false);

  const handlePickFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "文档",
          extensions: SUPPORTED_EXTENSIONS,
        },
      ],
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const newFiles: UploadedFile[] = paths
      .filter((p) => !files.some((f) => f.path === p))
      .map((p) => ({
        path: p,
        name: p.split("/").pop() || p,
        extracting: true,
      }));

    if (newFiles.length === 0) return;

    const updated = [...files, ...newFiles];
    onFilesChange(updated);

    // 提取文件内容
    setExtracting(true);
    try {
      const result = await invoke<string>("run_sidecar", {
        commandJson: JSON.stringify({
          action: "extract_files",
          file_paths: newFiles.map((f) => f.path),
        }),
      });

      for (const line of result.split("\n")) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "result" && parsed.files) {
            onFilesChange(
              updated.map((f) => {
                const extracted = parsed.files.find(
                  (r: Record<string, string>) => r.path === f.path
                );
                if (!extracted) return f;
                return {
                  ...f,
                  extracting: false,
                  extractedText: extracted.text,
                  chars: extracted.chars,
                  error: extracted.error,
                };
              })
            );
          }
        } catch { /* skip */ }
      }
    } catch {
      onFilesChange(
        updated.map((f) =>
          f.extracting ? { ...f, extracting: false, error: "提取失败" } : f
        )
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleRemove = (path: string) => {
    onFilesChange(files.filter((f) => f.path !== path));
  };

  const totalChars = files.reduce((sum, f) => sum + (f.chars || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          参考资料（可选）
        </label>
        {totalChars > 0 && (
          <span className="text-xs text-gray-400">
            已提取 {(totalChars / 1000).toFixed(1)}k 字符
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handlePickFiles}
        disabled={extracting}
        className="w-full py-3 border-2 border-dashed border-gray-300
          rounded-lg text-sm text-gray-500 hover:border-blue-400
          hover:text-blue-500 transition-colors disabled:opacity-50"
      >
        {extracting ? "正在解析文件..." : "点击选择文件（Excel / PDF / Word / TXT）"}
      </button>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f) => (
            <div
              key={f.path}
              className="flex items-center justify-between px-3 py-2
                bg-gray-50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base">
                  {f.name.endsWith(".pdf")
                    ? "📕"
                    : f.name.match(/\.xlsx?$/)
                      ? "📊"
                      : f.name.match(/\.docx?$/)
                        ? "📝"
                        : "📄"}
                </span>
                <span className="truncate text-gray-700">{f.name}</span>
                {f.extracting && (
                  <span className="text-xs text-blue-500">解析中...</span>
                )}
                {f.chars && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {(f.chars / 1000).toFixed(1)}k 字
                  </span>
                )}
                {f.error && (
                  <span className="text-xs text-red-500 shrink-0">
                    {f.error}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemove(f.path)}
                className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
