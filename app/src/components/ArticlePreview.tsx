import DOMPurify from "dompurify";

interface ArticlePreviewProps {
  title: string;
  htmlContent: string;
  coverPath?: string;
}

export default function ArticlePreview({ title, htmlContent, coverPath }: ArticlePreviewProps) {
  const sanitizedHtml = DOMPurify.sanitize(htmlContent);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      alert("HTML 已复制到剪贴板");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = htmlContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("HTML 已复制到剪贴板");
    }
  };

  const handleOpenInBrowser = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-4">
            {title}
          </h3>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyHtml}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              复制 HTML
            </button>
            <button
              onClick={handleOpenInBrowser}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              在浏览器中打开
            </button>
          </div>
        </div>
      </div>

      {coverPath && (
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">封面图</p>
          <img src={coverPath} alt="封面" className="max-h-48 rounded-lg object-cover" />
        </div>
      )}

      <div
        className="p-5 prose prose-sm max-w-none overflow-auto max-h-[600px]"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
