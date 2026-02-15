#!/bin/bash
# ============================================================
# AI 日报一键生成 & 发布
#
# 用法:
#   ./run.sh                              单篇，默认方向，生成+封面图+存草稿
#   ./run.sh --local                      单篇，仅本地生成
#   ./run.sh --topic "AI Agent"           单篇，指定方向
#   ./run.sh --topic "多模态" --local      单篇，指定方向 + 仅本地
#   ./run.sh --publish                    单篇，生成 + 直接发布
#   ./run.sh --mode batch                 批量生成系列文章 + 存草稿
#   ./run.sh --mode batch --local         批量生成，仅本地
#   ./run.sh --mode batch --publish       批量生成 + 直接发布
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONPATH="$SCRIPT_DIR/scripts:$SCRIPT_DIR/pylib:$PYTHONPATH"

# 解析 --mode 参数，剩余参数透传给 Python 脚本
MODE="single"
PASS_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode)
            MODE="$2"
            shift 2
            ;;
        --mode=*)
            MODE="${1#--mode=}"
            shift
            ;;
        *)
            PASS_ARGS+=("$1")
            shift
            ;;
    esac
done

echo "========================================"
echo "  质取report - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

case "$MODE" in
    single)
        python3 "$SCRIPT_DIR/scripts/daily_ai_news.py" "${PASS_ARGS[@]}"
        ;;
    batch)
        python3 "$SCRIPT_DIR/scripts/batch_generate.py" "${PASS_ARGS[@]}"
        ;;
    *)
        echo "[错误] 未知模式: $MODE"
        echo "可选模式: single (默认), batch"
        exit 1
        ;;
esac
