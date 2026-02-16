import WechatConfig from "../components/WechatConfig";
import { useConfig } from "../hooks/useConfig";

export default function Settings() {
  const { getConfig, updateConfig } = useConfig();

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      <div className="space-y-6">
        {/* General settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">基本设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认作者名</label>
              <input
                type="text"
                value={getConfig("AUTHOR")}
                onChange={(e) => updateConfig("AUTHOR", e.target.value)}
                placeholder="AI爱好者"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">输出目录</label>
              <input
                type="text"
                value={getConfig("OUTPUT_DIR")}
                onChange={(e) => updateConfig("OUTPUT_DIR", e.target.value)}
                placeholder="~/质取AI/articles"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* WeChat config */}
        <WechatConfig />
      </div>
    </div>
  );
}
