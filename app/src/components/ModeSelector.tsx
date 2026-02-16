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
  {
    id: "daily" as const,
    label: "日报模式",
    icon: "📰",
    desc: "自动搜索 AI 行业最新动态，生成深度分析文章",
  },
  {
    id: "topic" as const,
    label: "深度研究",
    icon: "🔬",
    desc: "针对特定主题进行深度研究和分析",
  },
  {
    id: "video" as const,
    label: "视频分析",
    icon: "🎬",
    desc: "分析 YouTube 视频内容，生成深度解读文章",
  },
];

export default function ModeSelector({
  mode,
  onModeChange,
  params,
  onParamsChange,
}: ModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === m.id
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="font-semibold text-gray-900 text-sm">{m.label}</div>
            <div className="text-xs text-gray-500 mt-1 leading-relaxed">{m.desc}</div>
          </button>
        ))}
      </div>

      {mode === "daily" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            关注方向（可选）
          </label>
          <input
            type="text"
            value={params.topic || ""}
            onChange={(e) => onParamsChange({ ...params, topic: e.target.value })}
            placeholder="留空则自动选题"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {mode === "topic" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            主题关键词 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={params.topic || ""}
            onChange={(e) => onParamsChange({ ...params, topic: e.target.value })}
            placeholder="输入要研究的主题关键词"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {mode === "video" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube 链接 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={params.videoUrl || ""}
            onChange={(e) => onParamsChange({ ...params, videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );
}

export type { ModeParams };