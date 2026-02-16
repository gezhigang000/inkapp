export interface SidecarEvent {
  type: "progress" | "result" | "error";
  stage?: string;
  message?: string;
  percent?: number;
  status?: string;
  article_path?: string;
  title?: string;
  code?: string;
}

interface GenerateProgressProps {
  events: SidecarEvent[];
  isRunning: boolean;
}

export default function GenerateProgress({ events, isRunning }: GenerateProgressProps) {
  const lastProgress = [...events].reverse().find((e) => e.type === "progress");
  const error = [...events].reverse().find((e) => e.type === "error");

  const stage = lastProgress?.stage || lastProgress?.message || "准备中...";
  const percent = lastProgress?.percent;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {isRunning && (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900">
          {isRunning ? stage : "生成完成"}
        </span>
      </div>

      {percent != null && (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            {error.code ? `[${error.code}] ` : ""}生成失败
          </p>
          {error.message && (
            <p className="text-xs text-red-600 mt-1">{error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
