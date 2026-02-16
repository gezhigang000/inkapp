import { useEffect } from "react";
import type { ModelProvider, SearchProvider } from "../data/model-guides";

type GuideData = ModelProvider["guide"] | SearchProvider["guide"];

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  guide: GuideData;
}

function isModelGuide(guide: GuideData): guide is ModelProvider["guide"] {
  return "faq" in guide;
}

export default function HelpModal({ open, onClose, providerName, guide }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "oklch(0 0 0 / 40%)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-[14px]"
        style={{
          background: "oklch(1 0 0)",
          boxShadow: "0 8px 24px oklch(0 0 0 / 8%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid oklch(0.93 0 0)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "oklch(0.15 0.005 265)" }}
          >
            {providerName} - 获取 API Key
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-opacity duration-150 hover:opacity-60"
            style={{ color: "oklch(0.50 0 0)" }}
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: "oklch(0.30 0.005 265)" }}
            >
              注册地址
            </h3>
            <a
              href={guide.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm break-all underline"
              style={{ color: "oklch(0.30 0.005 265)" }}
            >
              {guide.registerUrl}
            </a>
          </div>

          <div>
            <h3
              className="text-sm font-medium mb-2"
              style={{ color: "oklch(0.30 0.005 265)" }}
            >
              操作步骤
            </h3>
            <div className="space-y-1.5">
              {guide.steps.map((step, i) => (
                <p
                  key={i}
                  className="text-sm"
                  style={{ color: "oklch(0.40 0.005 265)" }}
                >
                  {step}
                </p>
              ))}
            </div>
          </div>

          <div
            className="rounded-[10px] p-3"
            style={{
              background: "oklch(0.965 0 0)",
            }}
          >
            <p className="text-sm" style={{ color: "oklch(0.30 0.005 265)" }}>
              <span className="font-medium">免费额度：</span>
              {guide.freeQuota}
            </p>
          </div>

          {isModelGuide(guide) && guide.faq.length > 0 && (
            <div>
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "oklch(0.30 0.005 265)" }}
              >
                常见问题
              </h3>
              <div className="space-y-3">
                {guide.faq.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-[10px] p-3"
                    style={{ background: "oklch(0.965 0 0)" }}
                  >
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: "oklch(0.18 0.005 265)" }}
                    >
                      {item.q}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.40 0.005 265)" }}
                    >
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5" style={{ borderTop: "1px solid oklch(0.93 0 0)" }}>
          <button
            onClick={onClose}
            className="w-full h-9 rounded-[10px] text-sm transition-[background-color] duration-150"
            style={{
              background: "oklch(0.965 0 0)",
              color: "oklch(0.30 0.005 265)",
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
