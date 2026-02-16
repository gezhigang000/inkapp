#!/usr/bin/env python3
"""
LLM 调用适配层

统一生成接口，支持 Claude / DeepSeek / OpenAI / GLM / 豆包 / Kimi 六个后端。
- Claude 后端：调用 claude CLI，支持一体化搜索模式
- 其余后端：调用 OpenAI 兼容 HTTP API，搜索由 search_adapter 处理
"""

import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


class LLMError(Exception):
    """LLM 调用异常的统一异常类"""
    pass


def generate(prompt, config, timeout=600, need_search=True):
    """
    统一 LLM 生成入口。

    参数:
        prompt: 提示词文本
        config: 配置字典（从 config.env 加载）
        timeout: 超时秒数
        need_search: 是否需要搜索能力（仅 Claude 后端生效）

    返回:
        生成的文本内容

    异常:
        LLMError: 超时、API 错误、空输出等
    """
    provider = config.get("LLM_PROVIDER", "claude").lower()

    router = {
        "claude": lambda: _generate_via_claude(prompt, timeout, need_search),
        "deepseek": lambda: _generate_via_deepseek(prompt, config, timeout),
        "openai": lambda: _generate_via_openai(prompt, config, timeout),
        "glm": lambda: _generate_via_glm(prompt, config, timeout),
        "doubao": lambda: _generate_via_doubao(prompt, config, timeout),
        "kimi": lambda: _generate_via_kimi(prompt, config, timeout),
    }

    handler = router.get(provider)
    if not handler:
        supported = " / ".join(router.keys())
        raise LLMError(f"不支持的 LLM 提供商: {provider}，可选: {supported}")

    return handler()


def _generate_via_claude(prompt, timeout, need_search):
    """调用 Claude CLI 生成内容"""
    cmd = ["claude", "-p", prompt]
    if need_search:
        cmd.extend(["--allowedTools", "WebSearch,WebFetch"])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(PROJECT_ROOT),
        )
    except subprocess.TimeoutExpired:
        raise LLMError(f"Claude CLI 执行超时（{timeout // 60}分钟）")
    except FileNotFoundError:
        raise LLMError("未找到 claude 命令，请确认 Claude Code CLI 已安装")

    output = result.stdout.strip()

    if result.returncode != 0 or not output:
        stderr = result.stderr.strip() if result.stderr else "无错误输出"
        raise LLMError(f"Claude 返回异常: {stderr}")

    return output


def _generate_via_openai_compatible(prompt, api_key, model, endpoint, timeout, provider_name):
    """OpenAI 兼容 API 的通用调用方法"""
    try:
        import requests
    except ImportError:
        raise LLMError("requests 库未安装，请执行: pip3 install requests")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8192,
        "temperature": 0.7,
    }

    try:
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
    except requests.exceptions.Timeout:
        raise LLMError(f"{provider_name} API 请求超时（{timeout}秒）")
    except requests.exceptions.ConnectionError:
        raise LLMError(f"无法连接 {provider_name} API，请检查网络")

    if resp.status_code != 200:
        raise LLMError(f"{provider_name} API 返回错误: HTTP {resp.status_code} {resp.text[:300]}")

    data = resp.json()
    choices = data.get("choices", [])
    if not choices:
        raise LLMError(f"{provider_name} API 返回空结果")

    content = choices[0].get("message", {}).get("content", "").strip()
    if not content:
        raise LLMError(f"{provider_name} API 返回空内容")

    return content


def _generate_via_deepseek(prompt, config, timeout):
    """调用 DeepSeek API 生成内容"""
    api_key = config.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 DEEPSEEK_API_KEY，请在 config.env 中设置")
    model = config.get("DEEPSEEK_MODEL", "deepseek-chat")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://api.deepseek.com/v1/chat/completions",
        timeout, "DeepSeek",
    )


def _generate_via_openai(prompt, config, timeout):
    """调用 OpenAI API 生成内容"""
    api_key = config.get("OPENAI_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 OPENAI_API_KEY，请在 config.env 中设置")
    model = config.get("OPENAI_MODEL", "gpt-4o")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://api.openai.com/v1/chat/completions",
        timeout, "OpenAI",
    )


def _generate_via_glm(prompt, config, timeout):
    """调用智谱 GLM API 生成内容"""
    api_key = config.get("GLM_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 GLM_API_KEY，请在配置中设置")
    model = config.get("GLM_MODEL", "glm-4-flash")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        timeout, "智谱 GLM",
    )


def _generate_via_doubao(prompt, config, timeout):
    """调用豆包（火山引擎）API 生成内容"""
    api_key = config.get("DOUBAO_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 DOUBAO_API_KEY，请在配置中设置")
    model = config.get("DOUBAO_MODEL", "doubao-1.5-pro-32k")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        timeout, "豆包",
    )


def _generate_via_kimi(prompt, config, timeout):
    """调用 Kimi（月之暗面）API 生成内容"""
    api_key = config.get("KIMI_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 KIMI_API_KEY，请在配置中设置")
    model = config.get("KIMI_MODEL", "moonshot-v1-8k")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://api.moonshot.cn/v1/chat/completions",
        timeout, "Kimi",
    )
