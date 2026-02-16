interface ModeParams {
  topic?: string;
  videoUrl?: string;
}

interface ModeSelectorProps {
  mode: "daily" | "topic" | "video";
  onModeChange: (mode: "daily" | "topic" | "video") => void;
  params: ModeParams;
  onParamsChange: (params: ModeParams) => void;
}

const MODES = [
  { id: "topic" as const, label: "深度研究", desc: "针对特定主题进行深度研究和分析" },
  { id: "daily" as const, label: "日报模式", desc: "搜索行业最新动态创作日报" },
  { id: "video" as const, label: "视频分析", desc: "分析在线视频内容创作文章" },
];

const inputStyle = {
  border: "1px solid oklch(0.91 0 0)",
  background: "oklch(1 0 0)",
  color: "oklch(0.15 0.005 265)",
};

export default function ModeSelector({ mode, onModeChange, params, onParamsChange }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className="flex-1 px-3 py-2.5 rounded-[10px] text-left transition-[background-color,box-shadow] duration-150"
            style={{
              background: mode === m.id ? "oklch(0.40 0.005 265)" : "transparent",
              boxShadow: mode === m.id ? "0 1px 2px oklch(0 0 0 / 4%)" : "none",
              color: mode === m.id ? "oklch(0.97 0 0)" : "oklch(0.50 0 0)",
            }}
          >
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-xs mt-0.5 opacity-60">{m.desc}</div>
          </button>
        ))}
      </div>

      {mode === "daily" && (
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "oklch(0.30 0.005 265)" }}
          >
            行业 / 主题 <span style={{ color: "oklch(0.63 0.14 52)" }}>*</span>
          </label>
          <input
            type="text"
            value={params.topic || ""}
            onChange={(e) => onParamsChange({ ...params, topic: e.target.value })}
            placeholder="例如：AI、新能源、半导体、医疗健康..."
            className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
            style={inputStyle}
          />
        </div>
      )}

      {mode === "topic" && (
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "oklch(0.30 0.005 265)" }}
          >
            研究主题 <span style={{ color: "oklch(0.63 0.14 52)" }}>*</span>
          </label>
          <input
            type="text"
            value={params.topic || ""}
            onChange={(e) => onParamsChange({ ...params, topic: e.target.value })}
            placeholder="输入要深度研究的主题关键词"
            className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
            style={inputStyle}
          />
        </div>
      )}

      {mode === "video" && (
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "oklch(0.30 0.005 265)" }}
          >
            视频链接 <span style={{ color: "oklch(0.63 0.14 52)" }}>*</span>
          </label>
          <input
            type="text"
            value={params.videoUrl || ""}
            onChange={(e) => onParamsChange({ ...params, videoUrl: e.target.value })}
            placeholder="支持 YouTube、Bilibili 等视频链接"
            className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

export type { ModeParams };
