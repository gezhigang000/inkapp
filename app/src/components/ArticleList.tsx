import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ArticleMeta {
  id: string;
  title: string;
  date: string;
  mode: string;
  status: "generated" | "published";
  coverPath?: string;
  articlePath: string;
  convertedPath?: string;
  fileType?: string;
}

interface ArticleListProps {
  articles: ArticleMeta[];
  onSelect: (id: string) => void;
  selectedId?: string;
  searchQuery: string;
}

const MODE_LABELS: Record<string, string> = {
  daily: "日报",
  topic: "深度研究",
  video: "视频分析",
};

export type { ArticleMeta };

function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="w-full h-36 rounded-[10px] mb-3 flex items-center justify-center text-3xl"
        style={{ background: "oklch(0.965 0 0)", color: "oklch(0.75 0 0)" }}
      >
        📄
      </div>
    );
  }
  return (
    <img
      src={convertFileSrc(src)}
      alt={alt}
      className="w-full h-36 object-cover rounded-[10px] mb-3"
      onError={() => setFailed(true)}
    />
  );
}

export default function ArticleList({
  articles,
  onSelect,
  selectedId,
  searchQuery,
}: ArticleListProps) {
  const filtered = articles
    .filter((a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (filtered.length === 0 && searchQuery) {
    return (
      <div className="text-center py-16" style={{ color: "oklch(0.50 0 0)" }}>
        没有找到匹配的文章
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg mb-2" style={{ color: "oklch(0.50 0 0)" }}>
          还没有创作过文章，去创作页开始吧
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filtered.map((article) => (
        <button
          key={article.id}
          onClick={() => onSelect(article.id)}
          className="text-left rounded-[14px] p-4 transition-shadow duration-200 cursor-pointer"
          style={{
            background: "oklch(1 0 0)",
            boxShadow: selectedId === article.id
              ? "0 0 0 2px oklch(0.27 0.005 265)"
              : "0 1px 2px oklch(0 0 0 / 4%)",
          }}
          onMouseEnter={(e) => {
            if (selectedId !== article.id) {
              e.currentTarget.style.boxShadow = "0 2px 8px oklch(0 0 0 / 6%)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedId !== article.id) {
              e.currentTarget.style.boxShadow = "0 1px 2px oklch(0 0 0 / 4%)";
            }
          }}
        >
          {article.coverPath ? (
            <CoverImage src={article.coverPath} alt={article.title} />
          ) : (
            <div
              className="w-full h-36 rounded-[10px] mb-3 flex items-center justify-center text-3xl"
              style={{ background: "oklch(0.965 0 0)", color: "oklch(0.75 0 0)" }}
            >
              📄
            </div>
          )}
          <h3
            className="text-sm font-semibold line-clamp-2 mb-2 leading-snug"
            style={{ color: "oklch(0.15 0.005 265)" }}
          >
            {article.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: "oklch(0.50 0 0)" }}>
              {article.date}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: article.status === "published"
                  ? "oklch(0.27 0.005 265)"
                  : "oklch(0.965 0 0)",
                color: article.status === "published"
                  ? "oklch(0.98 0.002 90)"
                  : "oklch(0.50 0 0)",
              }}
            >
              {article.status === "published" ? "已发布" : "已创作"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "oklch(0.965 0 0)",
                color: "oklch(0.40 0.005 265)",
              }}
            >
              {MODE_LABELS[article.mode] || article.mode}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
