#!/usr/bin/env python3
"""
微信公众号 AI 日报自动生成 & 发布工具

用法:
    python3 daily_ai_news.py                          # 默认方向，生成 + 存草稿
    python3 daily_ai_news.py --local                  # 仅生成本地 HTML + 封面图
    python3 daily_ai_news.py --topic "AI Agent"       # 指定方向
    python3 daily_ai_news.py --publish                # 生成 + 直接发布
    python3 daily_ai_news.py --topic "多模态" --local  # 指定方向 + 仅本地
    python3 daily_ai_news.py --video "https://www.youtube.com/watch?v=..." --local  # 视频深度分析
"""

import os
import sys
import json
import math
import random
import hashlib
import subprocess
import re
from datetime import datetime
from pathlib import Path

# Pillow 可能装在项目本地目录
# PyInstaller 打包后，数据文件在 sys._MEIPASS 目录下
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # PyInstaller 打包环境
    BUNDLE_DIR = Path(sys._MEIPASS)
    SCRIPT_DIR = BUNDLE_DIR
    PROJECT_ROOT = BUNDLE_DIR
else:
    # 开发环境
    SCRIPT_DIR = Path(__file__).parent           # scripts/
    PROJECT_ROOT = SCRIPT_DIR.parent             # 项目根目录

PYLIB_DIR = PROJECT_ROOT / "pylib"
if PYLIB_DIR.exists():
    sys.path.insert(0, str(PYLIB_DIR))

CONFIG_FILE = PROJECT_ROOT / "config.env"

# 提示词：优先使用用户自定义目录，回退到内置默认
_USER_PROMPTS_DIR = Path.home() / "Ink" / "prompts"
_BUNDLED_PROMPTS_DIR = PROJECT_ROOT / "prompts"

def _resolve_prompt(filename):
    """优先用户目录，回退内置"""
    user_path = _USER_PROMPTS_DIR / filename
    if user_path.exists():
        return user_path
    return _BUNDLED_PROMPTS_DIR / filename

PROMPT_FILE = _resolve_prompt("prompt_template.txt")
TOPIC_PROMPT_FILE = _resolve_prompt("topic_prompt_template.txt")
QRCODE_IMAGE = PROJECT_ROOT / "assets" / "扫码_搜索联合传播样式-白色版-compressed.jpg"
QRCODE_URL_CACHE = Path.home() / "Ink" / ".qrcode_url.cache"


# ============================================================
# 内容多样化配置
# ============================================================

# 聚焦话题池（未指定 --topic 时自动轮换）
TOPIC_POOL = [
    None,  # 不指定话题，自由发挥
    None,  # 增加"自由发挥"的权重
    "AI Agent 与自动化工作流",
    "大模型推理能力与 CoT",
    "AI 编程与开发工具",
    "多模态模型（视觉/音频/视频）",
    "开源模型生态",
    "AI 安全与对齐",
    "端侧与小模型部署",
    "RAG 与知识管理",
    "AI 在企业落地的真实案例",
    "模型训练与微调实践",
]

# 写作视角池
ANGLE_POOL = [
    "从一线开发者的角度，聊聊这些动态对日常开发工作流的实际影响",
    "从技术架构的角度，分析这些更新背后的技术决策和设计取舍",
    "从产品和应用的角度，聊聊这些技术进展会催生什么新的产品形态",
    "带着批判性思维，冷静分析哪些是真突破、哪些是营销包装",
    "从开源社区和开发者生态的角度，分析这些动态对技术民主化的影响",
    "站在创业者和独立开发者的视角，聊聊哪些技术更新值得立刻跟进",
    "从 AI 应用的 ROI 角度，分析这些更新对企业降本增效的实际价值",
    "结合自身使用体验和工程实践，做一次真实的上手测评式分享",
]

# 信息源池（每次随机选 3-4 家）
COMPANY_POOL = [
    "Google/DeepMind",
    "OpenAI",
    "Anthropic",
    "Meta AI",
    "Mistral AI",
    "xAI (Grok)",
    "Apple Intelligence",
    "Microsoft/GitHub Copilot",
    "Stability AI",
    "Cohere",
]

# 核心公司（保证至少选一家）
CORE_COMPANIES = ["Google/DeepMind", "OpenAI", "Anthropic"]

# 文章体裁池
STRUCTURE_POOL = [
    "速览体：3-5 个知识点快速过一遍，每个配一段工程师点评",
    "深度体：选 1-2 个最重磅的更新做深度解读，其余简要提及",
    "对比体：找到 2-3 个可以横向对比的更新，用对比分析的方式展开",
    "趋势体：从本周多个动态中提炼出 1-2 个行业趋势，用案例佐证",
    "实操体：聚焦可以立刻上手试用的更新，给出具体使用建议和踩坑提醒",
]

# 封面图配色方案池（以深色为主，护眼舒适）
COVER_THEMES = [
    {"bg": "#1f2937", "accent": "#6b8aad", "text": "#e5e7eb"},   # 暗钢蓝
    {"bg": "#1e293b", "accent": "#64748b", "text": "#f1f5f9"},   # 深靛
    {"bg": "#2d3748", "accent": "#8fa3bf", "text": "#e2e8f0"},   # 深蓝灰
    {"bg": "#292524", "accent": "#a8967a", "text": "#f5f0eb"},   # 深棕
    {"bg": "#1a2332", "accent": "#7b9eb8", "text": "#dce6f0"},   # 深海蓝
    {"bg": "#232b3e", "accent": "#8893a8", "text": "#e8ecf1"},   # 暗靛蓝
    {"bg": "#2a2f38", "accent": "#9ca3af", "text": "#f3f4f6"},   # 深石墨
    {"bg": "#1c2a35", "accent": "#6d95b0", "text": "#e0eaf2"},   # 深雾蓝
    {"bg": "#2b2d3a", "accent": "#8b8fad", "text": "#e6e7f0"},   # 暗薰衣草
    {"bg": "#e5e5e5", "accent": "#555555", "text": "#1a1a1a"},   # 浅灰（经典）
    {"bg": "#d6dce4", "accent": "#4a5568", "text": "#1a202c"},   # 蓝灰（浅色）
]


def pick_daily_variation(today_str):
    """
    根据日期生成当天的内容变化组合。
    使用日期作为随机种子，保证同一天多次运行结果一致，
    但不同天之间有变化。
    """
    seed = int(hashlib.md5(today_str.encode()).hexdigest(), 16)
    rng = random.Random(seed)

    # 选话题
    topic = rng.choice(TOPIC_POOL)

    # 选视角
    angle = rng.choice(ANGLE_POOL)

    # 选公司：保证至少 1 家核心公司 + 随机补充到 3-4 家
    core = rng.sample(CORE_COMPANIES, k=rng.randint(1, 2))
    others = [c for c in COMPANY_POOL if c not in core]
    extra_count = rng.randint(1, 2)
    extra = rng.sample(others, k=min(extra_count, len(others)))
    companies = core + extra
    rng.shuffle(companies)

    # 选体裁
    structure = rng.choice(STRUCTURE_POOL)

    # 选封面配色
    cover_theme = rng.choice(COVER_THEMES)

    return {
        "topic": topic,
        "angle": angle,
        "companies": companies,
        "structure": structure,
        "cover_theme": cover_theme,
    }


# ============================================================
# 配置加载
# ============================================================


def load_config():
    """从 config.env 加载配置"""
    config = {}
    if not CONFIG_FILE.exists():
        print(f"[错误] 配置文件不存在: {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()
    return config


def parse_args():
    """解析命令行参数"""
    args = {
        "local": False,
        "publish": False,
        "topic": None,
        "video": None,
    }
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--local":
            args["local"] = True
        elif sys.argv[i] == "--publish":
            args["publish"] = True
        elif sys.argv[i] == "--topic" and i + 1 < len(sys.argv):
            i += 1
            args["topic"] = sys.argv[i]
        elif sys.argv[i] == "--video" and i + 1 < len(sys.argv):
            i += 1
            args["video"] = sys.argv[i]
        i += 1
    return args


# ============================================================
# 时间戳 & 文件名
# ============================================================


def make_timestamp():
    """生成精确到秒的时间戳，用于文件命名"""
    return datetime.now().strftime("%Y%m%d-%H%M%S")


# ============================================================
# 第一步: 调用 Claude CLI 生成文章
# ============================================================


def generate_article(topic=None, config=None, custom_prompt=None):
    """调用 LLM 生成文章。topic 指定时走深度调研，否则走日报模式。
    custom_prompt: 模板自定义提示词，包含 {{TOPIC}} 占位符，覆盖默认提示词。
    """
    if config is None:
        config = {}
    today = datetime.now().strftime("%Y-%m-%d")

    if topic:
        return _generate_topic_research(topic, today, config, custom_prompt=custom_prompt)
    else:
        return _generate_daily_news(today, config, custom_prompt=custom_prompt)


def _generate_topic_research(topic, today, config, custom_prompt=None):
    """深度调研模式：围绕指定 topic 搜索官方资料做深度分析"""
    from llm_adapter import generate, LLMError
    from search_adapter import search_and_fetch

    if custom_prompt:
        # 使用模板自定义提示词，替换 {{TOPIC}} 占位符
        prompt = f"今天是 {today}。\n\n" + custom_prompt.replace("{{TOPIC}}", topic)
    else:
        with open(TOPIC_PROMPT_FILE, "r", encoding="utf-8") as f:
            prompt_template = f.read()
        prompt = f"今天是 {today}。\n\n" + prompt_template.replace("{{TOPIC}}", topic)

    provider = config.get("LLM_PROVIDER", "claude").lower()
    print(f"[1/4] 正在调用 AI 深度调研「{topic}」...")
    print(f"      模式: 深度调研（搜索官方文档和英文资料）")
    print(f"      提供商: {provider}")
    print("      (这一步需要联网搜索，请耐心等待)")

    try:
        if provider == "claude":
            output = generate(prompt, config, timeout=1200, need_search=True)
        else:
            context = search_and_fetch(
                [f"{topic} 最新进展 2026", f"{topic} official announcement"],
                config,
            )
            full_prompt = f"以下是搜索到的最新资料：\n\n{context}\n\n---\n\n{prompt}"
            output = generate(full_prompt, config, timeout=600)
    except LLMError as e:
        print(f"[错误] {e}")
        sys.exit(1)

    html_content = extract_html(output)
    if not html_content:
        # LLM 返回了 Markdown 而非 HTML，尝试转换
        print("[警告] AI 未返回 HTML 格式，自动转换 Markdown 为 HTML")
        html_content = _markdown_to_html(output)

    return html_content


def _generate_daily_news(today, config, custom_prompt=None):
    """日报模式：搜索多家公司最新动态生成日报"""
    from llm_adapter import generate, LLMError
    from search_adapter import search_and_fetch

    # 获取当天的内容变化组合
    variation = pick_daily_variation(today)

    effective_topic = variation["topic"]

    companies = list(variation["companies"])
    companies_str = "、".join(companies)

    if custom_prompt:
        # 使用模板自定义提示词
        prompt = f"今天是 {today}。\n\n" + custom_prompt.replace("{{TOPIC}}", effective_topic or "AI")
    else:
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            prompt_template = f.read()

        # 构建变化部分的 prompt
        variation_parts = []
        variation_parts.append(f"今天是 {today}。\n")

        if effective_topic:
            variation_parts.append(f"本期聚焦方向：「{effective_topic}」")
            variation_parts.append(
                f"请围绕这个方向，从以下公司的最新动态中筛选最相关的内容来撰写文章。"
                f"如果该方向近期没有足够新闻，可以适当扩展到技术进展、行业应用和趋势分析。\n"
            )

        variation_parts.append(f"本期关注的公司/团队：{companies_str}")
        variation_parts.append(f"写作视角：{variation['angle']}")
        variation_parts.append(f"文章体裁：{variation['structure']}")
        variation_parts.append("")  # 空行分隔

        prompt = "\n".join(variation_parts) + "\n" + prompt_template

    provider = config.get("LLM_PROVIDER", "claude").lower()
    topic_label = f"（方向: {effective_topic}）" if effective_topic else ""
    print(f"[1/4] 正在调用 AI 生成 {today} AI 日报{topic_label}...")
    print(f"      关注公司: {companies_str}")
    print(f"      写作视角: {variation['angle'][:30]}...")
    print(f"      文章体裁: {variation['structure'][:20]}...")
    print(f"      提供商: {provider}")
    print("      (这一步需要联网搜索，请耐心等待)")

    try:
        if provider == "claude":
            output = generate(prompt, config, timeout=600, need_search=True)
        else:
            # 构造搜索查询：用公司名和话题
            queries = []
            for company in companies[:3]:
                queries.append(f"{company} AI latest news 2026")
            if effective_topic:
                queries.append(f"{effective_topic} 最新进展 2026")
            context = search_and_fetch(queries, config)
            full_prompt = f"以下是搜索到的最新资料：\n\n{context}\n\n---\n\n{prompt}"
            output = generate(full_prompt, config, timeout=600)
    except LLMError as e:
        print(f"[错误] {e}")
        sys.exit(1)

    html_content = extract_html(output)
    if not html_content:
        print("[警告] AI 未返回 HTML 格式，自动转换 Markdown 为 HTML")
        html_content = _markdown_to_html(output)

    return html_content


def extract_html(text):
    """从 Claude 输出中提取 HTML section 内容"""
    match = re.search(r"(<section[\s\S]*</section>)\s*$", text)
    if match:
        return match.group(1)

    text = re.sub(r"^```html?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    match = re.search(r"(<section[\s\S]*</section>)\s*$", text)
    if match:
        return match.group(1)

    return None


def _markdown_to_html(text):
    """将 Markdown 文本转换为微信公众号风格的内联样式 HTML"""
    lines = text.strip().split("\n")
    html_parts = []
    in_list = False
    in_code = False
    code_buf = []
    font = "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            if in_code:
                html_parts.append(
                    f'<pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;'
                    f'border-radius:8px;font-size:13px;overflow-x:auto;'
                    f'font-family:Menlo,monospace;margin:12px 0;">'
                    + "\n".join(code_buf) + '</pre>')
                code_buf = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_buf.append(stripped)
            continue
        if in_list and not stripped.startswith(("- ", "* ")):
            html_parts.append("</ul>")
            in_list = False
        if stripped.startswith("### "):
            t = _inline_md(stripped[4:].strip().strip("*"))
            html_parts.append(f'<h3 style="font-size:17px;font-weight:700;color:#222;margin:20px 0 8px;font-family:{font};">{t}</h3>')
        elif stripped.startswith("## "):
            t = _inline_md(stripped[3:].strip().strip("*"))
            html_parts.append(f'<h2 style="font-size:19px;font-weight:700;color:#111;margin:24px 0 10px;font-family:{font};">{t}</h2>')
        elif stripped.startswith("# "):
            t = _inline_md(stripped[2:].strip().strip("*"))
            html_parts.append(f'<h1 style="font-size:22px;font-weight:700;color:#111;margin:28px 0 12px;font-family:{font};">{t}</h1>')
        elif stripped.startswith(("- ", "* ")):
            if not in_list:
                html_parts.append('<ul style="padding-left:20px;margin:8px 0;">')
                in_list = True
            html_parts.append(f'<li style="font-size:15px;line-height:1.8;color:#333;margin:4px 0;font-family:{font};">{_inline_md(stripped[2:].strip())}</li>')
        elif stripped.startswith("---"):
            html_parts.append('<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">')
        elif stripped:
            html_parts.append(f'<p style="font-size:15px;line-height:1.8;color:#333;margin:10px 0;font-family:{font};">{_inline_md(stripped)}</p>')
    if in_list:
        html_parts.append("</ul>")
    return '<section style="padding:10px 0;">' + "\n".join(html_parts) + "</section>"


def _inline_md(text):
    """处理行内 Markdown：加粗、斜体、行内代码"""
    text = re.sub(r"\*\*(.+?)\*\*", r'<strong style="color:#111;">\1</strong>', text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"`(.+?)`", r'<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:13px;color:#d63384;">\1</code>', text)
    return text


def extract_title(html_content):
    """从 HTML 中提取文章标题（兼容多种标签写法）"""
    # 优先匹配 h1/h2 标签
    match = re.search(r"<h[12][^>]*>(.*?)</h[12]>", html_content, re.DOTALL)
    if match:
        title = re.sub(r"<[^>]+>", "", match.group(1)).strip()
        if title:
            return title

    # 兼容 section 样式标题：font-size >= 20px 且 font-weight 含 bold/700/800/900
    pattern = r'<section[^>]*style="[^"]*font-size:\s*(\d+)px[^"]*font-weight:\s*(\w+)[^"]*"[^>]*>(.*?)</section>'
    for m in re.finditer(pattern, html_content, re.DOTALL):
        size = int(m.group(1))
        weight = m.group(2)
        if size >= 20 and weight in ("bold", "700", "800", "900"):
            title = re.sub(r"<[^>]+>", "", m.group(3)).strip()
            if len(title) > 5:
                return title

    # 兼容反序写法：font-weight 在 font-size 前
    pattern2 = r'<section[^>]*style="[^"]*font-weight:\s*(\w+)[^"]*font-size:\s*(\d+)px[^"]*"[^>]*>(.*?)</section>'
    for m in re.finditer(pattern2, html_content, re.DOTALL):
        weight = m.group(1)
        size = int(m.group(2))
        if size >= 20 and weight in ("bold", "700", "800", "900"):
            title = re.sub(r"<[^>]+>", "", m.group(3)).strip()
            if len(title) > 5:
                return title

    return None


# ============================================================
# 文章拆分（内容过长时自动拆为系列文章）
# ============================================================

# HTML 字符数阈值，超过此值则尝试拆分
SPLIT_THRESHOLD = 25000

# 系列文章命名
SERIES_NAMES_2 = ["（上）", "（下）"]
SERIES_NAMES_N = ["（一）", "（二）", "（三）", "（四）", "（五）", "（六）"]


def _find_part_boundaries(html):
    """
    查找文章中的 PART 分界点。
    返回 [(start_pos, part_number), ...]，每个元素表示一个 PART 的起始位置。
    """
    boundaries = []
    for m in re.finditer(r'<!--\s*PART\s*(\d+)', html):
        boundaries.append((m.start(), int(m.group(1))))
    return boundaries


def _find_outer_wrapper(html):
    """
    提取文章最外层 <section> 的开标签和闭标签。
    返回 (opening_tag, header_html, footer_html)。
    header_html 是从开标签到第一个 PART 之间的内容（标题区等）。
    footer_html 是最后一个可识别尾部到 </section> 之间的内容。
    """
    # 开标签：第一个 <section
    open_match = re.match(r'(<section[^>]*>)', html)
    opening_tag = open_match.group(1) if open_match else '<section>'

    # 查找 header（开标签到第一个 PART 之间）
    first_part = re.search(r'<!--\s*PART\s*\d+', html)
    if first_part:
        header_html = html[len(opening_tag):first_part.start()]
    else:
        header_html = ""

    # 查找 footer（<!-- 尾部 --> 到最后的 </section> 之间的内容）
    footer_match = re.search(r'(<!--\s*尾部\s*-->.*?</section>)\s*</section>\s*$', html, re.DOTALL)
    if footer_match:
        footer_html = footer_match.group(1)
    else:
        # 尝试找 — END — 标记
        end_match = re.search(r'(<section[^>]*>.*?—\s*END\s*—.*?</section>)\s*</section>\s*$', html, re.DOTALL)
        if end_match:
            footer_html = end_match.group(1)
        else:
            footer_html = ""

    return opening_tag, header_html, footer_html


def _series_name(part_index, total_parts):
    """获取系列文章的序号名称"""
    if total_parts == 2:
        return SERIES_NAMES_2[part_index]
    elif part_index < len(SERIES_NAMES_N):
        return SERIES_NAMES_N[part_index]
    else:
        return f"（{part_index + 1}）"


def _make_continuation_note(title, part_index, total_parts, is_end=False):
    """生成系列文章的衔接提示 HTML"""
    if is_end:
        # 最后一篇：系列完结
        return (
            '<section style="margin-top:30px;padding:16px 20px;background:#f8fafc;'
            'border-left:3px solid #4a6cf7;border-radius:4px;">'
            f'<p style="font-size:14px;color:#666;margin:0;">'
            f'本文为「{title}」系列第 {part_index + 1} 篇（共 {total_parts} 篇），系列完结。</p>'
            '</section>'
        )
    else:
        next_name = _series_name(part_index + 1, total_parts)
        return (
            '<section style="margin-top:30px;padding:16px 20px;background:#f8fafc;'
            'border-left:3px solid #4a6cf7;border-radius:4px;">'
            f'<p style="font-size:14px;color:#666;margin:0;">'
            f'本文为「{title}」系列第 {part_index + 1} 篇（共 {total_parts} 篇），'
            f'请继续阅读下一篇{next_name}。</p>'
            '</section>'
        )


def split_article_if_needed(html_content, title):
    """
    检查文章长度，如果超过阈值则按 PART 边界自动拆分为系列文章。

    返回:
        [(title_with_series, html_content), ...]
        如果不需要拆分，返回单元素列表。
    """
    if len(html_content) <= SPLIT_THRESHOLD:
        return [(title, html_content)]

    boundaries = _find_part_boundaries(html_content)
    if len(boundaries) < 2:
        # 没有足够的 PART 标记来拆分，原样返回
        return [(title, html_content)]

    opening_tag, header_html, footer_html = _find_outer_wrapper(html_content)

    # 确定 footer 在原文中的起始位置
    if footer_html:
        footer_start = html_content.rfind(footer_html)
    else:
        footer_start = len(html_content)

    # 提取每个 PART 的内容
    part_contents = []
    for i, (start, _num) in enumerate(boundaries):
        if i + 1 < len(boundaries):
            end = boundaries[i + 1][0]
        else:
            end = footer_start
        part_contents.append(html_content[start:end])

    # 贪心分组：把 PART 内容累积，直到快超过阈值就切一刀
    # 每个分组的开销 = opening_tag + header + footer + closing_tag
    overhead = len(opening_tag) + len(header_html) + len(footer_html) + len('</section>') + 500
    budget = SPLIT_THRESHOLD - overhead

    groups = []
    current_group = []
    current_size = 0

    for content in part_contents:
        if current_group and current_size + len(content) > budget:
            groups.append(current_group)
            current_group = [content]
            current_size = len(content)
        else:
            current_group.append(content)
            current_size += len(content)

    if current_group:
        groups.append(current_group)

    if len(groups) <= 1:
        # 分不出多组，原样返回
        return [(title, html_content)]

    total_parts = len(groups)
    base_title = title or "Ink"
    print(f"      [拆分] 文章过长（{len(html_content)} 字符），自动拆分为 {total_parts} 篇系列文章")

    result = []
    for idx, group in enumerate(groups):
        series_name = _series_name(idx, total_parts)
        part_title = f"{base_title}{series_name}"

        is_last = (idx == total_parts - 1)
        continuation = _make_continuation_note(base_title, idx, total_parts, is_end=is_last)

        # 组装该篇的完整 HTML
        parts_html = "\n".join(group)
        part_html = (
            f"{opening_tag}\n"
            f"{header_html}\n"
            f"{parts_html}\n"
            f"{continuation}\n"
            f"{footer_html}\n"
            f"</section>"
        )

        result.append((part_title, part_html))
        print(f"      [拆分] 第 {idx + 1} 篇「{part_title}」: {len(part_html)} 字符，含 {len(group)} 个 PART")

    return result


# ============================================================
# 第二步: 保存文章
# ============================================================


def save_article(timestamp, html_content, output_dir, suffix=""):
    """保存文章到本地"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    filename = f"{timestamp}-ai-daily{suffix}.html"
    filepath = output_path / filename
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[2/4] 文章已保存: {filepath}")
    return filepath


# ============================================================
# 第三步: 生成封面图
# ============================================================


def _hex_to_rgb(hex_color):
    """将十六进制颜色转换为 RGB 元组"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _blend_color(fg_hex, bg_hex, alpha):
    """将前景色与背景色按给定透明度混合"""
    fg = _hex_to_rgb(fg_hex)
    bg = _hex_to_rgb(bg_hex)
    return tuple(int(bg[i] + (fg[i] - bg[i]) * alpha) for i in range(3))


def _make_rng(title=""):
    """基于标题和当前时间创建随机数生成器，确保同一标题同一时间生成相同图案"""
    seed_str = f"{title}-{datetime.now().strftime('%Y-%m-%d-%H%M')}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    return random.Random(seed)


# --- 布局 1：角落同心圆弧（参考 2.png 风格）---
def _layout_corner_concentric(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.35)
    c2 = _blend_color(accent, bg, 0.20)

    # 右上角同心圆弧
    cx, cy = W + 10, -10
    for i in range(6):
        r = 60 + i * 35
        draw.arc([(cx - r, cy - r), (cx + r, cy + r)],
                 start=90, end=270, fill=c1 if i % 2 == 0 else c2, width=2)

    # 左下角同心圆弧
    cx, cy = -10, H + 10
    for i in range(5):
        r = 50 + i * 35
        draw.arc([(cx - r, cy - r), (cx + r, cy + r)],
                 start=-90, end=90, fill=c1 if i % 2 == 0 else c2, width=2)


# --- 布局 2：右侧网络节点 ---
def _layout_network_nodes(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.25)
    c2 = _blend_color(accent, bg, 0.15)
    c3 = _blend_color(accent, bg, 0.35)

    for x in range(W // 2, W, 45):
        for y in range(20, H - 20, 45):
            if rng.random() < 0.25:
                continue
            r = rng.choice([2, 3, 4])
            draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=c1)

    for _ in range(3):
        cx, cy = rng.randint(W // 2, W + 100), rng.randint(-50, H + 50)
        radius = rng.randint(80, 200)
        sa = rng.randint(0, 180)
        draw.arc([(cx - radius, cy - radius), (cx + radius, cy + radius)],
                 start=sa, end=sa + rng.randint(60, 180), fill=c2, width=2)

    for _ in range(2):
        cx, cy = rng.randint(W * 2 // 3, W - 30), rng.randint(30, H - 30)
        size = rng.randint(25, 50)
        pts = [(cx + size * math.cos(math.radians(60 * i - 30)),
                cy + size * math.sin(math.radians(60 * i - 30))) for i in range(6)]
        draw.polygon(pts, outline=c3)

    nodes = []
    for x in range(W * 2 // 3, W - 20, 55):
        for y in range(30, H - 30, 55):
            if rng.random() < 0.4:
                nodes.append((x + rng.randint(-10, 10), y + rng.randint(-10, 10)))
    for i, (x1, y1) in enumerate(nodes):
        for x2, y2 in nodes[i + 1:]:
            if math.hypot(x2 - x1, y2 - y1) < 100 and rng.random() < 0.5:
                draw.line([(x1, y1), (x2, y2)], fill=c2, width=1)
    for x, y in nodes:
        draw.ellipse([(x - 4, y - 4), (x + 4, y + 4)], fill=c3)


# --- 布局 3：电路板风格 ---
def _layout_circuit(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.20)
    c2 = _blend_color(accent, bg, 0.30)

    for _ in range(10):
        x = rng.randint(W // 4, W - 20)
        y = rng.randint(10, H - 10)
        segments = rng.randint(2, 5)
        direction = rng.choice(['h', 'v'])
        for _ in range(segments):
            length = rng.randint(40, 150)
            if direction == 'h':
                x2 = min(max(x + rng.choice([-1, 1]) * length, 0), W)
                draw.line([(x, y), (x2, y)], fill=c1, width=1)
                draw.ellipse([(x2 - 3, y - 3), (x2 + 3, y + 3)], fill=c2)
                x = x2
                direction = 'v'
            else:
                y2 = min(max(y + rng.choice([-1, 1]) * length, 0), H)
                draw.line([(x, y), (x, y2)], fill=c1, width=1)
                draw.ellipse([(x - 3, y2 - 3), (x + 3, y2 + 3)], fill=c2)
                y = y2
                direction = 'h'

    for _ in range(5):
        cx = rng.randint(W // 3, W - 30)
        cy = rng.randint(20, H - 20)
        s = rng.randint(8, 18)
        draw.rectangle([(cx - s, cy - s), (cx + s, cy + s)], outline=c2)
        for offset in range(-s + 4, s, 6):
            draw.line([(cx + offset, cy - s), (cx + offset, cy - s - 6)], fill=c1, width=1)
            draw.line([(cx + offset, cy + s), (cx + offset, cy + s + 6)], fill=c1, width=1)


# --- 布局 4：大圆弧 + 散布圆点 ---
def _layout_arcs_dots(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.30)
    c2 = _blend_color(accent, bg, 0.18)
    c3 = _blend_color(accent, bg, 0.12)

    # 大弧线穿过画面
    for _ in range(4):
        cx = rng.randint(-100, W + 100)
        cy = rng.randint(-100, H + 100)
        radius = rng.randint(150, 400)
        sa = rng.randint(0, 360)
        draw.arc([(cx - radius, cy - radius), (cx + radius, cy + radius)],
                 start=sa, end=sa + rng.randint(60, 160), fill=c1, width=2)

    # 散布圆点
    for _ in range(80):
        x, y = rng.randint(0, W), rng.randint(0, H)
        r = rng.choice([2, 2, 3, 3, 4])
        c = c2 if r >= 3 else c3
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=c)

    # 几个大圆环
    for _ in range(3):
        x, y = rng.randint(W // 4, W), rng.randint(20, H - 20)
        r = rng.randint(20, 50)
        draw.ellipse([(x - r, y - r), (x + r, y + r)], outline=c2, width=2)


# --- 布局 5：波纹扩散 ---
def _layout_ripples(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.28)
    c2 = _blend_color(accent, bg, 0.18)

    origins = [
        (rng.randint(W - 120, W + 30), rng.randint(-30, 60)),
        (rng.randint(-30, 80), rng.randint(H - 60, H + 30)),
    ]

    for cx, cy in origins:
        for i in range(7):
            r = 45 + i * 38
            c = c1 if i % 2 == 0 else c2
            draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], outline=c, width=2)

    # 十字标记
    cm = _blend_color(accent, bg, 0.22)
    for _ in range(12):
        x = rng.randint(W // 5, W - 20)
        y = rng.randint(10, H - 10)
        s = rng.choice([5, 7, 9])
        draw.line([(x - s, y), (x + s, y)], fill=cm, width=1)
        draw.line([(x, y - s), (x, y + s)], fill=cm, width=1)

    # 虚线
    cl = _blend_color(accent, bg, 0.15)
    for _ in range(4):
        y = rng.randint(20, H - 20)
        x_start = rng.randint(W // 4, W // 2)
        for x in range(x_start, W - 10, 12):
            draw.line([(x, y), (x + 5, y)], fill=cl, width=1)


# --- 布局 6：几何叠层 + 对角线 ---
def _layout_geo_layers(draw, W, H, accent, bg, rng):
    c1 = _blend_color(accent, bg, 0.15)
    c2 = _blend_color(accent, bg, 0.25)
    c3 = _blend_color(accent, bg, 0.10)

    # 大半透明圆
    for _ in range(5):
        cx = rng.randint(W // 4, W + 50)
        cy = rng.randint(-50, H + 50)
        r = rng.randint(60, 180)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=c1)

    # 矩形
    for _ in range(4):
        x1 = rng.randint(W // 5, W)
        y1 = rng.randint(-20, H)
        w = rng.randint(60, 180)
        h = rng.randint(30, 100)
        draw.rectangle([(x1, y1), (x1 + w, y1 + h)], fill=c3)

    # 线框
    for _ in range(4):
        x1 = rng.randint(W // 3, W - 20)
        y1 = rng.randint(10, H - 10)
        w = rng.randint(30, 80)
        h = rng.randint(20, 60)
        draw.rectangle([(x1, y1), (x1 + w, y1 + h)], outline=c2, width=2)

    # 对角线
    draw.line([(W - 180, 0), (W, 180)], fill=c2, width=2)
    draw.line([(W - 240, 0), (W, 240)], fill=c2, width=1)


# 所有布局函数列表
_LAYOUT_FUNCS = [
    _layout_corner_concentric,
    _layout_network_nodes,
    _layout_circuit,
    _layout_arcs_dots,
    _layout_ripples,
    _layout_geo_layers,
]


def _draw_tech_background(draw, W, H, accent_color, bg_color, title=""):
    """随机选择一种布局风格，绘制科技感几何背景图案"""
    rng = _make_rng(title)
    layout_idx = rng.randint(0, len(_LAYOUT_FUNCS) - 1)
    _LAYOUT_FUNCS[layout_idx](draw, W, H, accent_color, bg_color, rng)


def generate_cover_image(timestamp, title, topic, output_dir, cover_theme=None):
    """使用 Pillow 生成公众号封面图 (900x383, 2.35:1)，浅色简洁风格，带科技感几何背景"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("[警告] Pillow 未安装，跳过封面图生成")
        return None

    if cover_theme is None:
        cover_theme = COVER_THEMES[0]

    W, H = 900, 383
    bg_color = cover_theme["bg"]
    accent_color = cover_theme["accent"]
    text_color = cover_theme["text"]

    img = Image.new("RGB", (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # --- 科技感几何背景图案 ---
    _draw_tech_background(draw, W, H, accent_color, bg_color, title=timestamp)

    # --- 顶部强调色细线 ---
    draw.rectangle([(0, 0), (W, 4)], fill=accent_color)

    # --- 加载字体 ---
    font_paths = [
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ]
    font_path = None
    for fp in font_paths:
        if os.path.exists(fp):
            font_path = fp
            break

    if font_path:
        font_title = ImageFont.truetype(font_path, 48)
        font_sub = ImageFont.truetype(font_path, 20)
    else:
        font_title = ImageFont.load_default()
        font_sub = font_title

    # --- 主标题（随机决定是否显示）---
    if not title:
        title = "AI 前沿动态速递"

    rng = _make_rng(timestamp)
    show_title = True  # 始终显示标题

    if show_title:
        max_width = W - 120
        lines = []
        current_line = ""
        for char in title:
            test_line = current_line + char
            bbox = draw.textbbox((0, 0), test_line, font=font_title)
            if bbox[2] - bbox[0] > max_width:
                lines.append(current_line)
                current_line = char
            else:
                current_line = test_line
        if current_line:
            lines.append(current_line)

        lines = lines[:2]
        if len(lines) == 2 and len(lines[1]) > 0:
            bbox = draw.textbbox((0, 0), lines[1], font=font_title)
            if bbox[2] - bbox[0] > max_width:
                while bbox[2] - bbox[0] > max_width - 40:
                    lines[1] = lines[1][:-1]
                    bbox = draw.textbbox((0, 0), lines[1] + "...", font=font_title)
                lines[1] = lines[1] + "..."

        line_height = 58
        total_text_height = len(lines) * line_height + 30
        title_y = (H - total_text_height) // 2

        for line in lines:
            draw.text((60, title_y), line, fill=text_color, font=font_title)
            title_y += line_height

        # --- 副标题 ---
        sub_y = title_y + 12
        sub_text = "Ink"
        draw.text((60, sub_y), sub_text, fill="#9ca3af", font=font_sub)
    else:
        # 无标题模式：只显示副标题，居中偏下
        sub_text = "Ink"
        bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
        sub_w = bbox[2] - bbox[0]
        draw.text(((W - sub_w) // 2, H - 50), sub_text, fill="#9ca3af", font=font_sub)

    # --- 底部装饰线 ---
    draw.line([(60, H - 15), (W - 60, H - 15)], fill=accent_color, width=2)

    # 保存
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    img_path = output_path / f"{timestamp}-ai-daily.png"
    img.save(str(img_path), "PNG", quality=95)

    print(f"[3/4] 封面图已生成: {img_path}")
    return img_path


# ============================================================
# 第四步: 微信公众号 API
# ============================================================


def get_access_token(app_id, app_secret):
    """获取微信 access_token"""
    import requests

    url = "https://api.weixin.qq.com/cgi-bin/token"
    params = {
        "grant_type": "client_credential",
        "appid": app_id,
        "secret": app_secret,
    }
    resp = requests.get(url, params=params, timeout=10)
    data = resp.json()

    if "access_token" not in data:
        print(f"[错误] 获取 access_token 失败: {data}")
        sys.exit(1)

    return data["access_token"]


def upload_cover_image(access_token, image_path):
    """上传封面图到微信素材库，返回 media_id"""
    import requests

    if not image_path or not Path(image_path).exists():
        return None

    url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={access_token}&type=image"
    with open(image_path, "rb") as f:
        files = {"media": f}
        resp = requests.post(url, files=files, timeout=30)
    data = resp.json()

    if "media_id" not in data:
        print(f"[警告] 上传封面图失败: {data}")
        return None

    print(f"      封面图已上传: {data['media_id']}")
    return data["media_id"]


def upload_article_image(access_token, image_path):
    """上传文章内图片到微信，返回可在文章中使用的 URL"""
    import requests

    url = f"https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token={access_token}"
    with open(image_path, "rb") as f:
        files = {"media": f}
        resp = requests.post(url, files=files, timeout=30)
    data = resp.json()

    if "url" not in data:
        print(f"[警告] 上传文章图片失败: {data}")
        return None

    return data["url"]


def get_qrcode_url(access_token):
    """获取公众号二维码的微信 CDN URL（带缓存）"""
    if not QRCODE_IMAGE.exists():
        return None

    # 检查缓存
    if QRCODE_URL_CACHE.exists():
        cached_url = QRCODE_URL_CACHE.read_text(encoding="utf-8").strip()
        if cached_url:
            return cached_url

    # 上传并缓存
    qr_url = upload_article_image(access_token, str(QRCODE_IMAGE))
    if qr_url:
        QRCODE_URL_CACHE.write_text(qr_url, encoding="utf-8")
        print(f"      二维码已上传并缓存: {qr_url[:60]}...")
    return qr_url


def append_footer(html_content, qrcode_url=None):
    """在文章末尾追加关注引导语和二维码"""
    footer_parts = []
    footer_parts.append(
        '<section style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">'
    )
    if qrcode_url:
        footer_parts.append(
            f'<img src="{qrcode_url}" style="width:200px;margin:0 auto;display:block;" />'
        )
    footer_parts.append('</section>')
    footer_html = ''.join(footer_parts)

    # 插入到最后一个 </section> 之前（即文章主容器内部末尾）
    last_section_end = html_content.rfind('</section>')
    if last_section_end != -1:
        html_content = html_content[:last_section_end] + footer_html + html_content[last_section_end:]
    else:
        html_content += footer_html

    return html_content


def create_draft(access_token, title, html_content, author, thumb_media_id=None):
    """创建微信公众号草稿"""
    import requests
    import json as json_mod

    url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}"

    # 微信按 JSON 串长度计算标题，用 ensure_ascii=False 避免中文被转义为 \uXXXX（6字节）
    # UTF-8 编码下限制约 21 个中文字符（64 字节）
    title_bytes = len(title.encode("utf-8"))
    if title_bytes > 64:
        while len(title.encode("utf-8")) > 61:
            title = title[:-1]
        title = title + "…"
        print(f"      标题超长，已截断为: {title}")

    # 压缩 HTML：去掉标签间多余空白和换行，避免微信渲染出多余空格
    html_content = re.sub(r'>\s+<', '><', html_content)       # 标签之间的空白
    html_content = re.sub(r'\n\s*', '', html_content)          # 换行和行首缩进
    html_content = re.sub(r'<!--.*?-->', '', html_content)     # HTML 注释

    # 清理微信不支持的内容：外链转纯文本（订阅号不允许外部链接）
    html_content = re.sub(r'<a\s[^>]*href="[^"]*"[^>]*>(.*?)</a>', r'\1', html_content)

    article = {
        "title": title,
        "author": author,
        "content": html_content,
        "content_source_url": "",
        "need_open_comment": 1,
        "only_fans_can_comment": 0,
    }

    if thumb_media_id:
        article["thumb_media_id"] = thumb_media_id

    payload = {"articles": [article]}

    body = json_mod.dumps(payload, ensure_ascii=False).encode("utf-8")
    resp = requests.post(url, data=body, headers={"Content-Type": "application/json"}, timeout=30)
    data = resp.json()

    if "media_id" not in data:
        print(f"[错误] 创建草稿失败: {data}")
        return None

    return data["media_id"]


def publish_draft(access_token, media_id):
    """发布草稿"""
    import requests

    url = f"https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token={access_token}"
    payload = {"media_id": media_id}

    resp = requests.post(url, json=payload, timeout=30)
    data = resp.json()

    if data.get("errcode", 0) != 0:
        print(f"[错误] 发布失败: {data}")
        return False

    print(f"      发布任务已提交，publish_id: {data.get('publish_id')}")
    return True


# ============================================================
# Ink 平台推送
# ============================================================

INK_BASE_URL = "https://ink.starapp.net"


def ink_upload_cover(api_key, image_path):
    """上传封面图到 Ink 平台 OSS"""
    import requests

    url = f"{INK_BASE_URL}/api/open/upload"
    headers = {"Authorization": f"Bearer {api_key}"}

    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f, "image/png")}
        resp = requests.post(url, headers=headers, files=files, timeout=30)

    if resp.status_code != 200:
        print(f"      [Ink] 封面上传失败: HTTP {resp.status_code} {resp.text[:200]}")
        return None

    data = resp.json()
    cover_key = data.get("key")
    if cover_key:
        print(f"      [Ink] 封面已上传: {cover_key}")
    return cover_key


def _html_to_markdown(html):
    """将 HTML 简单转换为 Markdown 文本"""
    import re
    text = html
    # 标题
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1\n', text, flags=re.DOTALL)
    # 粗体/斜体
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)
    # 链接
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)
    # 列表
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', text, flags=re.DOTALL)
    # 换行
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'</div>', '\n', text)
    text = re.sub(r'</section>', '\n', text)
    # 清除剩余标签
    text = re.sub(r'<[^>]+>', '', text)
    # 清理多余空行和空格
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _extract_summary(html, max_len=480):
    """从 HTML 中提取摘要文本（取前几段正文）"""
    import re
    # 提取所有 <p> 标签中的文本
    paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
    summary_parts = []
    total = 0
    for p in paragraphs:
        clean = re.sub(r'<[^>]+>', '', p).strip()
        # 跳过太短的（可能是标签、分隔符等）
        if len(clean) < 15:
            continue
        if total + len(clean) > max_len:
            remaining = max_len - total
            if remaining > 30:
                summary_parts.append(clean[:remaining] + "...")
            break
        summary_parts.append(clean)
        total += len(clean)
    return " ".join(summary_parts) if summary_parts else ""


def ink_create_article(api_key, title, html_content, author, cover_key=None,
                       summary=None, markdown_content=None, category="AI"):
    """在 Ink 平台创建文章"""
    import requests

    url = f"{INK_BASE_URL}/api/open/articles"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Force-Create": "true",
    }

    payload = {
        "title": title,
        "htmlContent": html_content,
        "authorName": author,
        "category": category,
        "autoPublish": True,
    }
    if cover_key:
        payload["coverKey"] = cover_key
    if summary:
        payload["summary"] = summary[:500]
    if markdown_content:
        payload["content"] = markdown_content

    resp = requests.post(url, headers=headers, json=payload, timeout=60)

    if resp.status_code == 201:
        data = resp.json()
        article_url = data.get("url", "")
        print(f"      [Ink] 文章已发布: {article_url}")
        return data
    elif resp.status_code == 409:
        print(f"      [Ink] 标题重复，跳过")
        return None
    else:
        print(f"      [Ink] 创建失败: HTTP {resp.status_code} {resp.text[:200]}")
        return None


def push_to_ink(config, title, html_content, author, cover_image_path=None):
    """
    推送文章到 Ink 平台。
    返回 Ink 文章数据 dict 或 None。
    """
    api_key = config.get("INK_API_KEY", "")
    if not api_key:
        return None

    print("      [Ink] 正在推送到 Ink 平台...")

    # 生成摘要和 Markdown
    summary = _extract_summary(html_content)
    markdown_content = _html_to_markdown(html_content)

    # 上传封面图
    cover_key = None
    if cover_image_path and os.path.exists(str(cover_image_path)):
        cover_key = ink_upload_cover(api_key, str(cover_image_path))

    # 创建文章
    return ink_create_article(api_key, title, html_content, author, cover_key,
                              summary=summary, markdown_content=markdown_content)


def run_video_analysis(video_url, config, args):
    """YouTube 视频深度分析完整流程"""
    from video_analyzer import analyze_video
    from image_processor import process_images_in_html

    output_dir = config.get("OUTPUT_DIR", str(PROJECT_ROOT / "output" / "articles"))
    author = config.get("AUTHOR", "Ink")
    publish_mode = "publish" if args["publish"] else config.get("PUBLISH_MODE", "draft")
    timestamp = make_timestamp()

    # 第一步：分析视频
    output, metadata = analyze_video(video_url, config)
    if not output:
        print("[错误] 视频分析失败")
        sys.exit(1)

    html_content = extract_html(output)
    if not html_content:
        print("[警告] 未能提取到标准 HTML，使用完整输出")
        html_content = output

    # 第二步：处理文章配图
    print("[2/4] 处理文章配图...")
    access_token = None
    if args["local"]:
        html_content = process_images_in_html(html_content, mode="local", config=config)
    else:
        app_id = config.get("WECHAT_APP_ID", "")
        app_secret = config.get("WECHAT_APP_SECRET", "")
        access_token = None
        if app_id and app_id != "你的AppID":
            access_token = get_access_token(app_id, app_secret)
            html_content = process_images_in_html(
                html_content, mode="wechat", access_token=access_token, config=config
            )
        else:
            html_content = process_images_in_html(html_content, mode="local", config=config)

    # 提取标题（拆分前提取）
    title = extract_title(html_content)
    if not title:
        title = metadata.get("title", "视频深度分析")
    video_topic = f"视频分析: {metadata.get('title', '')[:20]}"

    # 自动拆分
    articles = split_article_if_needed(html_content, title)

    # 追加文章底部引导语和二维码
    qrcode_url = None
    if access_token and QRCODE_IMAGE.exists():
        qrcode_url = get_qrcode_url(access_token)

    is_series = len(articles) > 1
    filepaths = []
    img_paths = []

    for idx, (part_title, part_html) in enumerate(articles):
        part_html = append_footer(part_html, qrcode_url)

        suffix = f"-part{idx + 1}" if is_series else ""
        filepath = save_article(timestamp, part_html, output_dir, suffix=suffix)
        filepaths.append(filepath)

        img_path = generate_cover_image(f"{timestamp}{suffix}", part_title, video_topic, output_dir)
        img_paths.append(img_path)

    if args["local"]:
        print(f"\n[完成] 本地模式" + (f"（共 {len(articles)} 篇系列文章）" if is_series else ""))
        for i, fp in enumerate(filepaths):
            label = f" [{articles[i][0]}]" if is_series else ""
            print(f"       文章{label}: {fp}")
            if img_paths[i]:
                print(f"       封面: {img_paths[i]}")
        print(f"       预览: open {filepaths[0]}")
        return

    # 推送到 Ink 平台（优先）
    if config.get("INK_API_KEY"):
        for idx, (part_title, _) in enumerate(articles):
            with open(filepaths[idx], "r", encoding="utf-8") as f:
                ink_html = f.read()
            push_to_ink(config, part_title, ink_html, author, img_paths[idx])

    # 推送到微信公众号
    app_id = config.get("WECHAT_APP_ID", "")
    app_secret = config.get("WECHAT_APP_SECRET", "")

    if not app_id or app_id == "你的AppID":
        print(f"\n[跳过] 未配置微信 API，文章仅保存在本地")
        print(f"       配置文件: {CONFIG_FILE}")
        return

    print("[4/4] 正在推送到微信公众号...")

    if not access_token:
        access_token = get_access_token(app_id, app_secret)

    for idx, (part_title, part_html) in enumerate(articles):
        part_label = f" [{part_title}]" if is_series else ""
        print(f"      正在创建草稿{part_label}...")

        thumb_media_id = None
        if img_paths[idx]:
            thumb_media_id = upload_cover_image(access_token, str(img_paths[idx]))

        with open(filepaths[idx], "r", encoding="utf-8") as f:
            final_html = f.read()

        media_id = create_draft(access_token, part_title, final_html, author, thumb_media_id)
        if not media_id:
            print(f"[错误] 创建草稿失败{part_label}，文章已保存在本地")
            continue

        print(f"      草稿已创建: {part_title}")

        if publish_mode == "publish":
            publish_draft(access_token, media_id)

    if publish_mode == "publish":
        print(f"\n[完成] 文章已发布!" + (f"（共 {len(articles)} 篇）" if is_series else ""))
    else:
        print(f"\n[完成] 文章已存入公众号草稿箱" + (f"（共 {len(articles)} 篇）" if is_series else ""))

    for i, fp in enumerate(filepaths):
        print(f"       本地副本: {fp}")
        if img_paths[i]:
            print(f"       封面图: {img_paths[i]}")


# ============================================================
# 主流程
# ============================================================


def main():
    config = load_config()
    args = parse_args()

    # 视频分析模式
    if args["video"]:
        run_video_analysis(args["video"], config, args)
        return

    from image_processor import process_images_in_html

    output_dir = config.get("OUTPUT_DIR", str(PROJECT_ROOT / "output" / "articles"))
    author = config.get("AUTHOR", "Ink")
    publish_mode = "publish" if args["publish"] else config.get("PUBLISH_MODE", "draft")
    topic = args["topic"]
    timestamp = make_timestamp()

    # 获取当天变化组合（封面配色等）
    today = datetime.now().strftime("%Y-%m-%d")
    variation = pick_daily_variation(today)

    # 第一步：生成文章
    html_content = generate_article(topic, config)

    # 处理文章配图
    print("      处理文章配图...")
    access_token = None
    if args["local"]:
        html_content = process_images_in_html(html_content, mode="local", config=config)
    else:
        app_id = config.get("WECHAT_APP_ID", "")
        app_secret = config.get("WECHAT_APP_SECRET", "")
        if app_id and app_id != "你的AppID":
            access_token = get_access_token(app_id, app_secret)
            html_content = process_images_in_html(
                html_content, mode="wechat", access_token=access_token, config=config
            )
        else:
            html_content = process_images_in_html(html_content, mode="local", config=config)

    # 提取标题（拆分前提取，因为拆分后 header 可能被简化）
    title = extract_title(html_content)
    if not title:
        title = "Ink"

    # 自动拆分：如果内容过长，按 PART 边界拆为系列文章
    articles = split_article_if_needed(html_content, title)

    # 追加文章底部引导语和二维码
    qrcode_url = None
    if access_token and QRCODE_IMAGE.exists():
        qrcode_url = get_qrcode_url(access_token)

    effective_topic = topic or variation["topic"]
    is_series = len(articles) > 1
    filepaths = []
    img_paths = []

    for idx, (part_title, part_html) in enumerate(articles):
        # 每篇都追加 footer
        part_html = append_footer(part_html, qrcode_url)

        # 保存文章
        suffix = f"-part{idx + 1}" if is_series else ""
        filepath = save_article(timestamp, part_html, output_dir, suffix=suffix)
        filepaths.append(filepath)

        # 生成封面图
        cover_topic = effective_topic
        img_path = generate_cover_image(
            f"{timestamp}{suffix}", part_title, cover_topic, output_dir,
            cover_theme=variation["cover_theme"]
        )
        img_paths.append(img_path)

    if args["local"]:
        print(f"\n[完成] 本地模式" + (f"（共 {len(articles)} 篇系列文章）" if is_series else ""))
        for i, fp in enumerate(filepaths):
            label = f" [{articles[i][0]}]" if is_series else ""
            print(f"       文章{label}: {fp}")
            if img_paths[i]:
                print(f"       封面: {img_paths[i]}")
        print(f"       预览: open {filepaths[0]}")
        return

    # 推送到 Ink 平台（优先）
    if config.get("INK_API_KEY"):
        for idx, (part_title, _) in enumerate(articles):
            with open(filepaths[idx], "r", encoding="utf-8") as f:
                ink_html = f.read()
            push_to_ink(config, part_title, ink_html, author, img_paths[idx])

    # 推送到微信公众号
    app_id = config.get("WECHAT_APP_ID", "")
    app_secret = config.get("WECHAT_APP_SECRET", "")

    if not app_id or app_id == "你的AppID":
        print(f"\n[跳过] 未配置微信 API，文章仅保存在本地")
        print(f"       配置文件: {CONFIG_FILE}")
        return

    print("[4/4] 正在推送到微信公众号...")

    if not access_token:
        access_token = get_access_token(app_id, app_secret)

    for idx, (part_title, part_html) in enumerate(articles):
        part_label = f" [{part_title}]" if is_series else ""
        print(f"      正在创建草稿{part_label}...")

        # 上传封面图
        thumb_media_id = None
        if img_paths[idx]:
            thumb_media_id = upload_cover_image(access_token, str(img_paths[idx]))

        # 重新获取处理后的 HTML（已追加 footer 的版本）
        with open(filepaths[idx], "r", encoding="utf-8") as f:
            final_html = f.read()

        # 创建草稿
        media_id = create_draft(access_token, part_title, final_html, author, thumb_media_id)
        if not media_id:
            print(f"[错误] 创建草稿失败{part_label}，文章已保存在本地")
            continue

        print(f"      草稿已创建: {part_title}")

        if publish_mode == "publish":
            publish_draft(access_token, media_id)

    if publish_mode == "publish":
        print(f"\n[完成] 文章已发布!" + (f"（共 {len(articles)} 篇）" if is_series else ""))
    else:
        print(f"\n[完成] 文章已存入公众号草稿箱" + (f"（共 {len(articles)} 篇）" if is_series else ""))

    for i, fp in enumerate(filepaths):
        print(f"       本地副本: {fp}")
        if img_paths[i]:
            print(f"       封面图: {img_paths[i]}")


if __name__ == "__main__":
    main()
