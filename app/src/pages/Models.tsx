import { MODEL_PROVIDERS, SEARCH_PROVIDERS } from "../data/model-guides";
import { useConfig } from "../hooks/useConfig";
import ModelCard from "../components/ModelCard";

export default function Models() {
  const { getConfig, updateConfig } = useConfig();

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">模型配置</h1>
      <p className="text-gray-500 mb-6">
        配置至少一个大模型的 API Key 即可开始使用。所有 Key 仅保存在本地。
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">大语言模型</h2>
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">搜索服务</h2>
        <p className="text-sm text-gray-500 mb-4">
          配置搜索服务后，创作时可自动联网搜索最新资料。
        </p>
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
