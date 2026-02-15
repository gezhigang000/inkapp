#!/usr/bin/env python3
"""
文章配图处理模块

功能：
- 从 HTML 中提取 <img> 标签
- 下载图片并转为 base64 data URI（本地模式）或上传到微信 CDN（发布模式）
- AI 生成图片兜底（可选，需配置 OPENAI_API_KEY）
- 清理下载失败的 img 标签
"""

import re
import base64
import io
from urllib.parse import urlparse


def find_all_img_tags(html):
    """
    正则提取所有 <img> 标签及其 src 属性。
    返回 [(完整标签字符串, src_url, alt文字), ...]
    """
    pattern = r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*/?\s*>'
    results = []
    for match in re.finditer(pattern, html, re.IGNORECASE):
        full_tag = match.group(0)
        src = match.group(1)
        # 提取 alt 属性
        alt_match = re.search(r'alt=["\']([^"\']*)["\']', full_tag, re.IGNORECASE)
        alt = alt_match.group(1) if alt_match else ""
        # 跳过已经是 base64 的图片
        if src.startswith("data:"):
            continue
        results.append((full_tag, src, alt))
    return results


def download_image(url, timeout=15, max_size_mb=5):
    """
    下载图片，带超时和大小限制。
    返回 (图片字节, content_type) 或 (None, None)。
    """
    import requests

    try:
        # 设置 User-Agent 以避免被某些网站拒绝
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=timeout, stream=True)
        resp.raise_for_status()

        # 检查 Content-Type
        content_type = resp.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            print(f"      [图片] 非图片类型: {content_type} - {url[:80]}")
            return None, None

        # 检查大小（通过 Content-Length 或流式读取）
        content_length = resp.headers.get("Content-Length")
        if content_length and int(content_length) > max_size_mb * 1024 * 1024:
            print(f"      [图片] 文件过大: {int(content_length) / 1024 / 1024:.1f}MB - {url[:80]}")
            return None, None

        # 流式读取，防止内存溢出
        chunks = []
        total_size = 0
        for chunk in resp.iter_content(chunk_size=8192):
            total_size += len(chunk)
            if total_size > max_size_mb * 1024 * 1024:
                print(f"      [图片] 下载中超过大小限制 - {url[:80]}")
                return None, None
            chunks.append(chunk)

        image_bytes = b"".join(chunks)
        if len(image_bytes) < 100:
            print(f"      [图片] 文件过小，可能无效 - {url[:80]}")
            return None, None

        return image_bytes, content_type

    except requests.exceptions.Timeout:
        print(f"      [图片] 下载超时 - {url[:80]}")
        return None, None
    except requests.exceptions.RequestException as e:
        print(f"      [图片] 下载失败: {e} - {url[:80]}")
        return None, None


def image_to_base64_data_uri(image_bytes, content_type):
    """将图片字节转换为 base64 data URI"""
    # 规范化 content_type
    if "jpeg" in content_type or "jpg" in content_type:
        mime = "image/jpeg"
    elif "png" in content_type:
        mime = "image/png"
    elif "gif" in content_type:
        mime = "image/gif"
    elif "webp" in content_type:
        mime = "image/webp"
    elif "svg" in content_type:
        mime = "image/svg+xml"
    else:
        mime = "image/jpeg"  # 默认

    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def upload_image_to_wechat(access_token, image_bytes, content_type):
    """
    上传图片到微信公众号素材库（用于文章内嵌图片）。
    使用 /cgi-bin/media/uploadimg 接口，返回可在文章中使用的 URL。
    """
    import requests

    url = f"https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token={access_token}"

    # 确定文件扩展名
    if "png" in content_type:
        ext = "png"
    elif "gif" in content_type:
        ext = "gif"
    elif "webp" in content_type:
        ext = "webp"
    else:
        ext = "jpg"

    files = {
        "media": (f"image.{ext}", io.BytesIO(image_bytes), content_type)
    }

    try:
        resp = requests.post(url, files=files, timeout=30)
        data = resp.json()

        if "url" in data:
            return data["url"]
        else:
            print(f"      [图片] 微信上传失败: {data}")
            return None
    except Exception as e:
        print(f"      [图片] 微信上传异常: {e}")
        return None


def generate_ai_image(prompt, api_key):
    """
    使用 OpenAI DALL-E 生成图片（兜底方案）。
    返回 (图片字节, content_type) 或 (None, None)。
    需要配置 OPENAI_API_KEY。
    """
    import requests

    if not api_key:
        return None, None

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "dall-e-3",
            "prompt": f"A clean, professional illustration for a tech article: {prompt}. "
                      f"Style: modern, minimalist, suitable for a WeChat article.",
            "n": 1,
            "size": "1792x1024",
            "response_format": "b64_json",
        }

        resp = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers=headers,
            json=payload,
            timeout=60,
        )
        data = resp.json()

        if "data" in data and len(data["data"]) > 0:
            b64_data = data["data"][0]["b64_json"]
            image_bytes = base64.b64decode(b64_data)
            return image_bytes, "image/png"
        else:
            print(f"      [图片] AI 生成失败: {data.get('error', {}).get('message', '未知错误')}")
            return None, None

    except Exception as e:
        print(f"      [图片] AI 生成异常: {e}")
        return None, None


def remove_broken_img_tags(html, failed_tags):
    """移除下载失败的 img 标签"""
    for tag in failed_tags:
        html = html.replace(tag, "")
    return html


def process_images_in_html(html, mode="local", access_token=None, config=None):
    """
    主入口：处理 HTML 中的所有图片。

    参数：
        html: 包含 <img> 标签的 HTML 字符串
        mode: "local"（base64 嵌入）或 "wechat"（上传微信 CDN）
        access_token: 微信 access_token（mode="wechat" 时必须）
        config: 配置字典（用于获取 OPENAI_API_KEY 等）

    返回：
        处理后的 HTML 字符串
    """
    if config is None:
        config = {}

    img_tags = find_all_img_tags(html)
    if not img_tags:
        print("      [图片] 文章中未发现需要处理的图片")
        return html

    print(f"      [图片] 发现 {len(img_tags)} 张图片，开始处理...")

    openai_api_key = config.get("OPENAI_API_KEY", "")
    success_count = 0
    failed_tags = []

    for i, (full_tag, src_url, alt_text) in enumerate(img_tags, 1):
        print(f"      [图片 {i}/{len(img_tags)}] {src_url[:80]}...")

        # 尝试下载
        image_bytes, content_type = download_image(src_url)

        # 下载失败，尝试 AI 生成
        if image_bytes is None and openai_api_key:
            desc = alt_text if alt_text else "technology illustration"
            print(f"      [图片 {i}] 下载失败，尝试 AI 生成...")
            image_bytes, content_type = generate_ai_image(desc, openai_api_key)

        # 仍然失败，记录并跳过
        if image_bytes is None:
            print(f"      [图片 {i}] 处理失败，将移除该图片")
            failed_tags.append(full_tag)
            continue

        # 根据模式处理图片
        if mode == "wechat" and access_token:
            # 上传到微信 CDN
            wechat_url = upload_image_to_wechat(access_token, image_bytes, content_type)
            if wechat_url:
                new_tag = full_tag.replace(src_url, wechat_url)
                html = html.replace(full_tag, new_tag)
                success_count += 1
                print(f"      [图片 {i}] 已上传微信 CDN")
            else:
                # 微信上传失败，回退到 base64
                data_uri = image_to_base64_data_uri(image_bytes, content_type)
                new_tag = full_tag.replace(src_url, data_uri)
                html = html.replace(full_tag, new_tag)
                success_count += 1
                print(f"      [图片 {i}] 微信上传失败，已转为 base64")
        else:
            # 本地模式：转 base64
            data_uri = image_to_base64_data_uri(image_bytes, content_type)
            new_tag = full_tag.replace(src_url, data_uri)
            html = html.replace(full_tag, new_tag)
            success_count += 1
            print(f"      [图片 {i}] 已转为 base64 嵌入")

    # 清理失败的图片标签
    if failed_tags:
        html = remove_broken_img_tags(html, failed_tags)

    print(f"      [图片] 处理完成: {success_count} 成功, {len(failed_tags)} 失败")
    return html
