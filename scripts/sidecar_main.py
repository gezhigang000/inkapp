#!/usr/bin/env python3
"""
Sidecar 入口：接收 Tauri 前端命令，输出 JSON Lines 进度。
用法: echo '{"action":"generate","mode":"daily"}' | python3 sidecar_main.py
"""
import sys
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 确保 scripts 目录在 import 路径中
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Pillow 等依赖可能在 pylib 目录
PYLIB_DIR = os.path.join(PROJECT_ROOT, "pylib")
if os.path.exists(PYLIB_DIR) and PYLIB_DIR not in sys.path:
    sys.path.insert(0, PYLIB_DIR)


def emit(event_type, **kwargs):
    """输出一行 JSON 事件到 stdout"""
    event = {"type": event_type, **kwargs}
    print(json.dumps(event, ensure_ascii=False), flush=True)


def handle_generate(params):
    """处理文章生成请求，集成 daily_ai_news.py 核心逻辑"""
    from datetime import datetime
    from daily_ai_news import (
        load_config, generate_article, generate_cover_image,
        extract_html, extract_title, split_article_if_needed,
        make_timestamp, run_video_analysis, save_article,
        pick_daily_variation, append_footer,
    )

    emit("progress", stage="init", message="正在加载配置...")

    # 加载配置，允许前端参数覆盖
    config = load_config()
    if params.get("provider"):
        config["LLM_PROVIDER"] = params["provider"]
    for key in ["DEEPSEEK_API_KEY", "GLM_API_KEY", "DOUBAO_API_KEY",
                "KIMI_API_KEY", "OPENAI_API_KEY"]:
        if params.get(key):
            config[key] = params[key]

    mode = params.get("mode", "daily")
    topic = params.get("topic", "")
    video_url = params.get("video_url", "")
    output_dir = config.get("OUTPUT_DIR", os.path.join(PROJECT_ROOT, "output", "articles"))
    timestamp = make_timestamp()

    try:
        # ---------- 视频分析模式 ----------
        if mode == "video" and video_url:
            emit("progress", stage="analyzing", message="正在分析视频...")
            args = {"local": True, "publish": False, "video": video_url, "topic": None}
            run_video_analysis(video_url, config, args)
            emit("progress", stage="done", message="视频分析完成！", percent=100)
            emit("result", status="success", title="视频分析完成", article_path=output_dir)
            return

        # ---------- 文章生成模式（daily / topic） ----------
        today = datetime.now().strftime("%Y-%m-%d")
        variation = pick_daily_variation(today)
        effective_topic = topic if topic else variation.get("topic")

        emit("progress", stage="generating", message="正在生成文章...", percent=20)
        html_content = generate_article(topic=effective_topic, config=config)
        if not html_content:
            emit("error", code="GENERATION_FAILED", message="文章生成失败，未获得输出")
            return

        emit("progress", stage="processing", message="正在处理文章...", percent=50)

        # 提取 HTML
        extracted = extract_html(html_content)
        if extracted:
            html_content = extracted

        # 提取标题
        title = extract_title(html_content) or f"AI 资讯 {timestamp}"

        # 拆分长文
        articles = split_article_if_needed(html_content, title)
        is_series = len(articles) > 1

        emit("progress", stage="saving", message="正在保存文章...", percent=60)

        filepaths = []
        img_paths = []
        for idx, (part_title, part_html) in enumerate(articles):
            part_html = append_footer(part_html)
            suffix = f"-part{idx + 1}" if is_series else ""
            filepath = save_article(timestamp, part_html, output_dir, suffix=suffix)
            filepaths.append(str(filepath))

            emit("progress", stage="cover", message=f"正在生成封面图...", percent=70 + idx * 10)
            cover_path = generate_cover_image(
                f"{timestamp}{suffix}", part_title,
                effective_topic or "", output_dir,
                cover_theme=variation.get("cover_theme"),
            )
            img_paths.append(str(cover_path) if cover_path else "")

        # 保存元数据
        meta_dir = os.path.dirname(filepaths[0]) if filepaths else output_dir
        metadata = {
            "title": title,
            "date": timestamp[:8],  # YYYYMMDD
            "mode": mode,
            "topic": effective_topic or "",
            "status": "generated",
            "provider": config.get("LLM_PROVIDER", "claude"),
            "articles": [
                {"title": articles[i][0], "path": filepaths[i], "cover": img_paths[i]}
                for i in range(len(articles))
            ],
        }
        meta_path = os.path.join(meta_dir, f"{timestamp}-metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        emit("progress", stage="done", message="生成完成！", percent=100)
        emit("result", status="success", title=title,
             article_path=filepaths[0], metadata_path=meta_path,
             article_count=len(articles))

    except Exception as e:
        emit("error", code="GENERATION_ERROR", message=str(e))


def handle_validate_key(params):
    """验证 API Key 有效性：向对应平台发送轻量请求"""
    provider = params.get("provider", "")
    api_key = params.get("api_key", "")

    if not provider or not api_key:
        emit("error", code="MISSING_PARAMS", message="缺少 provider 或 api_key")
        return

    import requests

    endpoints = {
        "deepseek": "https://api.deepseek.com/v1/models",
        "glm": "https://open.bigmodel.cn/api/paas/v4/models",
        "doubao": "https://ark.cn-beijing.volces.com/api/v3/models",
        "kimi": "https://api.moonshot.cn/v1/models",
        "openai": "https://api.openai.com/v1/models",
    }

    endpoint = endpoints.get(provider)
    if not endpoint:
        emit("error", code="UNKNOWN_PROVIDER", message=f"未知的模型提供商: {provider}")
        return

    try:
        resp = requests.get(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        if resp.status_code == 200:
            emit("result", status="success", message=f"{provider} API Key 验证成功")
        else:
            emit("error", code="INVALID_KEY",
                 message=f"API Key 无效: HTTP {resp.status_code}")
    except Exception as e:
        emit("error", code="CONNECTION_ERROR", message=f"连接失败: {str(e)}")


def handle_list_articles(params):
    """扫描 output 目录，列出已生成的文章"""
    output_dir = params.get("output_dir",
                            os.path.join(PROJECT_ROOT, "output", "articles"))
    articles = []

    if os.path.exists(output_dir):
        for entry in sorted(os.listdir(output_dir), reverse=True):
            entry_path = os.path.join(output_dir, entry)
            # 查找目录中的 metadata JSON
            if os.path.isdir(entry_path):
                for fname in os.listdir(entry_path):
                    if fname.endswith("-metadata.json") or fname == "metadata.json":
                        meta_path = os.path.join(entry_path, fname)
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                            meta["id"] = entry
                            articles.append(meta)
                        break
            # 也支持直接放在 output_dir 下的 metadata 文件
            elif entry.endswith("-metadata.json"):
                meta_path = os.path.join(output_dir, entry)
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    meta["id"] = entry.replace("-metadata.json", "")
                    articles.append(meta)

    emit("result", status="success", articles=articles)


def handle_get_config(params):
    """读取 JSON 配置文件"""
    config_path = params.get("config_path",
                             os.path.expanduser("~/质取AI/config.json"))
    config = {}
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    emit("result", status="success", config=config)


def handle_save_config(params):
    """保存 JSON 配置文件"""
    config_path = params.get("config_path",
                             os.path.expanduser("~/质取AI/config.json"))
    config_data = params.get("config", {})

    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, ensure_ascii=False, indent=2)

    emit("result", status="success", message="配置已保存")


def main():
    raw = sys.stdin.read()
    try:
        command = json.loads(raw)
    except json.JSONDecodeError:
        emit("error", code="INVALID_INPUT", message="无效的 JSON 输入")
        sys.exit(1)

    action = command.get("action")
    handlers = {
        "generate": handle_generate,
        "validate_key": handle_validate_key,
        "list_articles": handle_list_articles,
        "get_config": handle_get_config,
        "save_config": handle_save_config,
    }

    handler = handlers.get(action)
    if handler:
        try:
            handler(command)
        except Exception as e:
            emit("error", code="INTERNAL_ERROR", message=str(e))
            sys.exit(1)
    else:
        emit("error", code="UNKNOWN_ACTION", message=f"未知操作: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()
