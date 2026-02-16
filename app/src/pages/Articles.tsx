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
      const result = await invoke<{ articles: Record<string, unknown>[] }>("list_articles_native");
      const mapped: ArticleMeta[] = (result.articles || []).map(
        (a) => ({
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
    } catch {
      // fallback: empty list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const selectedArticle = articles.find((a) => a.id === selectedId);

  const handleDelete = async (id: string) => {
    try {
      await invoke("run_sidecar", {
        commandJson: JSON.stringify({
          action: "delete_article",
          article_id: id,
        }),
      });
    } catch {
      // 即使 sidecar 删除失败也从列表移除
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="p-6 mx-auto" style={{ maxWidth: 1080 }}>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "oklch(0.15 0.005 265)" }}
        >
          文章管理
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "oklch(0.50 0 0)" }}>
            共 {articles.length} 篇
          </span>
          <button
            onClick={loadArticles}
            className="px-3 h-8 text-xs font-medium rounded-[10px] transition-[background-color] duration-150"
            style={{
              background: "oklch(0.965 0 0)",
              color: "oklch(0.30 0.005 265)",
            }}
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
          className="w-full max-w-md px-4 h-9 text-sm rounded-[10px] placeholder:text-[oklch(0.50_0_0)] focus:outline-none"
          style={{
            border: "1px solid oklch(0.91 0 0)",
            background: "oklch(1 0 0)",
            color: "oklch(0.15 0.005 265)",
          }}
        />
      </div>

      {loading ? (
        <div
          className="text-center py-16"
          style={{ color: "oklch(0.50 0 0)" }}
        >
          加载中...
        </div>
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
