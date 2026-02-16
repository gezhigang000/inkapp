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

  const inputStyle = {
    border: "1px solid oklch(0.91 0 0)",
    background: "oklch(1 0 0)",
    color: "oklch(0.15 0.005 265)",
  };

  return (
    <div
      className="rounded-[14px] p-6 transition-shadow duration-200"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
      }}
    >
      <h3
        className="text-base font-semibold mb-4"
        style={{ color: "oklch(0.15 0.005 265)" }}
      >
        微信公众号配置
      </h3>
      <p className="text-sm mb-4" style={{ color: "oklch(0.50 0 0)" }}>
        配置后可将创作的文章直接发布到微信公众号。在微信公众平台 → 开发 → 基本配置中获取。
      </p>
      <div className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "oklch(0.30 0.005 265)" }}
          >
            AppID
          </label>
          <input
            type="text"
            value={getConfig("WECHAT_APP_ID")}
            onChange={(e) => updateConfig("WECHAT_APP_ID", e.target.value)}
            placeholder="wx..."
            className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "oklch(0.30 0.005 265)" }}
          >
            AppSecret
          </label>
          <input
            type="password"
            value={getConfig("WECHAT_APP_SECRET")}
            onChange={(e) => updateConfig("WECHAT_APP_SECRET", e.target.value)}
            placeholder="输入 AppSecret"
            className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-5 h-9 text-sm font-medium rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40 cursor-pointer"
          style={{
            background: "oklch(0.27 0.005 265)",
            color: "oklch(0.98 0.002 90)",
          }}
        >
          {testing ? "测试中..." : "测试连接"}
        </button>
        {testResult === "success" && (
          <p className="text-sm" style={{ color: "oklch(0.40 0.005 265)" }}>
            连接成功 ✓
          </p>
        )}
        {testResult === "error" && (
          <p className="text-sm" style={{ color: "oklch(0.63 0.14 52)" }}>
            连接失败，请检查配置
          </p>
        )}
      </div>
    </div>
  );
}
