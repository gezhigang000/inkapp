import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ArticleList from "../components/ArticleList";
import ArticleActions from "../components/ArticleActions";
import type { ArticleMeta } from "../components/ArticleList";

export default function Articles() {
  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>("run_sidecar", {
        commandJson: JSON.stringify({ action: "list_articles" }),
      });
      for (const line of result.split("\n")) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === "result" && parsed.articles) {
            const mapped: ArticleMeta[] = parsed.articles.map(
              (a: Record<string, unknown>) => ({
                id: a.id as string,
                title: (a.title as string) || "未命名",
                date: (a.date as string) || "",
                mode: (a.mode as string) || "daily",
                status:
                  (a.status as string) === "published"
                    ? ("published" as const)
                    : ("generated" as const),
                articlePath:
                  (
                    (a.articles as Record<string, string>[] | undefined)?.[0]
                      ?.path as string
                  ) || "",
                coverPath:
                  (
                    (a.articles as Record<string, string>[] | undefined)?.[0]
                      ?.cover as string
                  ) || undefined,
              })
            );
            setArticles(mapped);
          }
        } catch {
          /* skip non-JSON lines */
        }
      }
    } catch {
      // sidecar 不可用时显示空列表
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const selectedArticle = articles.find((a) => a.id === selectedId);

  const handleDelete = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            共 {articles.length} 篇
          </span>
          <button
            onClick={loadArticles}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索文章标题..."
          className="w-full max-w-md px-4 py-2 text-sm border
            border-gray-200 rounded-lg focus:outline-none
            focus:ring-2 focus:ring-blue-500
            focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <ArticleList
              articles={articles}
              onSelect={setSelectedId}
              selectedId={selectedId ?? undefined}
              searchQuery={searchQuery}
            />
          </div>

          {selectedArticle && (
            <div className="w-64 shrink-0">
              <div className="sticky top-6">
                <ArticleActions
                  article={selectedArticle}
                  onDelete={handleDelete}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
