import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useConfig } from "../hooks/useConfig";
import { useGenerate } from "../hooks/useGenerate";
import { MODEL_PROVIDERS } from "../data/model-guides";
import GenerateProgress from "../components/GenerateProgress";
import ArticlePreview from "../components/ArticlePreview";
import FileUpload from "../components/FileUpload";
import type { UploadedFile } from "../components/FileUpload";

const inputStyle = {
  border: "1px solid oklch(0.91 0 0)",
  background: "oklch(1 0 0)",
  color: "oklch(0.15 0.005 265)",
};

export default function Create() {
  const navigate = useNavigate();
  const { getConfig, updateConfig } = useConfig();
  const { events, isRunning, result, selectedTemplate, params, setParams, startGenerate, stopGenerate } = useGenerate();
  const [selectedProvider, setSelectedProvider] = useState(
    () => getConfig("selected_provider") || "deepseek"
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [coverColor, setCoverColor] = useState(() => getConfig("cover_color_style") || "random");
  const [coverPattern, setCoverPattern] = useState(() => getConfig("cover_pattern_style") || "random");
  const [coverShowTitle, setCoverShowTitle] = useState(() => getConfig("cover_show_title") !== "false");
  const [coverSubtitle, setCoverSubtitle] = useState(() => getConfig("cover_subtitle") || "Ink");
  const [coverTitle, setCoverTitle] = useState(() => getConfig("cover_title") || "");

  // Redirect to home if no template selected (and not mid-generation)
  useEffect(() => {
    if (!selectedTemplate && !isRunning && !result && events.length === 0) {
      navigate("/", { replace: true });
    }
  }, [selectedTemplate, isRunning, result, events.length, navigate]);

  const isVideo = selectedTemplate?.id === "video-analysis";

  const canGenerate = useCallback(() => {
    if (isRunning) return false;
    if (isVideo && !params.videoUrl?.trim()) return false;
    if (!isVideo && !params.topic?.trim()) return false;
    return true;
  }, [isRunning, isVideo, params]);

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

    // Determine mode from template
    const mode = isVideo ? "video" : "topic";

    const payload: Record<string, unknown> = {
      action: selectedTemplate?.agentMode ? "agent_generate" : "generate",
      mode,
      topic: params.topic || undefined,
      video_url: params.videoUrl || undefined,
      provider: selectedProvider,
      template_id: selectedTemplate?.id || "",
    };

    // Pass template prompt for sidecar to use
    if (selectedTemplate?.prompt) {
      payload.template_prompt = selectedTemplate.prompt;
    }

    if (keyName) payload[keyName] = getConfig(keyName);
    const modelKey = MODEL_PROVIDERS.find(p => p.id === selectedProvider)
      ?.configKeys.find(ck => ck.type !== "password")?.key;
    if (modelKey && getConfig(modelKey)) payload[modelKey] = getConfig(modelKey);

    // 搜索服务 API Key
    for (const sk of ["TAVILY_API_KEY", "SERPAPI_API_KEY"] as const) {
      const v = getConfig(sk);
      if (v) payload[sk] = v;
    }
    // 搜索提供商选择
    const searchProvider = getConfig("SEARCH_PROVIDER");
    if (searchProvider && searchProvider !== "auto") {
      payload.SEARCH_PROVIDER = searchProvider;
    }

    // 输出目录
    const outputDir = getConfig("OUTPUT_DIR");
    if (outputDir) payload.OUTPUT_DIR = outputDir;

    const headerHtml = getConfig("ARTICLE_HEADER_HTML");
    const footerHtml = getConfig("ARTICLE_FOOTER_HTML");
    if (headerHtml) payload.header_html = headerHtml;
    if (footerHtml) payload.footer_html = footerHtml;

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

    // 传递上传文件的格式和路径（用于格式转换）
    if (uploadedFiles.length > 0) {
      payload.file_formats = uploadedFiles.map((f) => ({
        name: f.name,
        ext: f.name.split(".").pop()?.toLowerCase() || "",
        path: f.path,
      }));
    }

    // Agent 模式：传递模板内置的最大轮次
    if (selectedTemplate?.maxTurns) {
      payload.max_turns = selectedTemplate.maxTurns;
    }

    // 封面设置
    payload.cover_color_style = coverColor;
    payload.cover_pattern_style = coverPattern;
    payload.cover_show_title = coverShowTitle;
    payload.cover_subtitle = coverSubtitle;
    if (coverTitle.trim()) payload.cover_title = coverTitle.trim();

    startGenerate(payload);
  };

  const hasFailed = !isRunning && events.length > 0 && events.some(e => e.type === "error");
  const buttonLabel = isRunning ? "创作中..." : (hasFailed || result) ? "重新创作" : "开始创作";

  if (!selectedTemplate && !isRunning && !result && events.length === 0) return null;

  return (
    <div className="p-6 space-y-4" style={{ maxWidth: "100%" }}>
      {notice && (
        <div className="px-4 py-2 text-sm rounded-[10px]" style={{ background: "oklch(0.95 0.05 52)", color: "oklch(0.35 0.1 52)" }}>
          {notice}
        </div>
      )}

      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm flex items-center gap-1 transition-opacity duration-150 hover:opacity-70" style={{ color: "oklch(0.50 0 0)" }}>
          ← 返回
        </Link>
        {selectedTemplate && (
          <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "oklch(0.15 0.005 265)" }}>
            {selectedTemplate.icon} {selectedTemplate.name}
          </span>
        )}
        <div className="flex-1" />
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          disabled={isRunning}
          className="px-3 h-9 text-sm rounded-[10px] transition-[background-color] duration-150 disabled:opacity-40"
          style={{ border: "1px solid oklch(0.91 0 0)", background: "oklch(1 0 0)", color: "oklch(0.15 0.005 265)" }}
        >
          {MODEL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate()}
          className="px-6 h-9 text-sm font-medium rounded-[10px] transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: isRunning ? "oklch(0.50 0 0)" : "oklch(0.27 0.005 265)", color: "oklch(0.98 0.002 90)" }}
        >
          {buttonLabel}
        </button>
      </div>

      {/* 输入区：生成中折叠，完成后可编辑重新创作 */}
      {!isRunning && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "oklch(0.30 0.005 265)" }}>
              {isVideo ? "视频链接" : "主题"} <span style={{ color: "oklch(0.63 0.14 52)" }}>*</span>
            </label>
            {isVideo ? (
              <input
                type="text"
                value={params.videoUrl || ""}
                onChange={(e) => setParams({ ...params, videoUrl: e.target.value })}
                placeholder="支持 YouTube、Bilibili 等视频链接"
                className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
                style={inputStyle}
              />
            ) : (
              <input
                type="text"
                value={params.topic || ""}
                onChange={(e) => setParams({ ...params, topic: e.target.value })}
                placeholder="输入创作主题关键词"
                className="w-full px-3 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)]"
                style={inputStyle}
              />
            )}
          </div>
          <FileUpload files={uploadedFiles} onFilesChange={setUploadedFiles} />

          {/* 封面与排版设置 */}
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ border: "1px solid oklch(0.91 0 0)" }}
          >
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-expanded={showSettings}
              aria-label="封面与排版设置"
              className="w-full px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer"
              style={{ background: "oklch(0.975 0 0)", color: "oklch(0.30 0.005 265)" }}
            >
              <span>封面与排版设置</span>
              <span style={{ color: "oklch(0.50 0 0)", fontSize: 12 }}>
                {showSettings ? "▲" : "▼"}
              </span>
            </button>
            {showSettings && (
              <div className="px-4 py-3 space-y-3" style={{ background: "oklch(1 0 0)" }}>
                <CoverSettingRow label="封面色调">
                  {(["random", "dark", "light", "colorful"] as const).map((v) => (
                    <ChipBtn key={v} active={coverColor === v} onClick={() => { setCoverColor(v); updateConfig("cover_color_style", v); }}>
                      {{ random: "随机", dark: "深色", light: "浅色", colorful: "彩色" }[v]}
                    </ChipBtn>
                  ))}
                </CoverSettingRow>
                <CoverSettingRow label="封面图案">
                  {(["random", "geometric", "tech", "wave"] as const).map((v) => (
                    <ChipBtn key={v} active={coverPattern === v} onClick={() => { setCoverPattern(v); updateConfig("cover_pattern_style", v); }}>
                      {{ random: "随机", geometric: "几何", tech: "科技", wave: "波纹" }[v]}
                    </ChipBtn>
                  ))}
                </CoverSettingRow>
                <CoverSettingRow label="封面标题">
                  <ChipBtn active={coverShowTitle} onClick={() => { setCoverShowTitle(true); updateConfig("cover_show_title", "true"); }}>显示</ChipBtn>
                  <ChipBtn active={!coverShowTitle} onClick={() => { setCoverShowTitle(false); updateConfig("cover_show_title", "false"); }}>隐藏</ChipBtn>
                </CoverSettingRow>
                {coverShowTitle && (
                  <CoverSettingRow label="自定义标题">
                    <input
                      type="text"
                      value={coverTitle}
                      onChange={(e) => { setCoverTitle(e.target.value); updateConfig("cover_title", e.target.value); }}
                      placeholder="留空则使用文章标题"
                      className="px-2.5 h-7 text-xs rounded-[8px] flex-1"
                      style={inputStyle}
                    />
                  </CoverSettingRow>
                )}
                <CoverSettingRow label="封面署名">
                  <input
                    type="text"
                    value={coverSubtitle}
                    onChange={(e) => { setCoverSubtitle(e.target.value); updateConfig("cover_subtitle", e.target.value); }}
                    placeholder="Ink"
                    className="px-2.5 h-7 text-xs rounded-[8px] w-32"
                    style={inputStyle}
                  />
                </CoverSettingRow>
                <CoverSettingRow label="文章头部">
                  <span className="text-xs" style={{ color: "oklch(0.50 0 0)" }}>
                    {getConfig("ARTICLE_HEADER_HTML") ? "已配置" : "未配置"}（在「设置」页修改）
                  </span>
                </CoverSettingRow>
                <CoverSettingRow label="文章尾部">
                  <span className="text-xs" style={{ color: "oklch(0.50 0 0)" }}>
                    {getConfig("ARTICLE_FOOTER_HTML") ? "已配置" : "未配置"}（在「设置」页修改）
                  </span>
                </CoverSettingRow>
              </div>
            )}
          </div>
        </>
      )}

      {/* 生成中：显示摘要 + 日志 */}
      {(isRunning || events.length > 0) && (
        <>
          {isRunning && (
            <div className="text-sm px-4 py-2 rounded-[10px]" style={{ background: "oklch(0.965 0 0)", color: "oklch(0.50 0 0)" }}>
              {isVideo ? `视频: ${params.videoUrl}` : `主题: ${params.topic || "自动选题"}`}
              {uploadedFiles.length > 0 && ` · ${uploadedFiles.length} 个附件`}
            </div>
          )}
          <GenerateProgress events={events} isRunning={isRunning} />
          {isRunning && (
            <button
              onClick={stopGenerate}
              className="mt-2 px-4 h-8 text-xs font-medium rounded-[10px] cursor-pointer transition-[background-color,opacity] duration-150"
              style={{
                background: "oklch(0.63 0.14 52)",
                color: "oklch(0.98 0.002 90)",
              }}
            >
              中断创作
            </button>
          )}
        </>
      )}

      {/* 文章预览 */}
      {result && (
        <ArticlePreview
          title={result.title}
          htmlContent={result.htmlContent}
          coverPath={result.coverPath}
          articlePath={result.articlePath}
          fileType={result.fileType}
          metadataPath={result.metadataPath}
        />
      )}
    </div>
  );
}

function CoverSettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs shrink-0 w-16" style={{ color: "oklch(0.40 0 0)" }}>{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 h-7 text-xs rounded-[8px] cursor-pointer transition-all duration-150"
      style={active
        ? { background: "oklch(0.27 0.005 265)", color: "oklch(0.98 0.002 90)" }
        : { border: "1px solid oklch(0.88 0 0)", color: "oklch(0.40 0 0)", background: "transparent" }
      }
    >
      {children}
    </button>
  );
}
