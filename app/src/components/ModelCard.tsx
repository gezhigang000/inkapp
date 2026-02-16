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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{provider.name}</h3>
              <span
                className={`w-2 h-2 rounded-full ${hasApiKey ? "bg-green-500" : "bg-gray-300"}`}
                title={hasApiKey ? "已配置" : "未配置"}
              />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{provider.description}</p>
          </div>
        </div>

        {isModelProvider(provider) && (
          <p className="text-xs text-gray-400 mb-3">Endpoint: {provider.apiEndpoint}</p>
        )}

        <div className="space-y-3">
          {provider.configKeys.map((ck) => (
            <div key={ck.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ck.label}</label>
              <div className="relative">
                <input
                  type={ck.type === "password" && !visibleKeys[ck.key] ? "password" : "text"}
                  value={getConfig(ck.key)}
                  onChange={(e) => updateConfig(ck.key, e.target.value)}
                  placeholder={ck.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                {ck.type === "password" && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(ck.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1"
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
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors"
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
