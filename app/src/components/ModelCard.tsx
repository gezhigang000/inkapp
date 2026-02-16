import { useState } from "react";
import type { ModelProvider, SearchProvider } from "../data/model-guides";
import HelpModal from "./HelpModal";

interface ModelCardProps {
  provider: ModelProvider | SearchProvider;
  getConfig: (key: string) => string;
  updateConfig: (key: string, value: string) => void;
}

function isModelProvider(p: ModelProvider | SearchProvider): p is ModelProvider {
  return "apiEndpoint" in p;
}

export default function ModelCard({ provider, getConfig, updateConfig }: ModelCardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const hasApiKey = provider.configKeys.some(
    (ck) => ck.type === "password" && getConfig(ck.key).length > 0
  );

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div
        className="rounded-[14px] p-6 transition-shadow duration-200"
        style={{
          background: "oklch(1 0 0)",
          boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px oklch(0 0 0 / 6%)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px oklch(0 0 0 / 4%)"; }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold" style={{ color: "oklch(0.15 0.005 265)" }}>
                {provider.name}
              </h3>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: hasApiKey ? "oklch(0.55 0.15 145)" : "oklch(0.85 0 0)" }}
                title={hasApiKey ? "已配置" : "未配置"}
              />
            </div>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.50 0 0)" }}>
              {provider.description}
            </p>
          </div>
        </div>

        {isModelProvider(provider) && (
          <p className="text-xs mb-3" style={{ color: "oklch(0.65 0 0)" }}>
            {provider.apiEndpoint}
          </p>
        )}

        <div className="space-y-3">
          {provider.configKeys.map((ck) => (
            <div key={ck.key}>
              <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>
                {ck.label}
              </label>
              <div className="relative">
                <input
                  type={ck.type === "password" && !visibleKeys[ck.key] ? "password" : "text"}
                  value={getConfig(ck.key)}
                  onChange={(e) => updateConfig(ck.key, e.target.value)}
                  placeholder={ck.placeholder}
                  className="w-full px-3 h-9 text-sm rounded-[10px] pr-12 placeholder:text-[oklch(0.50_0_0)]"
                  style={{
                    border: "1px solid oklch(0.91 0 0)",
                    background: "oklch(1 0 0)",
                    color: "oklch(0.15 0.005 265)",
                  }}
                />
                {ck.type === "password" && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(ck.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1 transition-opacity duration-150"
                    style={{ color: "oklch(0.50 0 0)" }}
                  >
                    {visibleKeys[ck.key] ? "隐藏" : "显示"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className="mt-4 text-sm transition-opacity duration-150 hover:opacity-70"
          style={{ color: "oklch(0.30 0.005 265)" }}
        >
          如何获取 Key &rarr;
        </button>
      </div>

      <HelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        providerName={provider.name}
        guide={provider.guide}
      />
    </>
  );
}
