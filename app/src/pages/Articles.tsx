import { useState } from "react";
import ArticleList from "../components/ArticleList";
import ArticleActions from "../components/ArticleActions";
import type { ArticleMeta } from "../components/ArticleList";

const MOCK_ARTICLES: ArticleMeta[] = [
  {
    id: "1",
    title: "AI Agent 技术前沿：从 AutoGPT 到企业级应用",
    date: "2026-02-16",
    mode: "daily",
    status: "generated",
    articlePath: "",
  },
  {
    id: "2",
    title: "DeepSeek V3 深度评测：开源模型的新标杆",
    date: "2026-02-15",
    mode: "topic",
    status: "published",
    articlePath: "",
  },
  {
    id: "3",
    title: "Sora 视频生成技术解析与创作实践",
    date: "2026-02-14",
    mode: "video",
    status: "generated",
    articlePath: "",
  },
  {
    id: "4",
    title: "RAG 架构最佳实践：从向量检索到知识图谱",
    date: "2026-02-13",
    mode: "topic",
    status: "published",
    articlePath: "",
  },
  {
    id: "5",
    title: "本周 AI 要闻速览：Claude 4、Gemini 2.5 与更多",
    date: "2026-02-12",
    mode: "daily",
    status: "generated",
    articlePath: "",
  },
];

export default function Articles() {
  const [articles, setArticles] = useState(MOCK_ARTICLES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedArticle = articles.find((a) => a.id === selectedId);

  const handleDelete = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          文章管理
        </h1>
        <span className="text-sm text-gray-400">
          共 {articles.length} 篇
        </span>
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
    </div>
  );
}
