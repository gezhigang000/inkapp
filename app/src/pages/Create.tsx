import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useConfig } from "../hooks/useConfig";
import { MODEL_PROVIDERS } from "../data/model-guides";
import ModeSelector from "../components/ModeSelector";
import type { ModeParams } from "../components/ModeSelector";
import GenerateProgress from "../components/GenerateProgress";
import type { SidecarEvent } from "../components/GenerateProgress";
import ArticlePreview from "../components/ArticlePreview";
import FileUpload from "../components/FileUpload";
import type { UploadedFile } from "../components/FileUpload";

type Mode = "daily" | "topic" | "video";

export default function Create() {
  const { getConfig } = useConfig();
  const [selectedProvider, setSelectedProvider] = useState(
    () => getConfig("selected_provider") || "deepseek"
  );
  const [mode, setMode] = useState<Mode>("daily");
  const [params, setParams] = useState<ModeParams>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [events, setEvents] = useState<SidecarEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    htmlContent: string;
    coverPath?: string;
  } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  // 组件卸载时清理事件监听
  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const canGenerate = useCallback(() => {
    if (isRunning) return false;
    if (mode === "topic" && !params.topic?.trim()) return false;
    if (mode === "video" && !params.videoUrl?.trim()) return false;
    return true;
  }, [isRunning, mode, params]);

  // 获取当前 provider 需要的 Key
  const getProviderKeyName = (providerId: string): string | undefined => {
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return undefined;
    const pwdKey = provider.configKeys.find((ck) => ck.type === "password");
    return pwdKey?.key;
  };

  const handleGenerate = async () => {
    // 校验 API Key 已配置
    const keyName = getProviderKeyName(selectedProvider);
    if (keyName && !getConfig(keyName)) {
      setEvents([
        {
          type: "error",
          message: `请先在「模型配置」页面配置 ${selectedProvider} 的 API Key`,
        },
      ]);
      return;
    }

    setEvents([]);
    setResult(null);
    setIsRunning(true);

    try {
      const unlisten = await listen<SidecarEvent>(
        "sidecar-event",
        (event) => {
          const data = event.payload;
          setEvents((prev) => [...prev, data]);
          if (data.type === "result" && data.status === "success") {
            // 读取生成的文章文件内容
            readArticleFile(data.article_path || "").then((html) => {
              setResult({
                title: data.title || "未命名文章",
                htmlContent: html,
                coverPath: undefined,
              });
            });
          }
          if (data.type === "error" || data.type === "result") {
            setIsRunning(false);
          }
        }
      );
      unlistenRef.current = unlisten;

      // 只传当前 provider 相关的 Key
      const payload: Record<string, unknown> = {
        action: "generate",
        mode,
        topic: params.topic || undefined,
        video_url: params.videoUrl || undefined,
        provider: selectedProvider,
      };
      if (keyName) {
        payload[keyName] = getConfig(keyName);
      }
      // 附加上传文件的提取内容
      const fileTexts = uploadedFiles
        .filter((f) => f.extractedText)
        .map((f) => `=== ${f.name} ===\n${f.extractedText}`)
        .join("\n\n");
      if (fileTexts) {
        payload.file_contents = fileTexts;
      }

      await invoke("run_sidecar", {
        commandJson: JSON.stringify(payload),
      });

      unlisten();
      unlistenRef.current = null;
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error" as const,
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
      setIsRunning(false);
      unlistenRef.current?.();
      unlistenRef.current = null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">创作</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择模型
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:border-transparent bg-white"
        >
          {MODEL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - {p.description}
            </option>
          ))}
        </select>
      </div>

      <ModeSelector
        mode={mode}
        onModeChange={setMode}
        params={params}
        onParamsChange={setParams}
      />

      <FileUpload files={uploadedFiles} onFilesChange={setUploadedFiles} />

      <button
        onClick={handleGenerate}
        disabled={!canGenerate()}
        className="w-full py-3 px-4 text-sm font-semibold text-white
          bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
          disabled:cursor-not-allowed rounded-xl transition-colors"
      >
        {isRunning ? "生成中..." : "开始生成"}
      </button>

      {events.length > 0 && (
        <GenerateProgress events={events} isRunning={isRunning} />
      )}

      {result && (
        <ArticlePreview
          title={result.title}
          htmlContent={result.htmlContent}
          coverPath={result.coverPath}
        />
      )}
    </div>
  );
}

async function readArticleFile(filePath: string): Promise<string> {
  if (!filePath) return "<p>文章路径为空</p>";
  try {
    const result = await invoke<string>("run_sidecar", {
      commandJson: JSON.stringify({
        action: "read_file",
        path: filePath,
      }),
    });
    // 从 JSON Lines 输出中提取 content
    for (const line of result.split("\n")) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "result" && parsed.content) return parsed.content;
      } catch { /* skip non-JSON lines */ }
    }
    return "<p>无法读取文章内容</p>";
  } catch {
    return "<p>读取文章失败</p>";
  }
}
