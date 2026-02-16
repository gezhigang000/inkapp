import { useState } from "react";
import { MODEL_PROVIDERS, SEARCH_PROVIDERS } from "../data/model-guides";
import { useConfig } from "../hooks/useConfig";
import ModelCard from "../components/ModelCard";

export default function Models() {
  const { getConfig, updateConfig } = useConfig();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "oklch(0.15 0.005 265)" }}
        >
          模型配置
        </h1>
        <button
          onClick={handleSave}
          className="px-5 h-9 text-sm font-medium rounded-[10px] transition-[background-color,opacity] duration-150"
          style={{
            background: saved ? "oklch(0.40 0.005 265)" : "oklch(0.27 0.005 265)",
            color: "oklch(0.98 0.002 90)",
          }}
        >
          {saved ? "已保存 ✓" : "保存配置"}
        </button>
      </div>
      <p className="mb-6" style={{ color: "oklch(0.50 0 0)", fontSize: 14 }}>
        配置至少一个大模型的 API Key 即可开始使用。所有 Key 仅保存在本地。
      </p>

      <section className="mb-10">
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "oklch(0.18 0.005 265)" }}
        >
          大语言模型
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MODEL_PROVIDERS.map((p) => (
            <ModelCard
              key={p.id}
              provider={p}
              getConfig={getConfig}
              updateConfig={updateConfig}
            />
          ))}
        </div>
      </section>

      <section>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "oklch(0.18 0.005 265)" }}
        >
          搜索服务
        </h2>
        <p className="text-sm mb-4" style={{ color: "oklch(0.50 0 0)" }}>
          配置搜索服务后，创作时可自动联网搜索最新资料。
        </p>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm" style={{ color: "oklch(0.30 0.005 265)" }}>
            默认搜索引擎
          </label>
          <select
            value={getConfig("SEARCH_PROVIDER") || "auto"}
            onChange={(e) => updateConfig("SEARCH_PROVIDER", e.target.value)}
            className="px-3 h-8 text-sm rounded-[10px]"
            style={{ border: "1px solid oklch(0.91 0 0)", background: "oklch(1 0 0)", color: "oklch(0.15 0.005 265)" }}
          >
            <option value="auto">自动（优先 Tavily）</option>
            <option value="tavily">Tavily</option>
            <option value="serpapi">SerpAPI</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SEARCH_PROVIDERS.map((p) => (
            <ModelCard
              key={p.id}
              provider={p}
              getConfig={getConfig}
              updateConfig={updateConfig}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
