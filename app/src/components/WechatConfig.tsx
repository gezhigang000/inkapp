import { useState } from "react";
import { useConfig } from "../hooks/useConfig";

export default function WechatConfig() {
  const { getConfig, updateConfig } = useConfig();
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: "success" | "error" | "ip"; text: string } | null>(null);
  const [ipCopied, setIpCopied] = useState(false);

  const handleTest = async () => {
    const appId = getConfig("WECHAT_APP_ID");
    const appSecret = getConfig("WECHAT_APP_SECRET");
    if (!appId || !appSecret) {
      setTestMsg({ type: "error", text: "请先填写 AppID 和 AppSecret" });
      return;
    }
    setTesting(true);
    setTestMsg(null);
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.access_token) {
        setTestMsg({ type: "success", text: "连接成功，access_token 获取正常 ✓" });
      } else if (data.errcode === 40164) {
        // IP 不在白名单，从错误信息中提取真实 IP
        const ipMatch = data.errmsg?.match(/invalid ip (\d+\.\d+\.\d+\.\d+)/);
        const realIp = ipMatch?.[1] || "未知";
        setTestMsg({
          type: "ip",
          text: `当前出口 IP: ${realIp}（未在白名单中，请添加到微信公众平台 → 基本配置 → IP 白名单）`,
        });
      } else {
        setTestMsg({ type: "error", text: `错误 ${data.errcode}: ${data.errmsg}` });
      }
    } catch (e) {
      setTestMsg({ type: "error", text: `请求失败: ${e instanceof Error ? e.message : e}` });
    } finally {
      setTesting(false);
    }
  };

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setIpCopied(true);
    setTimeout(() => setIpCopied(false), 2000);
  };

  const inputStyle = {
    border: "1px solid oklch(0.91 0 0)",
    background: "oklch(1 0 0)",
    color: "oklch(0.15 0.005 265)",
  };

  // 从测试结果中提取 IP（用于复制按钮）
  const detectedIp = testMsg?.type === "ip" ? testMsg.text.match(/IP: (\d+\.\d+\.\d+\.\d+)/)?.[1] : null;

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
        {testMsg?.type === "success" && (
          <p className="text-sm" style={{ color: "oklch(0.45 0.1 145)" }}>
            {testMsg.text}
          </p>
        )}
        {testMsg?.type === "error" && (
          <p className="text-sm" style={{ color: "oklch(0.63 0.14 52)" }}>
            {testMsg.text}
          </p>
        )}
        {testMsg?.type === "ip" && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm"
            style={{ background: "oklch(0.97 0.01 80)", border: "1px solid oklch(0.88 0.05 80)" }}
          >
            <span style={{ color: "oklch(0.40 0.08 60)" }}>{testMsg.text}</span>
            {detectedIp && (
              <button
                onClick={() => copyIp(detectedIp)}
                className="ml-auto shrink-0 px-2 py-0.5 text-xs rounded-md cursor-pointer"
                style={{
                  background: ipCopied ? "oklch(0.45 0.1 145)" : "oklch(0.27 0.005 265)",
                  color: "oklch(0.98 0.002 90)",
                }}
              >
                {ipCopied ? "已复制 ✓" : "复制 IP"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
