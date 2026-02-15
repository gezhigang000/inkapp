#!/usr/bin/env python3
"""
批量生成系列文章脚本

用法:
    python3 batch_generate.py --local            # 仅生成本地文件
    python3 batch_generate.py                     # 生成 + 存草稿
    python3 batch_generate.py --publish           # 生成 + 直接发布
"""
import sys
import time
from daily_ai_news import (
    load_config, parse_args, make_timestamp, generate_article,
    extract_html, extract_title, save_article, generate_cover_image,
    get_access_token, upload_cover_image, create_draft, publish_draft,
    append_footer, get_qrcode_url, split_article_if_needed,
    pick_daily_variation, push_to_ink, COVER_THEMES, QRCODE_IMAGE, CONFIG_FILE,
)
from image_processor import process_images_in_html
from datetime import datetime


# ============================================================
# 系列文章配置：在这里定义每篇文章的主题
# ============================================================

SERIES_TITLE = "AI 提示词实战手册"

ARTICLE_TOPICS = [
    {
        "topic": "软件工程师/程序员 AI 提示词实战手册：代码编写、Debug、Code Review、架构设计等场景的高效提示词模板",
        "short_title": "程序员篇",
    },
    {
        "topic": "产品经理 AI 提示词实战手册：需求分析、PRD撰写、竞品分析、用户调研等场景的高效提示词模板",
        "short_title": "产品经理篇",
    },
    {
        "topic": "数据分析师 AI 提示词实战手册：数据清洗、SQL编写、数据可视化、分析报告等场景的高效提示词模板",
        "short_title": "数据分析师篇",
    },
    {
        "topic": "UI/UX 设计师 AI 提示词实战手册：设计方案构思、用户体验分析、设计文档撰写、设计评审等场景的高效提示词模板",
        "short_title": "设计师篇",
    },
    {
        "topic": "市场营销人员 AI 提示词实战手册：文案撰写、营销方案策划、社交媒体运营、SEO优化等场景的高效提示词模板",
        "short_title": "市场营销篇",
    },
    {
        "topic": "运营/项目管理 AI 提示词实战手册：项目规划、周报月报、流程优化、团队协作等场景的高效提示词模板",
        "short_title": "运营管理篇",
    },
]


def main():
    config = load_config()
    args = parse_args()

    output_dir = config.get("OUTPUT_DIR", "articles")
    author = config.get("AUTHOR", "AI前沿日报")
    publish_mode = "publish" if args["publish"] else config.get("PUBLISH_MODE", "draft")

    today = datetime.now().strftime("%Y-%m-%d")
    variation = pick_daily_variation(today)

    total = len(ARTICLE_TOPICS)
    print(f"========================================")
    print(f" 批量生成系列文章：{SERIES_TITLE}")
    print(f" 共 {total} 篇，逐篇生成")
    print(f"========================================\n")

    # 预获取 access_token（非 local 模式）
    access_token = None
    qrcode_url = None
    if not args["local"]:
        app_id = config.get("WECHAT_APP_ID", "")
        app_secret = config.get("WECHAT_APP_SECRET", "")
        if app_id and app_id != "你的AppID":
            access_token = get_access_token(app_id, app_secret)
            if QRCODE_IMAGE.exists():
                qrcode_url = get_qrcode_url(access_token)

    results = []

    for idx, article_cfg in enumerate(ARTICLE_TOPICS):
        topic = article_cfg["topic"]
        short_title = article_cfg["short_title"]
        timestamp = make_timestamp()

        print(f"\n{'='*50}")
        print(f"[{idx+1}/{total}] 正在生成：{short_title}")
        print(f"{'='*50}")

        # 生成文章
        try:
            html_content = generate_article(topic)
        except SystemExit:
            print(f"[错误] 第 {idx+1} 篇生成失败，跳过")
            results.append({"title": short_title, "status": "failed"})
            continue

        # 处理配图
        print("      处理文章配图...")
        if args["local"] or not access_token:
            html_content = process_images_in_html(html_content, mode="local", config=config)
        else:
            html_content = process_images_in_html(
                html_content, mode="wechat", access_token=access_token, config=config
            )

        # 提取标题
        title = extract_title(html_content)
        if not title:
            title = f"{SERIES_TITLE}·{short_title}"

        # 拆分检查
        articles = split_article_if_needed(html_content, title)

        # 选配色（每篇用不同配色）
        theme = COVER_THEMES[idx % len(COVER_THEMES)]

        for part_idx, (part_title, part_html) in enumerate(articles):
            # 追加 footer
            part_html = append_footer(part_html, qrcode_url)

            is_series = len(articles) > 1
            suffix = f"-part{part_idx+1}" if is_series else ""
            file_suffix = f"-{idx+1:02d}{suffix}"

            # 保存
            filepath = save_article(timestamp, part_html, output_dir, suffix=file_suffix)

            # 封面图
            img_path = generate_cover_image(
                f"{timestamp}{file_suffix}", part_title,
                f"{SERIES_TITLE}·{short_title}", output_dir,
                cover_theme=theme,
            )

            result_entry = {
                "title": part_title,
                "filepath": str(filepath),
                "img_path": str(img_path) if img_path else None,
                "status": "saved",
            }

            # 推送到 Ink 平台（优先）
            if config.get("INK_API_KEY") and not args["local"]:
                with open(filepath, "r", encoding="utf-8") as f:
                    ink_html = f.read()
                push_to_ink(config, part_title, ink_html, author, img_path)

            # 推送草稿
            if not args["local"] and access_token:
                thumb_media_id = None
                if img_path:
                    thumb_media_id = upload_cover_image(access_token, str(img_path))

                with open(filepath, "r", encoding="utf-8") as f:
                    final_html = f.read()

                media_id = create_draft(access_token, part_title, final_html, author, thumb_media_id)
                if media_id:
                    result_entry["status"] = "drafted"
                    result_entry["media_id"] = media_id
                    print(f"      草稿已创建: {part_title}")

                    if publish_mode == "publish":
                        publish_draft(access_token, media_id)
                        result_entry["status"] = "published"
                else:
                    print(f"      [错误] 创建草稿失败: {part_title}")

            results.append(result_entry)

        # 短暂间隔，避免 API 限流
        if idx < total - 1:
            print("      等待 5 秒后继续下一篇...")
            time.sleep(5)

    # 汇总
    print(f"\n{'='*50}")
    print(f" 批量生成完成！")
    print(f"{'='*50}")
    for i, r in enumerate(results, 1):
        status_emoji = {"saved": "💾", "drafted": "📝", "published": "✅", "failed": "❌"}.get(r["status"], "?")
        print(f"  {status_emoji} {i}. {r['title']}  [{r['status']}]")
        if "filepath" in r:
            print(f"       {r['filepath']}")
    print()


if __name__ == "__main__":
    main()
