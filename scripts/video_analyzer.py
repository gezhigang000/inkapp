#!/usr/bin/env python3
"""
YouTube 视频深度分析模块

功能：
- 从 YouTube URL 提取视频 ID
- 获取视频元数据（标题、频道、时长等）
- 两级兜底字幕提取：youtube-transcript-api → yt-dlp + whisper
- 转录文本分块处理
- 调用 Claude CLI 生成深度分析文章
"""

import os
import re
import json
import subprocess
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
VIDEO_PROMPT_FILE = PROJECT_ROOT / "prompts" / "video_prompt_template.txt"


def extract_video_id(url):
    """
    从各种 YouTube URL 格式提取 video ID。
    支持：
        - https://www.youtube.com/watch?v=XXXXX
        - https://youtu.be/XXXXX
        - https://www.youtube.com/embed/XXXXX
        - https://www.youtube.com/v/XXXXX
        - https://www.youtube.com/live/XXXXX
    """
    patterns = [
        r'(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/live/)([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    raise ValueError(f"无法从 URL 中提取视频 ID: {url}")


def get_video_metadata(video_id):
    """
    用 yt-dlp --dump-json 获取视频元数据。
    返回字典包含：title, channel, duration, upload_date, description 等。
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        result = subprocess.run(
            ["yt-dlp", "--dump-json", "--no-download", url],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            print(f"[警告] yt-dlp 获取元数据失败: {result.stderr[:200]}")
            return {
                "title": f"YouTube 视频 {video_id}",
                "channel": "未知",
                "duration": 0,
                "upload_date": "",
                "description": "",
            }

        data = json.loads(result.stdout)
        return {
            "title": data.get("title", ""),
            "channel": data.get("channel", data.get("uploader", "")),
            "duration": data.get("duration", 0),
            "upload_date": data.get("upload_date", ""),
            "description": data.get("description", "")[:500],
            "view_count": data.get("view_count", 0),
            "like_count": data.get("like_count", 0),
        }
    except FileNotFoundError:
        print("[警告] yt-dlp 未安装，无法获取视频元数据")
        print("       安装命令: pip3 install yt-dlp")
        return {
            "title": f"YouTube 视频 {video_id}",
            "channel": "未知",
            "duration": 0,
            "upload_date": "",
            "description": "",
        }
    except Exception as e:
        print(f"[警告] 获取元数据异常: {e}")
        return {
            "title": f"YouTube 视频 {video_id}",
            "channel": "未知",
            "duration": 0,
            "upload_date": "",
            "description": "",
        }


def get_transcript_via_api(video_id):
    """
    使用 youtube-transcript-api 获取字幕（首选方案）。
    语言优先级：zh-Hans → zh → en → zh-Hant → 任意可用。
    返回字幕文本字符串，或 None。
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print("      [字幕] youtube-transcript-api 未安装")
        print("             安装命令: pip3 install youtube-transcript-api")
        return None

    language_priority = ["zh-Hans", "zh", "en", "zh-Hant"]

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # 尝试按优先级查找
        transcript = None
        for lang in language_priority:
            try:
                transcript = transcript_list.find_transcript([lang])
                print(f"      [字幕] 找到 {lang} 字幕")
                break
            except Exception:
                continue

        # 如果优先语言都没有，取第一个可用的
        if transcript is None:
            try:
                for t in transcript_list:
                    transcript = t
                    print(f"      [字幕] 使用可用字幕: {t.language}")
                    break
            except Exception:
                pass

        if transcript is None:
            print("      [字幕] 该视频没有可用字幕")
            return None

        # 获取字幕内容
        entries = transcript.fetch()
        lines = []
        for entry in entries:
            text = entry.get("text", "") if isinstance(entry, dict) else getattr(entry, "text", str(entry))
            text = text.strip()
            if text:
                lines.append(text)

        full_text = " ".join(lines)
        print(f"      [字幕] 成功获取字幕，总长度: {len(full_text)} 字符")
        return full_text

    except Exception as e:
        print(f"      [字幕] youtube-transcript-api 提取失败: {e}")
        return None


def get_transcript_via_whisper(video_id):
    """
    兜底方案：用 yt-dlp 下载音频 + whisper 转录。
    仅下载音频，用 whisper base 模型转录。
    超过 2 小时的视频降级为 whisper tiny 模型。
    返回转录文本字符串，或 None。
    """
    # 检查依赖
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
    except FileNotFoundError:
        print("      [转录] ffmpeg 未安装，无法进行音频转录")
        print("             安装命令: brew install ffmpeg")
        return None

    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, timeout=5)
    except FileNotFoundError:
        print("      [转录] yt-dlp 未安装")
        print("             安装命令: pip3 install yt-dlp")
        return None

    url = f"https://www.youtube.com/watch?v={video_id}"
    audio_path = None

    try:
        # 创建临时文件
        tmp_dir = tempfile.mkdtemp(prefix="yt_audio_")
        audio_path = os.path.join(tmp_dir, "audio.mp3")

        print("      [转录] 正在下载音频...")
        result = subprocess.run(
            [
                "yt-dlp",
                "-x",  # 仅提取音频
                "--audio-format", "mp3",
                "--audio-quality", "5",  # 中等质量，减小文件
                "-o", audio_path,
                url,
            ],
            capture_output=True,
            text=True,
            timeout=600,
        )

        if result.returncode != 0:
            print(f"      [转录] 音频下载失败: {result.stderr[:200]}")
            return None

        # 检查实际音频文件路径（yt-dlp 可能自动调整扩展名）
        if not os.path.exists(audio_path):
            # 查找 tmp_dir 中的音频文件
            for f in os.listdir(tmp_dir):
                if f.startswith("audio"):
                    audio_path = os.path.join(tmp_dir, f)
                    break

        if not os.path.exists(audio_path):
            print("      [转录] 音频文件未找到")
            return None

        # 获取音频时长来决定 whisper 模型
        duration_result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        duration_seconds = float(duration_result.stdout.strip()) if duration_result.stdout.strip() else 0
        model = "tiny" if duration_seconds > 7200 else "base"
        print(f"      [转录] 音频时长: {duration_seconds / 60:.0f} 分钟，使用 whisper {model} 模型")

        # 用 whisper 转录
        print("      [转录] 正在用 whisper 转录，请耐心等待...")
        try:
            import whisper
        except ImportError:
            print("      [转录] whisper 未安装")
            print("             安装命令: pip3 install openai-whisper")
            return None

        whisper_model = whisper.load_model(model)
        result = whisper_model.transcribe(audio_path)
        text = result.get("text", "")

        if text:
            print(f"      [转录] 转录完成，总长度: {len(text)} 字符")
            return text
        else:
            print("      [转录] 转录结果为空")
            return None

    except subprocess.TimeoutExpired:
        print("      [转录] 音频下载超时")
        return None
    except Exception as e:
        print(f"      [转录] 异常: {e}")
        return None
    finally:
        # 清理临时文件
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                os.rmdir(os.path.dirname(audio_path))
            except Exception:
                pass


def get_transcript(video_id):
    """
    两级兜底提取字幕。
    1. youtube-transcript-api（快速）
    2. yt-dlp + whisper（兜底）
    """
    print("      [字幕] 尝试获取字幕...")

    # 首选：API 提取
    text = get_transcript_via_api(video_id)
    if text:
        return text

    # 兜底：whisper 转录
    print("      [字幕] API 方式失败，尝试音频转录方案...")
    text = get_transcript_via_whisper(video_id)
    if text:
        return text

    return None


def chunk_transcript(text, max_chars=80000):
    """
    超长转录文本分块。
    在句子边界处切分，每块不超过 max_chars 字符。
    """
    if len(text) <= max_chars:
        return [text]

    chunks = []
    current_chunk = ""

    # 按句号/问号/感叹号分割
    sentences = re.split(r'([.!?。！？\n]+)', text)

    for i in range(0, len(sentences), 2):
        sentence = sentences[i]
        delimiter = sentences[i + 1] if i + 1 < len(sentences) else ""
        full_sentence = sentence + delimiter

        if len(current_chunk) + len(full_sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = full_sentence
        else:
            current_chunk += full_sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def build_analysis_prompt(transcript, metadata):
    """
    组装深度分析 prompt。
    读取 video_prompt_template.txt 模板并填入变量。
    """
    # 读取模板
    if VIDEO_PROMPT_FILE.exists():
        with open(VIDEO_PROMPT_FILE, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        raise FileNotFoundError(f"视频分析 prompt 模板不存在: {VIDEO_PROMPT_FILE}")

    # 格式化时长
    duration = metadata.get("duration", 0)
    if duration:
        hours = duration // 3600
        minutes = (duration % 3600) // 60
        duration_str = f"{hours}小时{minutes}分钟" if hours else f"{minutes}分钟"
    else:
        duration_str = "未知"

    # 格式化上传日期
    upload_date = metadata.get("upload_date", "")
    if upload_date and len(upload_date) == 8:
        upload_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}"

    # 替换模板变量
    prompt = template.replace("{{TITLE}}", metadata.get("title", ""))
    prompt = prompt.replace("{{CHANNEL}}", metadata.get("channel", ""))
    prompt = prompt.replace("{{DURATION}}", duration_str)
    prompt = prompt.replace("{{UPLOAD_DATE}}", upload_date)
    prompt = prompt.replace("{{DESCRIPTION}}", metadata.get("description", ""))
    prompt = prompt.replace("{{TRANSCRIPT}}", transcript)

    return prompt


def call_llm_for_analysis(prompt, config=None):
    """
    调用 LLM 生成深度分析文章。
    支持 Claude / DeepSeek / OpenAI 后端切换。
    """
    if config is None:
        config = {}

    from llm_adapter import generate, LLMError

    provider = config.get("LLM_PROVIDER", "claude").lower()
    print(f"      正在调用 AI 生成深度分析（提供商: {provider}）...")
    print("      (这一步需要较长时间，请耐心等待)")

    try:
        if provider == "claude":
            output = generate(prompt, config, timeout=900, need_search=True)
        else:
            # 非 Claude 后端：转录文本已在 prompt 中，信息量足够，可跳过搜索
            output = generate(prompt, config, timeout=900, need_search=False)
    except LLMError as e:
        print(f"[错误] {e}")
        return None

    return output


def analyze_video(youtube_url, config=None):
    """
    主入口：分析 YouTube 视频并生成深度分析文章。

    参数：
        youtube_url: YouTube 视频 URL
        config: 配置字典

    返回：
        (html_content, metadata) 或 (None, None)
    """
    if config is None:
        config = {}

    # 1. 提取视频 ID
    print("[1/4] 解析视频 URL...")
    try:
        video_id = extract_video_id(youtube_url)
        print(f"      视频 ID: {video_id}")
    except ValueError as e:
        print(f"[错误] {e}")
        return None, None

    # 2. 获取视频元数据
    print("[1/4] 获取视频元数据...")
    metadata = get_video_metadata(video_id)
    print(f"      标题: {metadata['title']}")
    print(f"      频道: {metadata['channel']}")
    if metadata.get("duration"):
        minutes = metadata["duration"] // 60
        print(f"      时长: {minutes} 分钟")

    # 3. 提取字幕/转录
    print("[1/4] 提取视频字幕...")
    transcript = get_transcript(video_id)
    if not transcript:
        print("[错误] 无法获取视频字幕或转录文本")
        print("       可能原因：")
        print("       - 视频没有字幕且 ffmpeg/whisper 未安装")
        print("       - 视频不可访问或已被删除")
        return None, None

    # 4. 处理超长文本
    chunks = chunk_transcript(transcript)
    if len(chunks) > 1:
        print(f"      转录文本过长，已分为 {len(chunks)} 块")
        # 对于多块文本，合并前几块（在 token 限制内尽量保留更多内容）
        # 如果分块超过 3 个，只取前 3 块加最后一块的结尾
        if len(chunks) > 3:
            transcript = "\n\n".join(chunks[:3])
            transcript += f"\n\n[... 中间部分省略 ...]\n\n{chunks[-1][-2000:]}"
        else:
            transcript = "\n\n".join(chunks)

    # 5. 构建 prompt 并调用 Claude
    print("[1/4] 构建分析 prompt...")
    prompt = build_analysis_prompt(transcript, metadata)

    output = call_llm_for_analysis(prompt, config)
    if not output:
        return None, None

    return output, metadata
