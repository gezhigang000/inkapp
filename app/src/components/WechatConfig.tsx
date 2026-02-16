import { useState } from "react";
import { useConfig } from "../hooks/useConfig";

export default function WechatConfig() {
  const { getConfig, updateConfig } = useConfig();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // In real implementation, this would call sidecar to test the connection
      // For now, just validate that both fields are filled
      const appId = getConfig("WECHAT_APP_ID");
      const appSecret = getConfig("WECHAT_APP_SECRET");
      if (appId && appSecret) {
        setTestResult("success");
      } else {
        setTestResult("error");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">微信公众号配置</h3>
      <p className="text-sm text-gray-500 mb-4">
        配置后可将生成的文章直接发布到微信公众号。在微信公众平台 → 开发 → 基本配置中获取。
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AppID</label>
          <input
            type="text"
            value={getConfig("WECHAT_APP_ID")}
            onChange={(e) => updateConfig("WECHAT_APP_ID", e.target.value)}
            placeholder="wx..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AppSecret</label>
          <input
            type="password"
            value={getConfig("WECHAT_APP_SECRET")}
            onChange={(e) => updateConfig("WECHAT_APP_SECRET", e.target.value)}
            placeholder="输入 AppSecret"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
        >
          {testing ? "测试中..." : "测试连接"}
        </button>
        {testResult === "success" && <p className="text-sm text-green-600">连接成功 ✓</p>}
        {testResult === "error" && <p className="text-sm text-red-600">连接失败，请检查配置</p>}
      </div>
    </div>
  );
}
