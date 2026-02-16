interface ArticleMeta {
  id: string;
  title: string;
  date: string;
  mode: string;
  status: "generated" | "published";
  coverPath?: string;
  articlePath: string;
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
      <div className="text-center py-16 text-gray-400">
        没有找到匹配的文章
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg mb-2">
          还没有生成过文章，去创作页开始吧
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
          className={`text-left bg-white rounded-xl border p-4 shadow-sm
            transition-all hover:shadow-md cursor-pointer
            ${selectedId === article.id
              ? "border-blue-500 ring-2 ring-blue-100"
              : "border-gray-200"
            }`}
        >
          {article.coverPath ? (
            <img
              src={article.coverPath}
              alt={article.title}
              className="w-full h-36 object-cover rounded-lg mb-3"
            />
          ) : (
            <div className="w-full h-36 bg-gradient-to-br from-blue-50
              to-indigo-100 rounded-lg mb-3 flex items-center
              justify-center text-3xl text-blue-300">
              📄
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2
            mb-2 leading-snug">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{article.date}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${article.status === "published"
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-gray-500"
              }`}>
              {article.status === "published" ? "已发布" : "已生成"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full
              bg-blue-50 text-blue-600 font-medium">
              {MODE_LABELS[article.mode] || article.mode}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
