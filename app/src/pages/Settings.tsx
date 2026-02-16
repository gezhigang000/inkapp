import { open } from "@tauri-apps/plugin-dialog";
import WechatConfig from "../components/WechatConfig";
import ArticleTemplates from "../components/ArticleTemplates";
import { useConfig } from "../hooks/useConfig";

export default function Settings() {
  const { getConfig, updateConfig } = useConfig();

  const pickDirectory = async () => {
    const selected = await open({ directory: true, title: "选择输出目录" });
    if (selected && typeof selected === "string") {
      updateConfig("OUTPUT_DIR", selected);
    }
  };

  return (
    <div className="p-6" style={{ maxWidth: 480 }}>
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ color: "oklch(0.15 0.005 265)" }}
      >
        设置
      </h1>

      <div className="space-y-6">
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
            基本设置
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "oklch(0.30 0.005 265)" }}
              >
                默认作者名
              </label>
              <input
                type="text"
                value={getConfig("AUTHOR")}
                onChange={(e) => updateConfig("AUTHOR", e.target.value)}
                placeholder="AI爱好者"
                className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
                style={{
                  border: "1px solid oklch(0.91 0 0)",
                  background: "oklch(1 0 0)",
                  color: "oklch(0.15 0.005 265)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "oklch(0.30 0.005 265)" }}
              >
                输出目录
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getConfig("OUTPUT_DIR")}
                  onChange={(e) => updateConfig("OUTPUT_DIR", e.target.value)}
                  placeholder="~/.ink/articles"
                  className="flex-1 px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
                  style={{
                    border: "1px solid oklch(0.91 0 0)",
                    background: "oklch(1 0 0)",
                    color: "oklch(0.15 0.005 265)",
                  }}
                />
                <button
                  onClick={pickDirectory}
                  className="px-4 h-9 text-sm rounded-[10px] transition-[background-color] duration-150 whitespace-nowrap"
                  style={{
                    border: "1px solid oklch(0.91 0 0)",
                    background: "oklch(0.965 0 0)",
                    color: "oklch(0.30 0.005 265)",
                  }}
                >
                  选择目录
                </button>
              </div>
            </div>
          </div>
        </div>

        <ArticleTemplates />

        {/* OSS 云存储配置 */}
        <div
          className="rounded-[14px] p-6 transition-shadow duration-200"
          style={{
            background: "oklch(1 0 0)",
            boxShadow: "0 1px 2px oklch(0 0 0 / 4%)",
          }}
        >
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "oklch(0.15 0.005 265)" }}
          >
            云存储（OSS）
          </h3>
          <p className="text-sm mb-4" style={{ color: "oklch(0.50 0 0)" }}>
            配置阿里云 OSS，创作的文章和封面图自动同步备份到云端。
          </p>
          <div className="space-y-3">
            {[
              { key: "OSS_BUCKET", label: "Bucket 名称", placeholder: "ink-client" },
              { key: "OSS_ENDPOINT", label: "Endpoint", placeholder: "oss-cn-beijing.aliyuncs.com" },
              { key: "OSS_ACCESS_KEY_ID", label: "AccessKey ID", placeholder: "LTAI..." },
              { key: "OSS_ACCESS_KEY_SECRET", label: "AccessKey Secret", placeholder: "••••••", type: "password" as const },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "oklch(0.30 0.005 265)" }}
                >
                  {label}
                </label>
                <input
                  type={type || "text"}
                  value={getConfig(key)}
                  onChange={(e) => updateConfig(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
                  style={{
                    border: "1px solid oklch(0.91 0 0)",
                    background: "oklch(1 0 0)",
                    color: "oklch(0.15 0.005 265)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <WechatConfig />
      </div>
    </div>
  );
}
