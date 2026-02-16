import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useConfig } from "../hooks/useConfig";
import { MODEL_PROVIDERS } from "../data/model-guides";
import ModeSelector from "../components/ModeSelector";
import type { ModeParams } from "../components/ModeSelector";
import GenerateProgress from "../components/GenerateProgress";
import type { SidecarEvent } from "../components/GenerateProgress";
import ArticlePreview from "../components/ArticlePreview";

type Mode = "daily" | "topic" | "video";

export default function Create() {
  const { config, getConfig } = useConfig();
  const [selectedProvider, setSelectedProvider] = useState(
    () => getConfig("selected_provider") || "deepseek"
  );
  const [mode, setMode] = useState<Mode>("daily");
  const [params, setParams] = useState<ModeParams>({});
  const [events, setEvents] = useState<SidecarEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    htmlContent: string;
    coverPath?: string;
  } | null>(null);

  const canGenerate = useCallback(() => {
    if (isRunning) return false;
    if (mode === "topic" && !params.topic?.trim()) return false;
    if (mode === "video" && !params.videoUrl?.trim()) return false;
    return true;
  }, [isRunning, mode, params]);

  const handleGenerate = async () => {
    setEvents([]);
    setResult(null);
    setIsRunning(true);

    try {
      const unlisten = await listen<SidecarEvent>(
        "sidecar-event",
        (event) => {
          const data = event.payload;
          setEvents((prev) => [...prev, data]);
          if (data.type === "result") {
            setResult({
              title: data.title || "未命名文章",
              htmlContent: data.article_path || "",
              coverPath: undefined,
            });
          }
          if (data.type === "error" || data.type === "result") {
            setIsRunning(false);
          }
        }
      );

      await invoke("run_sidecar", {
        commandJson: JSON.stringify({
          action: "generate",
          mode,
          topic: params.topic || undefined,
          video_url: params.videoUrl || undefined,
          provider: selectedProvider,
          ...config,
        }),
      });

      unlisten();
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error" as const,
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
      setIsRunning(false);
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
