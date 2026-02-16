import { useState } from "react";
import DOMPurify from "dompurify";
import { invoke } from "@tauri-apps/api/core";
import { useConfig } from "../hooks/useConfig";
import { MODEL_PROVIDERS } from "../data/model-guides";

const inputStyle = {
  border: "1px solid oklch(0.91 0 0)",
  background: "oklch(1 0 0)",
  color: "oklch(0.15 0.005 265)",
};

function wrapAsHtml(text: string, type: "header" | "footer"): string {
  const borderSide = type === "header" ? "border-bottom" : "border-top";
  const margin = type === "header" ? "margin-bottom" : "margin-top";
  return `<section style="${margin}:32px;padding:20px 0;${borderSide}:1px solid #e5e7eb;text-align:center;">
<p style="font-size:15px;color:#333;line-height:1.8;margin:0;">${text.replace(/\n/g, "<br/>")}</p>
</section>`;
}

export default function ArticleTemplates() {
  const { getConfig, updateConfig } = useConfig();
  const [headerText, setHeaderText] = useState(() => getConfig("ARTICLE_HEADER_TEXT"));
  const [footerText, setFooterText] = useState(() => getConfig("ARTICLE_FOOTER_TEXT"));
  const [rendering, setRendering] = useState<"header" | "footer" | null>(null);
  const [previewHtml, setPreviewHtml] = useState<{ type: "header" | "footer"; html: string } | null>(null);

  const handleRender = async (type: "header" | "footer") => {
    const text = type === "header" ? headerText : footerText;
    if (!text.trim()) return;
    setRendering(type);
    try {
      const provider = getConfig("selected_provider") || "deepseek";
      const payload: Record<string, string> = {
        action: "render_template",
        text,
        position: type,
        provider,
      };
      // Pass API key for the selected provider
      const providerDef = MODEL_PROVIDERS.find(p => p.id === provider);
      if (providerDef) {
        for (const ck of providerDef.configKeys) {
          const val = getConfig(ck.key);
          if (val) payload[ck.key] = val;
        }
      }
      const result = await invoke<string>("run_sidecar", {
        commandJson: JSON.stringify(payload),
      });
      // Parse sidecar output for rendered HTML
      for (const line of result.split("\n")) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "result" && parsed.content) {
            setPreviewHtml({ type, html: parsed.content });
            return;
          }
        } catch { /* skip */ }
      }
      // Fallback: use simple HTML wrapper
      setPreviewHtml({ type, html: wrapAsHtml(text, type) });
    } catch {
      setPreviewHtml({ type, html: wrapAsHtml(text, type) });
    } finally {
      setRendering(null);
    }
  };

  const handleConfirm = () => {
    if (!previewHtml) return;
    const key = previewHtml.type === "header" ? "ARTICLE_HEADER_HTML" : "ARTICLE_FOOTER_HTML";
    const textKey = previewHtml.type === "header" ? "ARTICLE_HEADER_TEXT" : "ARTICLE_FOOTER_TEXT";
    const text = previewHtml.type === "header" ? headerText : footerText;
    updateConfig(key, previewHtml.html);
    updateConfig(textKey, text);
    setPreviewHtml(null);
  };

  const handleClear = (type: "header" | "footer") => {
    const htmlKey = type === "header" ? "ARTICLE_HEADER_HTML" : "ARTICLE_FOOTER_HTML";
    const textKey = type === "header" ? "ARTICLE_HEADER_TEXT" : "ARTICLE_FOOTER_TEXT";
    updateConfig(htmlKey, "");
    updateConfig(textKey, "");
    if (type === "header") setHeaderText("");
    else setFooterText("");
    if (previewHtml?.type === type) setPreviewHtml(null);
  };

  const savedHeaderHtml = getConfig("ARTICLE_HEADER_HTML");
  const savedFooterHtml = getConfig("ARTICLE_FOOTER_HTML");

  return (
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
        文章头尾模板
      </h3>
      <p className="text-sm mb-4" style={{ color: "oklch(0.50 0 0)" }}>
        设置文章头部和尾部的通用内容，创作时自动添加。
      </p>

      {(["header", "footer"] as const).map((type) => {
        const label = type === "header" ? "头部模板" : "尾部模板";
        const text = type === "header" ? headerText : footerText;
        const setText = type === "header" ? setHeaderText : setFooterText;
        const savedHtml = type === "header" ? savedHeaderHtml : savedFooterHtml;

        return (
          <div key={type} className="mb-4 last:mb-0">
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "oklch(0.30 0.005 265)" }}
            >
              {label}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={type === "header" ? "例如：本文由 AI 辅助创作" : "例如：关注我们获取更多内容"}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-[10px] resize-none placeholder:text-[oklch(0.50_0_0)]"
              style={inputStyle}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleRender(type)}
                disabled={!text.trim() || rendering === type}
                className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color] duration-150 disabled:opacity-40"
                style={{
                  background: "oklch(0.27 0.005 265)",
                  color: "oklch(0.98 0.002 90)",
                }}
              >
                {rendering === type ? "渲染中..." : "渲染预览"}
              </button>
              {savedHtml && (
                <button
                  onClick={() => handleClear(type)}
                  className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color] duration-150"
                  style={{
                    background: "oklch(0.965 0 0)",
                    color: "oklch(0.45 0.12 52)",
                  }}
                >
                  清除
                </button>
              )}
            </div>
            {savedHtml && !previewHtml?.type && (
              <div className="mt-2 p-3 rounded-[10px] text-xs" style={{ background: "oklch(0.965 0 0)" }}>
                <span style={{ color: "oklch(0.50 0 0)" }}>当前模板：</span>
                <div
                  className="mt-1 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(savedHtml) }}
                />
              </div>
            )}
          </div>
        );
      })}

      {previewHtml && (
        <div
          className="mt-4 p-4 rounded-[10px]"
          style={{ border: "2px dashed oklch(0.80 0 0)", background: "oklch(0.98 0 0)" }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.30 0.005 265)" }}>
            {previewHtml.type === "header" ? "头部" : "尾部"}模板预览
          </p>
          <div
            className="prose prose-sm max-w-none mb-3"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml.html) }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="px-4 h-8 text-xs font-medium rounded-[10px]"
              style={{
                background: "oklch(0.27 0.005 265)",
                color: "oklch(0.98 0.002 90)",
              }}
            >
              确认使用
            </button>
            <button
              onClick={() => setPreviewHtml(null)}
              className="px-4 h-8 text-xs font-medium rounded-[10px]"
              style={{
                background: "oklch(0.965 0 0)",
                color: "oklch(0.30 0.005 265)",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
