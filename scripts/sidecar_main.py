#!/usr/bin/env python3
"""
Sidecar 入口：接收 Tauri 前端命令，输出 JSON Lines 进度。
用法: echo '{"action":"generate","mode":"daily"}' | python3 sidecar_main.py
"""
import sys
import json


def emit(event_type, **kwargs):
    """输出一行 JSON 事件到 stdout"""
    event = {"type": event_type, **kwargs}
    print(json.dumps(event, ensure_ascii=False), flush=True)


def handle_generate(params):
    """处理文章生成请求（骨架，Task 9 完整实现）"""
    mode = params.get("mode", "daily")
    emit("progress", stage="init", message=f"正在初始化 {mode} 模式...")
    # TODO: Task 9 will integrate with daily_ai_news.py
    emit("progress", stage="searching", message="正在搜索相关资讯...")
    emit("progress", stage="generating", message="正在生成文章...", percent=50)
    emit("result", status="success", title="[占位] 文章标题", article_path="")


def handle_validate_key(params):
    """验证 API Key 有效性（骨架）"""
    provider = params.get("provider", "")
    api_key = params.get("api_key", "")
    if not provider or not api_key:
        emit("error", code="MISSING_PARAMS", message="缺少 provider 或 api_key 参数")
        return
    # TODO: Task 9 will implement actual validation
    emit("result", status="success", message=f"{provider} API Key 格式正确")


def handle_list_articles(params):
    """列出已生成的文章（骨架）"""
    # TODO: Task 9 will scan output directory
    emit("result", status="success", articles=[])


def handle_get_config(params):
    """读取配置（骨架）"""
    emit("result", status="success", config={})


def handle_save_config(params):
    """保存配置（骨架）"""
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
