import { createContext, useContext, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SidecarEvent } from "../components/GenerateProgress";

interface GenerateResult {
  title: string;
  htmlContent: string;
  coverPath?: string;
}

interface GenerateContextValue {
  events: SidecarEvent[];
  isRunning: boolean;
  result: GenerateResult | null;
  startGenerate: (payload: Record<string, unknown>) => Promise<void>;
  clearResult: () => void;
}

const GenerateContext = createContext<GenerateContextValue | null>(null);

export function GenerateProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SidecarEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const runningRef = useRef(false);

  const startGenerate = useCallback(async (payload: Record<string, unknown>) => {
    if (runningRef.current) return;
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
          if (data.type === "result" && data.status === "success") {
            readArticleFile(data.article_path || "").then((html) => {
              setResult({
                title: data.title || "未命名文章",
                htmlContent: html,
                coverPath: undefined,
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

  return (
    <GenerateContext value={{ events, isRunning, result, startGenerate, clearResult }}>
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
