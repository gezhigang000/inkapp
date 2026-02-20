#!/usr/bin/env python3
"""
搜索引擎适配层

统一搜索接口，支持 Tavily / SerpAPI 两个后端。
仅当 LLM_PROVIDER != claude 时需要调用，因为 Claude 一体化模式自带搜索。
"""


def search_and_fetch(queries, config, fetch_top_n=2):
    """
    执行多个搜索查询，返回格式化的上下文文本。

    参数:
        queries: 搜索查询列表，如 ["AI Agent 最新进展 2026", "OpenAI announcement"]
        config: 配置字典
        fetch_top_n: 每个查询取前 N 条结果的正文

    返回:
        格式化的搜索结果文本，可直接注入 prompt
    """
    provider = config.get("SEARCH_PROVIDER", "auto").lower()

    has_tavily = bool(config.get("TAVILY_API_KEY"))
    has_serpapi = bool(config.get("SERPAPI_API_KEY"))

    # Build ordered list of providers to try
    if provider == "auto":
        order = []
        if has_tavily:
            order.append("tavily")
        if has_serpapi:
            order.append("serpapi")
    elif provider == "tavily":
        order = ["tavily"]
        if has_serpapi:
            order.append("serpapi")
    elif provider == "serpapi":
        order = ["serpapi"]
        if has_tavily:
            order.append("tavily")
    else:
        print(f"[警告] 不支持的搜索提供商: {provider}，跳过搜索")
        return ""

    for p in order:
        if p == "tavily":
            results = _search_via_tavily(queries, config, fetch_top_n)
        else:
            results = _search_via_serpapi(queries, config, fetch_top_n)
        if results:
            return format_search_context(results)

    return ""


def _search_via_tavily(queries, config, fetch_top_n):
    """
    使用 Tavily API 搜索（自带正文提取）。

    返回:
        [{"query": str, "title": str, "url": str, "content": str}, ...]
    """
    api_key = config.get("TAVILY_API_KEY", "")
    if not api_key:
        print("[警告] 未配置 TAVILY_API_KEY，跳过搜索")
        return []

    try:
        import requests
    except ImportError:
        print("[警告] requests 库未安装，跳过搜索")
        return []

    results = []
    for query in queries:
        try:
            resp = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "max_results": fetch_top_n,
                    "include_answer": False,
                    "include_raw_content": False,
                },
                timeout=30,
            )

            if resp.status_code != 200:
                print(f"[警告] Tavily 搜索失败: HTTP {resp.status_code}")
                continue

            data = resp.json()
            for item in data.get("results", [])[:fetch_top_n]:
                results.append({
                    "query": query,
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "content": item.get("content", ""),
                })
        except Exception as e:
            print(f"[警告] Tavily 搜索异常 ({query}): {e}")
            continue

    return results


def _search_via_serpapi(queries, config, fetch_top_n):
    """
    使用 SerpAPI 搜索 + requests 抓取正文。

    返回:
        [{"query": str, "title": str, "url": str, "content": str}, ...]
    """
    api_key = config.get("SERPAPI_API_KEY", "")
    if not api_key:
        print("[警告] 未配置 SERPAPI_API_KEY，跳过搜索")
        return []

    try:
        import requests
    except ImportError:
        print("[警告] requests 库未安装，跳过搜索")
        return []

    results = []
    for query in queries:
        try:
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "api_key": api_key,
                    "q": query,
                    "num": fetch_top_n,
                    "engine": "google",
                },
                timeout=30,
            )

            if resp.status_code != 200:
                print(f"[警告] SerpAPI 搜索失败: HTTP {resp.status_code}")
                continue

            data = resp.json()
            organic = data.get("organic_results", [])[:fetch_top_n]

            for item in organic:
                url = item.get("link", "")
                title = item.get("title", "")
                snippet = item.get("snippet", "")

                # 尝试抓取正文
                content = _fetch_page_content(url)
                if not content:
                    content = snippet

                results.append({
                    "query": query,
                    "title": title,
                    "url": url,
                    "content": content,
                })
        except Exception as e:
            print(f"[警告] SerpAPI 搜索异常 ({query}): {e}")
            continue

    return results


def _fetch_page_content(url, max_chars=3000):
    """抓取网页正文，截取前 max_chars 字符"""
    try:
        import requests
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)"
        })
        if resp.status_code != 200:
            return ""

        # 简单提取正文：去除 HTML 标签
        import re
        text = resp.text
        # 移除 script 和 style
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        # 移除所有标签
        text = re.sub(r'<[^>]+>', ' ', text)
        # 清理空白
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:max_chars]
    except Exception:
        return ""


def format_search_context(results):
    """将搜索结果格式化为 prompt 可用的文本块"""
    if not results:
        return ""

    parts = []
    for i, item in enumerate(results, 1):
        part = f"【来源 {i}】{item['title']}\n"
        part += f"URL: {item['url']}\n"
        part += f"内容: {item['content']}\n"
        parts.append(part)

    return "\n---\n".join(parts)
