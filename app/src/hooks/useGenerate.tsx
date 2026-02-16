import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SidecarEvent } from "../components/GenerateProgress";
import type { PromptTemplate } from "../data/prompt-templates";

interface ModeParams {
  topic?: string;
  videoUrl?: string;
}

interface GenerateResult {
  title: string;
  htmlContent: string;
  coverPath?: string;
  articlePath?: string;   // 文章 HTML 文件路径
  fileType?: string;       // "html" | "docx" | "xlsx" | "pdf"
  metadataPath?: string;
}

interface GenerateContextValue {
  events: SidecarEvent[];
  isRunning: boolean;
  result: GenerateResult | null;
  selectedTemplate: PromptTemplate | null;
  params: ModeParams;
  setSelectedTemplate: (t: PromptTemplate | null) => void;
  setParams: (params: ModeParams) => void;
  startGenerate: (payload: Record<string, unknown>) => Promise<void>;
  stopGenerate: () => Promise<void>;
  clearResult: () => void;
}

const GenerateContext = createContext<GenerateContextValue | null>(null);

export function GenerateProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SidecarEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [params, setParams] = useState<ModeParams>({});
  const runningRef = useRef(false);

  // Safety: if isRunning is false but ref is stuck true (e.g. HMR, crash), reset it
  useEffect(() => {
    if (!isRunning) runningRef.current = false;
  }, [isRunning]);

  const startGenerate = useCallback(async (payload: Record<string, unknown>) => {
    // Use state check — button is already disabled when running,
    // so this is just a safety net for rapid double-clicks.
    if (runningRef.current) {
      console.warn("[useGenerate] startGenerate called while already running, ignoring");
      return;
    }
    runningRef.current = true;

    setEvents([]);
    setResult(null);
    setIsRunning(true);

    let unlisten: (() => void) | null = null;
    try {
      unlisten = await listen<SidecarEvent>(
        "sidecar-event",
        (event) => {
          const data = event.payload;
          setEvents((prev) => [...prev, data]);
          if (data.type === "result" && data.status === "success" && data.article_path) {
            readArticleFile(data.article_path || "").then((html) => {
              setResult({
                title: data.title || "未命名文章",
                htmlContent: html,
                coverPath: undefined,
                articlePath: data.article_path as string || undefined,
                fileType: (data.file_type as string) || "html",
                metadataPath: (data.metadata_path as string) || undefined,
              });
            });
          }
        }
      );

      await invoke("run_sidecar", {
        commandJson: JSON.stringify(payload),
      });
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error" as const,
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setIsRunning(false);
      runningRef.current = false;
      unlisten?.();
    }
  }, []);

  const clearResult = useCallback(() => {
    setEvents([]);
    setResult(null);
  }, []);

  const stopGenerate = useCallback(async () => {
    try {
      await invoke("stop_sidecar");
      setEvents((prev) => [...prev, { type: "progress", stage: "log", message: "已手动中断" }]);
    } catch (err) {
      console.error("Failed to stop sidecar:", err);
    }
  }, []);

  return (
    <GenerateContext value={{ events, isRunning, result, selectedTemplate, params, setSelectedTemplate, setParams, startGenerate, stopGenerate, clearResult }}>
      {children}
    </GenerateContext>
  );
}

export function useGenerate() {
  const ctx = useContext(GenerateContext);
  if (!ctx) throw new Error("useGenerate must be used within GenerateProvider");
  return ctx;
}

async function readArticleFile(filePath: string): Promise<string> {
  if (!filePath) return "<p>文章路径为空</p>";
  try {
    const result = await invoke<string>("run_sidecar", {
      commandJson: JSON.stringify({ action: "read_file", path: filePath }),
    });
    for (const line of result.split("\n")) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "result" && parsed.content) return parsed.content;
      } catch { /* skip */ }
    }
    return "<p>无法读取文章内容</p>";
  } catch {
    return "<p>读取文章失败</p>";
  }
}
