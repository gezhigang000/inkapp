import { useState, useCallback } from "react";
import { useConfig } from "../hooks/useConfig";
import { useGenerate } from "../hooks/useGenerate";
import { MODEL_PROVIDERS } from "../data/model-guides";
import ModeSelector from "../components/ModeSelector";
import GenerateProgress from "../components/GenerateProgress";
import ArticlePreview from "../components/ArticlePreview";
import FileUpload from "../components/FileUpload";
import type { UploadedFile } from "../components/FileUpload";

export default function Create() {
  const { getConfig } = useConfig();
  const { events, isRunning, result, mode, params, setMode, setParams, startGenerate } = useGenerate();
  const [selectedProvider, setSelectedProvider] = useState(
    () => getConfig("selected_provider") || "deepseek"
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [notice, setNotice] = useState("");

  const canGenerate = useCallback(() => {
    if (isRunning) return false;
    if (mode === "topic" && !params.topic?.trim()) return false;
    if (mode === "daily" && !params.topic?.trim()) return false;
    if (mode === "video" && !params.videoUrl?.trim()) return false;
    return true;
  }, [isRunning, mode, params]);

  const getProviderKeyName = (providerId: string): string | undefined => {
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return undefined;
    return provider.configKeys.find((ck) => ck.type === "password")?.key;
  };

  const handleGenerate = async () => {
    const keyName = getProviderKeyName(selectedProvider);
    if (keyName && !getConfig(keyName)) {
      setNotice(`请先在「模型配置」页面配置 ${selectedProvider} 的 API Key`);
      setTimeout(() => setNotice(""), 4000);
      return;
    }
    const payload: Record<string, unknown> = {
      action: "generate",
      mode,
      topic: params.topic || undefined,
      video_url: params.videoUrl || undefined,
      provider: selectedProvider,
    };
    if (keyName) payload[keyName] = getConfig(keyName);
    // Pass model name config
    const modelKey = MODEL_PROVIDERS.find(p => p.id === selectedProvider)
      ?.configKeys.find(ck => ck.type !== "password")?.key;
    if (modelKey && getConfig(modelKey)) payload[modelKey] = getConfig(modelKey);

    // 文章头尾模板
    const headerHtml = getConfig("ARTICLE_HEADER_HTML");
    const footerHtml = getConfig("ARTICLE_FOOTER_HTML");
    if (headerHtml) payload.header_html = headerHtml;
    if (footerHtml) payload.footer_html = footerHtml;

    // OSS 云存储配置
    const ossBucket = getConfig("OSS_BUCKET");
    const ossEndpoint = getConfig("OSS_ENDPOINT");
    const ossAk = getConfig("OSS_ACCESS_KEY_ID");
    const ossSk = getConfig("OSS_ACCESS_KEY_SECRET");
    if (ossBucket && ossEndpoint && ossAk && ossSk) {
      payload.oss_bucket = ossBucket;
      payload.oss_endpoint = ossEndpoint;
      payload.oss_access_key_id = ossAk;
      payload.oss_access_key_secret = ossSk;
    }

    const fileTexts = uploadedFiles
      .filter((f) => f.extractedText)
      .map((f) => `=== ${f.name} ===\n${f.extractedText}`)
      .join("\n\n");
    if (fileTexts) payload.file_contents = fileTexts;

    startGenerate(payload);
  };

  const hasFailed = !isRunning && events.length > 0 && events.some(e => e.type === "error");
  const buttonLabel = isRunning ? "创作中..." : (hasFailed || result) ? "重新创作" : "开始创作";

  return (
    <div className="p-6 space-y-4" style={{ maxWidth: "100%" }}>
      {notice && (
        <div
          className="px-4 py-2 text-sm rounded-[10px]"
          style={{ background: "oklch(0.95 0.05 52)", color: "oklch(0.35 0.1 52)" }}
        >
          {notice}
        </div>
      )}
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          disabled={isRunning}
          className="px-3 h-9 text-sm rounded-[10px] transition-[background-color] duration-150 disabled:opacity-40"
          style={{
            border: "1px solid oklch(0.91 0 0)",
            background: "oklch(1 0 0)",
            color: "oklch(0.15 0.005 265)",
          }}
        >
          {MODEL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={handleGenerate}
          disabled={!canGenerate()}
          className="px-6 h-9 text-sm font-medium rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isRunning ? "oklch(0.50 0 0)" : "oklch(0.27 0.005 265)",
            color: "oklch(0.98 0.002 90)",
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {/* 输入区：生成中折叠 */}
      {!isRunning && !result && (
        <>
          <ModeSelector
            mode={mode}
            onModeChange={setMode}
            params={params}
            onParamsChange={setParams}
          />
          <FileUpload files={uploadedFiles} onFilesChange={setUploadedFiles} />
        </>
      )}

      {/* 生成中：显示摘要 + 日志 */}
      {(isRunning || events.length > 0) && (
        <>
          {isRunning && (
            <div
              className="text-sm px-4 py-2 rounded-[10px]"
              style={{ background: "oklch(0.965 0 0)", color: "oklch(0.50 0 0)" }}
            >
              {mode === "topic" ? `主题: ${params.topic || "自动选题"}` : mode === "video" ? `视频: ${params.videoUrl}` : "日报模式"}
              {uploadedFiles.length > 0 && ` · ${uploadedFiles.length} 个附件`}
            </div>
          )}
          <GenerateProgress events={events} isRunning={isRunning} />
        </>
      )}

      {/* 文章预览 */}
      {result && (
        <ArticlePreview
          title={result.title}
          htmlContent={result.htmlContent}
          coverPath={result.coverPath}
        />
      )}
    </div>
  );
}
