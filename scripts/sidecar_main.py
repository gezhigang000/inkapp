#!/usr/bin/env python3
"""
Sidecar 入口：接收 Tauri 前端命令，输出 JSON Lines 进度。
用法: echo '{"action":"generate","mode":"daily"}' | python3 sidecar_main.py
"""
import sys
import os
import io

# Windows 下强制 UTF-8 编码，避免中文乱码
if sys.platform == "win32":
    # stdin: Rust 发送 UTF-8 字节，Python 默认按 GBK 解码会乱码
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8", errors="replace")
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

import json
import logging
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# PyInstaller 打包后，数据文件在 sys._MEIPASS 目录下
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    PROJECT_ROOT = sys._MEIPASS
else:
    PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 确保 scripts 目录在 import 路径中
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Pillow 等依赖可能在 pylib 目录
PYLIB_DIR = os.path.join(PROJECT_ROOT, "pylib")
if os.path.exists(PYLIB_DIR) and PYLIB_DIR not in sys.path:
    sys.path.insert(0, PYLIB_DIR)

# ============================================================
# 本地日志 & 缓存目录
# 跨平台：Windows 用 %APPDATA%/Ink，macOS/Linux 用 ~/.ink
# ============================================================
if sys.platform == "win32":
    _app_data = os.environ.get("APPDATA", os.path.expanduser("~"))
    INK_HOME = os.path.join(_app_data, "Ink")
else:
    INK_HOME = os.path.join(os.path.expanduser("~"), ".ink")
LOG_DIR = os.path.join(INK_HOME, "logs")
CACHE_DIR = os.path.join(INK_HOME, "cache")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

# 按天滚动的日志文件
_log_file = os.path.join(LOG_DIR, f"{datetime.now().strftime('%Y-%m-%d')}.log")
logging.basicConfig(
    filename=_log_file,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ink")


def emit(event_type, **kwargs):
    """输出一行 JSON 事件到 stdout，同时写入日志"""
    event = {"type": event_type, **kwargs}
    print(json.dumps(event, ensure_ascii=False), flush=True)
    # 写入本地日志
    msg = kwargs.get("message", "")
    if event_type == "error":
        logger.error("emit %s: %s %s", event_type, kwargs.get("code", ""), msg)
    elif event_type == "result":
        logger.info("emit %s: status=%s %s", event_type, kwargs.get("status", ""), msg)
    else:
        logger.info("emit %s: %s", event_type, msg)


def handle_generate(params):
    """处理文章生成请求，集成 daily_ai_news.py 核心逻辑"""
    from datetime import datetime
    from daily_ai_news import (
        generate_article, generate_cover_image,
        extract_html, extract_title, split_article_if_needed,
        make_timestamp, run_video_analysis, save_article,
        pick_daily_variation, append_footer,
    )

    logger.info("=== generate start === mode=%s topic=%s provider=%s",
                params.get("mode"), params.get("topic", "")[:60],
                params.get("provider", "?"))
    emit("progress", stage="init", message="正在加载配置...")

    # 配置完全从前端参数构建，不依赖 config.env 文件
    config = {}
    if params.get("provider"):
        config["LLM_PROVIDER"] = params["provider"]
    for key in ["DEEPSEEK_API_KEY", "GLM_API_KEY", "DOUBAO_API_KEY",
                "KIMI_API_KEY", "OPENAI_API_KEY",
                "DEEPSEEK_MODEL", "GLM_MODEL", "DOUBAO_MODEL",
                "KIMI_MODEL", "OPENAI_MODEL",
                "TAVILY_API_KEY", "SERPAPI_API_KEY",
                "SEARCH_PROVIDER", "OUTPUT_DIR"]:
        if params.get(key):
            config[key] = params[key]

    mode = params.get("mode", "daily")
    topic = params.get("topic", "")
    video_url = params.get("video_url", "")
    file_contents = params.get("file_contents", "")  # 上传文件提取的文本
    template_prompt = params.get("template_prompt", "")  # 模板自定义提示词
    header_html = params.get("header_html", "")  # 文章头部模板
    footer_html = params.get("footer_html", "")  # 文章尾部模板
    # OSS 云存储配置
    oss_config = {}
    for k in ["oss_bucket", "oss_endpoint", "oss_access_key_id", "oss_access_key_secret"]:
        if params.get(k):
            oss_config[k] = params[k]
    default_output = os.path.join(INK_HOME, "articles")
    output_dir = config.get("OUTPUT_DIR", default_output)
    timestamp = make_timestamp()

    try:  # noqa: E501 — 捕获 SystemExit（daily_ai_news 内部 sys.exit）
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

        # 如果有上传文件内容，保持 topic 干净，file_contents 单独传递
        if file_contents and not effective_topic:
            effective_topic = "数据分析报告"

        emit("progress", stage="generating", message="正在生成文章...", percent=20)
        html_content = generate_article(topic=effective_topic, config=config,
                                        custom_prompt=template_prompt,
                                        file_contents=file_contents)
        if not html_content:
            emit("error", code="GENERATION_FAILED", message="文章生成失败，未获得输出")
            return

        # 缓存 LLM 原始输出，方便排查和复用
        cache_file = os.path.join(CACHE_DIR, f"{timestamp}-raw.html")
        try:
            with open(cache_file, "w", encoding="utf-8") as cf:
                cf.write(html_content)
            logger.info("LLM raw output cached: %s (%d chars)", cache_file, len(html_content))
        except OSError:
            pass

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
            # 插入用户自定义头部/尾部模板
            if header_html:
                part_html = header_html + part_html
            if footer_html:
                part_html = part_html + footer_html
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

        # 同步到 OSS
        if len(oss_config) == 4:
            emit("progress", stage="uploading", message="正在同步到云端...", percent=90)
            try:
                for i in range(len(articles)):
                    # 上传文章 HTML
                    oss_article_key = f"articles/{timestamp}/{os.path.basename(filepaths[i])}"
                    _upload_to_oss(filepaths[i], oss_article_key, oss_config)
                    # 上传封面图
                    if img_paths[i] and os.path.exists(img_paths[i]):
                        oss_cover_key = f"articles/{timestamp}/{os.path.basename(img_paths[i])}"
                        _upload_to_oss(img_paths[i], oss_cover_key, oss_config)
                emit("progress", stage="uploading", message="云端同步完成", percent=95)
            except Exception as e:
                emit("progress", stage="uploading",
                     message=f"OSS 同步失败（不影响本地文件）: {e}")

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

    except SystemExit as e:
        logger.error("generate SystemExit code=%s", e.code)
        emit("error", code="GENERATION_ERROR", message=f"生成过程异常退出 (code={e.code})")
    except Exception as e:
        logger.exception("generate exception")
        emit("error", code="GENERATION_ERROR", message=str(e))


def handle_agent_generate(params):
    """处理 Agent 模式生成请求：多轮工具调用"""
    import shutil
    from agent_loop import run_agent_loop, init_workspace
    from daily_ai_news import (
        extract_html, extract_title, append_footer,
        make_timestamp, save_article, generate_cover_image,
        pick_daily_variation,
    )

    logger.info("=== agent_generate start === topic=%s provider=%s",
                params.get("topic", "")[:60], params.get("provider", "?"))
    emit("progress", stage="init", message="正在初始化 Agent...")

    # 构建 config（同 handle_generate）
    config = {}
    if params.get("provider"):
        config["LLM_PROVIDER"] = params["provider"]
    for key in ["DEEPSEEK_API_KEY", "GLM_API_KEY", "DOUBAO_API_KEY",
                "KIMI_API_KEY", "OPENAI_API_KEY",
                "DEEPSEEK_MODEL", "GLM_MODEL", "DOUBAO_MODEL",
                "KIMI_MODEL", "OPENAI_MODEL",
                "TAVILY_API_KEY", "SERPAPI_API_KEY",
                "SEARCH_PROVIDER", "OUTPUT_DIR"]:
        if params.get(key):
            config[key] = params[key]

    topic = params.get("topic", "")
    file_contents = params.get("file_contents", "")
    template_prompt = params.get("template_prompt", "")
    header_html = params.get("header_html", "")
    footer_html = params.get("footer_html", "")
    file_formats = params.get("file_formats", None)

    # OSS 配置
    oss_config = {}
    for k in ["oss_bucket", "oss_endpoint", "oss_access_key_id", "oss_access_key_secret"]:
        if params.get(k):
            oss_config[k] = params[k]

    default_output = os.path.join(INK_HOME, "articles")
    output_dir = config.get("OUTPUT_DIR", default_output)
    timestamp = make_timestamp()

    try:
        # 初始化 workspace
        workspace = init_workspace(timestamp)
        emit("progress", stage="agent", message=f"工作区: {workspace}")

        # 写入上传文件文本
        if file_contents:
            input_path = os.path.join(workspace, "input", "uploaded_data.txt")
            with open(input_path, "w", encoding="utf-8") as f:
                f.write(file_contents)

        # 复制原始文件到 workspace/input/（翻译场景需要原始二进制）
        if file_formats:
            for finfo in file_formats:
                src_path = finfo.get("path", "")
                if src_path and os.path.exists(src_path):
                    try:
                        dst_path = os.path.join(workspace, "input", finfo["name"])
                        shutil.copy2(src_path, dst_path)
                        logger.info("Copied file to workspace: %s", finfo["name"])
                    except (IOError, OSError) as e:
                        logger.warning("Failed to copy %s: %s", finfo["name"], e)

        if not topic:
            topic = "深度调研报告"

        # 运行 Agent 循环
        html_content = run_agent_loop(
            topic=topic,
            config=config,
            emit_fn=emit,
            workspace=workspace,
            template_prompt=template_prompt,
            file_contents=file_contents,
            file_formats=file_formats,
            max_turns=15,
        )

        if not html_content:
            emit("error", code="AGENT_FAILED", message="Agent 未生成输出内容")
            return

        # 后处理：检查 workspace/output/ 下是否有原格式文件（翻译场景）
        output_files = []
        ws_output = os.path.join(workspace, "output")
        if os.path.exists(ws_output):
            for fname in os.listdir(ws_output):
                if fname != "article.html" and not fname.endswith(".tmp"):
                    output_files.append(fname)

        # 缓存 Agent 原始输出
        cache_file = os.path.join(CACHE_DIR, f"{timestamp}-agent-raw.html")
        try:
            with open(cache_file, "w", encoding="utf-8") as cf:
                cf.write(html_content)
        except OSError:
            pass

        emit("progress", stage="processing", message="正在处理文章...", percent=50)

        # 提取 HTML
        extracted = extract_html(html_content)
        if extracted:
            html_content = extracted

        title = extract_title(html_content) or f"Agent 创作 {timestamp}"

        emit("progress", stage="saving", message="正在保存文章...", percent=60)

        # 添加页脚
        html_content = append_footer(html_content)
        if header_html:
            html_content = header_html + html_content
        if footer_html:
            html_content = html_content + footer_html

        filepath = save_article(timestamp, html_content, output_dir)

        emit("progress", stage="cover", message="正在生成封面图...", percent=70)
        today = datetime.now().strftime("%Y-%m-%d")
        variation = pick_daily_variation(today)
        cover_path = generate_cover_image(
            timestamp, title, topic, output_dir,
            cover_theme=variation.get("cover_theme"),
        )

        # 复制原格式文件到文章目录
        article_dir = os.path.dirname(str(filepath))
        file_type = "html"
        for fname in output_files:
            src = os.path.join(ws_output, fname)
            dst = os.path.join(article_dir, fname)
            shutil.copy2(src, dst)
            ext = os.path.splitext(fname)[1].lower()
            if ext in (".docx", ".xlsx", ".pdf"):
                file_type = ext[1:]  # docx/xlsx/pdf
            logger.info("Copied output file: %s", fname)

        # 保存元数据
        metadata = {
            "title": title,
            "date": timestamp[:8],
            "mode": "agent",
            "topic": topic,
            "status": "generated",
            "provider": config.get("LLM_PROVIDER", "deepseek"),
            "file_type": file_type,
            "output_files": output_files,
            "articles": [
                {"title": title, "path": str(filepath),
                 "cover": str(cover_path) if cover_path else ""}
            ],
        }
        meta_path = os.path.join(article_dir, f"{timestamp}-metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        emit("progress", stage="done", message="Agent 创作完成！", percent=100)
        emit("result", status="success", title=title,
             article_path=str(filepath), metadata_path=meta_path,
             file_type=file_type, article_count=1)

    except SystemExit as e:
        logger.error("agent_generate SystemExit code=%s", e.code)
        emit("error", code="AGENT_ERROR", message=f"Agent 异常退出 (code={e.code})")
    except Exception as e:
        logger.exception("agent_generate exception")
        emit("error", code="AGENT_ERROR", message=str(e))


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
                            os.path.join(INK_HOME, "articles"))
    articles = []

    if os.path.exists(output_dir):
        for entry in sorted(os.listdir(output_dir), reverse=True):
            entry_path = os.path.join(output_dir, entry)
            # 查找目录中的 metadata JSON
            if os.path.isdir(entry_path):
                for fname in os.listdir(entry_path):
                    if fname.endswith("-metadata.json") or fname == "metadata.json":
                        meta_path = os.path.join(entry_path, fname)
                        try:
                            with open(meta_path, "r", encoding="utf-8") as f:
                                meta = json.load(f)
                                meta["id"] = entry
                                articles.append(meta)
                        except (json.JSONDecodeError, IOError):
                            pass  # 跳过损坏的 metadata 文件
                        break
            # 也支持直接放在 output_dir 下的 metadata 文件
            elif entry.endswith("-metadata.json"):
                meta_path = os.path.join(output_dir, entry)
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        meta["id"] = entry.replace("-metadata.json", "")
                        articles.append(meta)
                except (json.JSONDecodeError, IOError):
                    pass

    emit("result", status="success", articles=articles)


def handle_get_config(params):
    """读取 JSON 配置文件"""
    config_path = params.get("config_path",
                             os.path.join(INK_HOME, "config.json"))
    config = {}
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    emit("result", status="success", config=config)


def handle_save_config(params):
    """保存 JSON 配置文件"""
    config_path = params.get("config_path",
                             os.path.join(INK_HOME, "config.json"))
    config_data = params.get("config", {})

    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, ensure_ascii=False, indent=2)

    emit("result", status="success", message="配置已保存")


def handle_read_file(params):
    """读取指定文件内容"""
    file_path = params.get("path", "")
    if not file_path or not os.path.exists(file_path):
        emit("error", code="FILE_NOT_FOUND", message=f"文件不存在: {file_path}")
        return
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        emit("result", status="success", content=content)
    except Exception as e:
        emit("error", code="READ_ERROR", message=str(e))


def handle_delete_article(params):
    """删除文章：根据 article_id 删除对应目录或文件"""
    import shutil

    article_id = params.get("article_id", "")
    output_dir = params.get("output_dir",
                            os.path.join(INK_HOME, "articles"))

    if not article_id:
        emit("error", code="MISSING_PARAMS", message="缺少 article_id")
        return

    deleted = []

    # 情况1：article_id 是子目录名
    dir_path = os.path.join(output_dir, article_id)
    if os.path.isdir(dir_path):
        shutil.rmtree(dir_path)
        deleted.append(dir_path)
    else:
        # 情况2：article_id 对应 output_dir 下的散落文件（以 id 为前缀）
        if os.path.exists(output_dir):
            for fname in os.listdir(output_dir):
                if fname.startswith(article_id):
                    fpath = os.path.join(output_dir, fname)
                    os.remove(fpath)
                    deleted.append(fpath)

    if deleted:
        emit("result", status="success",
             message=f"已删除 {len(deleted)} 个文件/目录", deleted=deleted)
    else:
        emit("error", code="NOT_FOUND",
             message=f"未找到文章: {article_id}")


def _upload_to_oss(local_path, oss_key, oss_config):
    """上传文件到阿里云 OSS"""
    import oss2
    auth = oss2.Auth(oss_config["oss_access_key_id"], oss_config["oss_access_key_secret"])
    endpoint = oss_config["oss_endpoint"]
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"
    bucket = oss2.Bucket(auth, endpoint, oss_config["oss_bucket"])
    bucket.put_object_from_file(oss_key, local_path)


def handle_render_template(params):
    """用 AI 将纯文本渲染为微信公众号风格的 HTML 片段"""
    from llm_adapter import generate, LLMError

    text = params.get("text", "").strip()
    position = params.get("position", "footer")  # header or footer
    if not text:
        emit("error", code="MISSING_PARAMS", message="缺少 text 参数")
        return

    config = {}
    provider = params.get("provider", "deepseek")
    config["LLM_PROVIDER"] = provider
    for key in ["DEEPSEEK_API_KEY", "GLM_API_KEY", "DOUBAO_API_KEY",
                "KIMI_API_KEY", "OPENAI_API_KEY",
                "DEEPSEEK_MODEL", "GLM_MODEL", "DOUBAO_MODEL",
                "KIMI_MODEL", "OPENAI_MODEL"]:
        if params.get(key):
            config[key] = params[key]

    border = "border-bottom" if position == "header" else "border-top"
    prompt = f"""请将以下文字渲染为微信公众号文章{('头部' if position == 'header' else '尾部')}的 HTML 片段。

要求：
- 全部使用内联 CSS 样式
- 风格简洁美观，适合微信公众号
- 字体：-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif
- 正文字号 14-15px，颜色 #333 或 #666
- 居中对齐
- 用 section 标签包裹，带 {border} 分隔线
- 只输出 HTML 代码，不要任何说明文字

文字内容：
{text}"""

    try:
        html = generate(prompt, config, timeout=60, need_search=False)
        if html:
            # 提取 HTML 部分
            from daily_ai_news import extract_html
            extracted = extract_html(html)
            emit("result", status="success", content=extracted or html)
        else:
            emit("error", code="RENDER_FAILED", message="渲染失败，未获得输出")
    except Exception as e:
        emit("error", code="RENDER_ERROR", message=str(e))


def handle_extract_files(params):
    """提取上传文件的文本内容，支持 Excel/PDF/Word"""
    file_paths = params.get("file_paths", [])
    if not file_paths:
        emit("error", code="MISSING_PARAMS", message="缺少 file_paths")
        return

    results = []
    for fpath in file_paths:
        if not os.path.exists(fpath):
            results.append({"path": fpath, "error": "文件不存在"})
            continue

        ext = os.path.splitext(fpath)[1].lower()
        name = os.path.basename(fpath)
        try:
            if ext in (".xlsx", ".xls"):
                text = _extract_excel(fpath)
            elif ext == ".pdf":
                text = _extract_pdf(fpath)
            elif ext in (".docx", ".doc"):
                text = _extract_docx(fpath)
            elif ext in (".pptx", ".ppt"):
                text = _extract_pptx(fpath)
            elif ext in (".txt", ".md", ".csv"):
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()
            else:
                results.append({"path": fpath, "name": name,
                                "error": f"不支持的文件类型: {ext}"})
                continue

            # 截断过长内容（避免超出 LLM 上下文）
            max_chars = 50000
            if len(text) > max_chars:
                text = text[:max_chars] + f"\n\n... (内容已截断，原文共 {len(text)} 字符)"

            results.append({"path": fpath, "name": name, "text": text,
                            "chars": len(text)})
        except Exception as e:
            results.append({"path": fpath, "name": name, "error": str(e)})

    emit("result", status="success", files=results)


def _extract_excel(fpath):
    """提取 Excel 文件内容为文本表格"""
    import openpyxl
    wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
    parts = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = []
        for row in ws.iter_rows(values_only=True):
            cells = [str(c) if c is not None else "" for c in row]
            rows.append(" | ".join(cells))
        if rows:
            parts.append(f"## Sheet: {sheet_name}\n" + "\n".join(rows))
    wb.close()
    return "\n\n".join(parts) if parts else "(空表格)"


def _extract_pdf(fpath):
    """提取 PDF 文件文本"""
    import pdfplumber
    parts = []
    with pdfplumber.open(fpath) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                parts.append(f"--- 第 {i+1} 页 ---\n{text}")
            # 提取表格
            tables = page.extract_tables()
            for t_idx, table in enumerate(tables):
                table_text = "\n".join(
                    " | ".join(str(c) if c else "" for c in row)
                    for row in table
                )
                parts.append(f"[表格 {t_idx+1}]\n{table_text}")
    return "\n\n".join(parts) if parts else "(空 PDF)"


def _extract_docx(fpath):
    """提取 Word 文档文本"""
    from docx import Document
    doc = Document(fpath)
    parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)
    # 提取表格
    for t_idx, table in enumerate(doc.tables):
        rows = []
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(" | ".join(cells))
        if rows:
            parts.append(f"[表格 {t_idx+1}]\n" + "\n".join(rows))
    return "\n".join(parts) if parts else "(空文档)"


def _extract_pptx(fpath):
    """提取 PPT 文件内容为文本"""
    from pptx import Presentation
    prs = Presentation(fpath)
    parts = []
    for i, slide in enumerate(prs.slides):
        slide_parts = [f"--- 第 {i+1} 页 ---"]
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    text = para.text.strip()
                    if text:
                        slide_parts.append(text)
            if shape.has_table:
                table = shape.table
                rows = []
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    rows.append(" | ".join(cells))
                if rows:
                    slide_parts.append("[表格]\n" + "\n".join(rows))
        if len(slide_parts) > 1:
            parts.append("\n".join(slide_parts))
    return "\n\n".join(parts) if parts else "(空 PPT)"


def _cleanup_old_logs(max_days=7):
    """清理超过 max_days 天的日志文件"""
    import glob
    cutoff = datetime.now().timestamp() - max_days * 86400
    for f in glob.glob(os.path.join(LOG_DIR, "*.log")):
        if os.path.getmtime(f) < cutoff:
            try:
                os.remove(f)
            except OSError:
                pass


def _cleanup_old_cache(max_days=3):
    """清理超过 max_days 天的缓存文件"""
    import glob
    cutoff = datetime.now().timestamp() - max_days * 86400
    for f in glob.glob(os.path.join(CACHE_DIR, "*")):
        if os.path.getmtime(f) < cutoff:
            try:
                os.remove(f)
            except OSError:
                pass


def handle_get_logs(params):
    """读取最近的日志内容"""
    lines = params.get("lines", 100)
    log_file = os.path.join(LOG_DIR, f"{datetime.now().strftime('%Y-%m-%d')}.log")
    if not os.path.exists(log_file):
        emit("result", status="success", content="暂无日志", log_dir=LOG_DIR)
        return
    with open(log_file, "r", encoding="utf-8", errors="replace") as f:
        all_lines = f.readlines()
    tail = all_lines[-lines:]
    emit("result", status="success", content="".join(tail), log_dir=LOG_DIR)


def handle_clear_cache(params):
    """清理缓存目录"""
    import glob
    count = 0
    for f in glob.glob(os.path.join(CACHE_DIR, "*")):
        try:
            os.remove(f)
            count += 1
        except OSError:
            pass
    emit("result", status="success", message=f"已清理 {count} 个缓存文件")


def main():
    # 启动时清理过期日志和缓存
    _cleanup_old_logs()
    _cleanup_old_cache()

    raw = sys.stdin.read()
    try:
        command = json.loads(raw)
    except json.JSONDecodeError:
        emit("error", code="INVALID_INPUT", message="无效的 JSON 输入")
        sys.exit(1)

    action = command.get("action")
    logger.info("action=%s", action)
    handlers = {
        "generate": handle_generate,
        "agent_generate": handle_agent_generate,
        "validate_key": handle_validate_key,
        "list_articles": handle_list_articles,
        "get_config": handle_get_config,
        "save_config": handle_save_config,
        "read_file": handle_read_file,
        "delete_article": handle_delete_article,
        "extract_files": handle_extract_files,
        "render_template": handle_render_template,
        "get_logs": handle_get_logs,
        "clear_cache": handle_clear_cache,
    }

    handler = handlers.get(action)
    if handler:
        try:
            handler(command)
        except Exception as e:
            logger.exception("handler %s failed", action)
            emit("error", code="INTERNAL_ERROR", message=str(e))
            sys.exit(1)
    else:
        logger.warning("unknown action: %s", action)
        emit("error", code="UNKNOWN_ACTION", message=f"未知操作: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()
