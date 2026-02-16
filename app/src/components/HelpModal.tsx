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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {providerName} - 获取 API Key
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">注册地址</h3>
            <a
              href={guide.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm break-all"
            >
              {guide.registerUrl}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">操作步骤</h3>
            <div className="space-y-1.5">
              {guide.steps.map((step, i) => (
                <p key={i} className="text-sm text-gray-600">{step}</p>
              ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <span className="font-medium">免费额度：</span>
              {guide.freeQuota}
            </p>
          </div>

          {isModelGuide(guide) && guide.faq.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">常见问题</h3>
              <div className="space-y-3">
                {guide.faq.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800 mb-1">{item.q}</p>
                    <p className="text-sm text-gray-600">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}