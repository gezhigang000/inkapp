import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function Logs() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [logDir, setLogDir] = useState("");
  const preRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async (lines = 200) => {
    setLoading(true);
    try {
      const result = await invoke<{ content: string; log_dir: string }>("read_logs", { lines });
      setContent(result.content || "暂无日志");
      if (result.log_dir) setLogDir(result.log_dir);
    } catch (err) {
      setContent(`读取日志失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-semibold" style={{ color: "oklch(0.15 0.005 265)" }}>运行日志</h1>
        {logDir && <span className="text-xs" style={{ color: "oklch(0.55 0 0)" }}>{logDir}</span>}
        <div className="flex-1" />
        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          className="px-3 h-8 text-sm rounded-[10px] transition-all duration-150 disabled:opacity-40"
          style={{ border: "1px solid oklch(0.91 0 0)", color: "oklch(0.40 0.005 265)" }}
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>
      <pre
        ref={preRef}
        className="flex-1 overflow-auto rounded-[10px] p-4 text-xs leading-relaxed"
        style={{
          background: "oklch(0.16 0.005 265)",
          color: "oklch(0.75 0.02 145)",
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {content || "暂无日志"}
      </pre>
    </div>
  );
}
