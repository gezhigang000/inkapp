import { useEffect, useRef } from "react";

export interface SidecarEvent {
  type: "progress" | "result" | "error";
  stage?: string;
  message?: string;
  percent?: number;
  status?: string;
  article_path?: string;
  title?: string;
  code?: string;
  // Agent 模式扩展字段
  file_type?: string;
  metadata_path?: string;
  article_count?: number;
  [key: string]: unknown;
}

interface GenerateProgressProps {
  events: SidecarEvent[];
  isRunning: boolean;
}

export default function GenerateProgress({ events, isRunning }: GenerateProgressProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const lastProgress = [...events].reverse().find((e) => e.type === "progress");
  const error = [...events].reverse().find((e) => e.type === "error");
  const percent = lastProgress?.percent;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      className="rounded-[14px] p-4 transition-shadow duration-200"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
      }}
    >
      {percent != null && (
        <div
          className="w-full rounded-full h-1.5 mb-3"
          style={{ background: "oklch(0.93 0 0)" }}
        >
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(percent, 100)}%`,
              background: "oklch(0.27 0.005 265)",
            }}
          />
        </div>
      )}

      <div
        ref={logRef}
        className="rounded-[10px] p-3 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto"
        style={{
          background: "oklch(0.15 0.005 265)",
          color: "oklch(0.70 0 0)",
        }}
      >
        {events.map((e, i) => {
          const isAgent = e.stage === "agent";
          const isError = e.type === "error";
          const lineColor = isError
            ? "oklch(0.63 0.14 52)"
            : isAgent
              ? "oklch(0.72 0.10 200)"
              : undefined;
          return (
            <div key={i} style={lineColor ? { color: lineColor } : undefined}>
              <span style={{ color: "oklch(0.45 0 0)", userSelect: "none" }}>
                {String(i + 1).padStart(2, "0")}{" "}
              </span>
              {isError && "[ERROR] "}
              {isAgent && !isError && "⚡ "}
              {e.message || e.stage || "..."}
            </div>
          );
        })}
        {isRunning && (
          <div className="animate-pulse" style={{ color: "oklch(0.60 0 0)" }}>
            <span style={{ color: "oklch(0.45 0 0)", userSelect: "none" }}>
              {String(events.length + 1).padStart(2, "0")}{" "}
            </span>
            处理中...
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-3 p-3 rounded-[10px]"
          style={{
            background: "oklch(0.97 0.01 52)",
            border: "1px solid oklch(0.90 0.04 52)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "oklch(0.45 0.12 52)" }}
          >
            {error.code ? `[${error.code}] ` : ""}创作失败
          </p>
          {error.message && (
            <p
              className="text-xs mt-1"
              style={{ color: "oklch(0.50 0.10 52)" }}
            >
              {error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
