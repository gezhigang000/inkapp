# 微信公众号 AI 日报自动生成工具

自动生成 AI 领域深度文章，支持封面图生成、微信公众号草稿推送、Ink 平台发布。

## 功能概览

- **文章生成**：调用大模型联网搜索并撰写深度 AI 文章（HTML 格式，适配微信排版），支持 Claude / DeepSeek / OpenAI 切换
- **封面图生成**：Pillow 自动生成科技感封面图（深色主题 + 几何背景图案）
- **自动拆分**：长文章自动按 PART 边界拆分为系列文章
- **双平台推送**：同时推送到 Ink 平台和微信公众号草稿箱
- **批量生成**：支持按主题列表批量生成系列文章
- **视频分析**：支持 YouTube 视频深度分析并生成文章
- **文章配图**：自动处理文章内图片（本地保存或上传微信 CDN）

## 环境要求

- Python 3.8+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装且可用（默认模型后端）
- Pillow（封面图生成）
- requests（API 调用）

> 如切换到 DeepSeek / OpenAI 后端，则不需要安装 Claude Code CLI，但需要对应的 API Key。

```bash
# 安装 Python 依赖（如已有 pylib 目录则自动加载）
pip install Pillow requests
```

## 快速开始

### 1. 配置

```bash
cp config.env.example config.env
```

编辑 `config.env`，填入必要配置：

```ini
# 微信公众号 API（在微信公众平台 -> 开发 -> 基本配置 中获取）
WECHAT_APP_ID=你的AppID
WECHAT_APP_SECRET=你的AppSecret

# 文章配置
AUTHOR=你的作者名
OUTPUT_DIR=./output/articles

# 发布模式: draft=仅存草稿(推荐), publish=直接发布
PUBLISH_MODE=draft

# Ink 平台 API Key（可选，配置后会同时推送到 Ink 平台）
INK_API_KEY=你的ink_api_key

# AI 图片生成 API Key（可选，用于文章配图兜底）
OPENAI_API_KEY=
```

### 切换大模型（可选）

默认使用 Claude CLI，无需额外配置。如需切换到其他模型，在 `config.env` 中添加：

```ini
# ---- 切换到 DeepSeek ----
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat          # 可选，默认 deepseek-chat

# ---- 或切换到 OpenAI ----
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o                   # 可选，默认 gpt-4o
# OPENAI_API_KEY= 填入上面已有的那行即可

# ---- 搜索配置（非 Claude 模式必填）----
# 非 Claude 模型没有内置搜索能力，需要配置独立搜索服务
SEARCH_PROVIDER=tavily                # tavily (推荐) / serpapi
TAVILY_API_KEY=tvly-xxx               # https://tavily.com 免费 1000 次/月
# 或
SERPAPI_API_KEY=xxx                   # https://serpapi.com
```

改回 `LLM_PROVIDER=claude` 或删掉该行即可恢复默认。命令行用法不变。

### 2. 运行

#### 使用 Python 直接运行

```bash
# 默认模式：自动选择话题、视角、体裁，生成文章 + 封面图 + 存草稿
python3 scripts/daily_ai_news.py

# 指定话题深度调研
python3 scripts/daily_ai_news.py --topic "AI Agent 与自动化工作流"

# 仅生成本地文件（不推送）
python3 scripts/daily_ai_news.py --local

# 指定话题 + 仅本地
python3 scripts/daily_ai_news.py --topic "多模态模型" --local

# 生成 + 直接发布（跳过草稿）
python3 scripts/daily_ai_news.py --publish

# YouTube 视频深度分析
python3 scripts/daily_ai_news.py --video "https://www.youtube.com/watch?v=..." --local
```

#### 使用 Shell 脚本运行

```bash
# 单篇文章
./run.sh
./run.sh --topic "AI Agent"
./run.sh --local

# 批量生成系列文章
./run.sh --mode batch
./run.sh --mode batch --local
./run.sh --mode batch --publish
```

## 项目结构

```
.
├── run.sh                     # Shell 入口脚本
├── config.env                 # 配置文件（不提交到 Git）
├── config.env.example         # 配置文件模板
├── com.weixin.aidaily.plist   # macOS 定时任务配置
│
├── scripts/                   # Python 脚本
│   ├── daily_ai_news.py       # 主程序：文章生成、封面图、推送
│   ├── batch_generate.py      # 批量生成：按主题列表批量生成系列文章
│   ├── image_processor.py     # 图片处理：文章内配图的下载和上传
│   ├── video_analyzer.py      # 视频分析：YouTube 视频深度解析
│   ├── llm_adapter.py         # LLM 适配层：Claude / DeepSeek / OpenAI
│   └── search_adapter.py      # 搜索适配层：Tavily / SerpAPI
│
├── prompts/                   # Prompt 模板
│   ├── prompt_template.txt    # 日报模式 Prompt 模板
│   ├── topic_prompt_template.txt  # 深度调研模式 Prompt 模板
│   └── video_prompt_template.txt  # 视频分析 Prompt 模板
│
├── docs/                      # 文档
│   ├── open-api.md            # Ink 平台 API 文档
│   ├── 技术架构与产品化指南.md
│   └── 模型适配层技术方案.md   # LLM/搜索适配层技术细节
│
├── assets/                    # 静态资源（二维码等）
├── output/                    # 生成产物（gitignore）
│   └── articles/              # 生成的文章（HTML）和封面图（PNG）
├── pylib/                     # Python 本地依赖目录
├── reports/                   # PDF 报告
└── logs/                      # 日志目录
```

## 核心流程

```
[1/4] 调用 LLM 联网搜索 + 生成 HTML 文章
      Claude 模式：一体化（模型自带搜索）
      其他模式：search_adapter 搜索 → 结果注入 prompt → llm_adapter 生成
  ↓
[2/4] 保存 HTML 到本地 output/articles/ 目录
  ↓
[3/4] Pillow 生成封面图（深色科技风 + 几何背景图案）
  ↓
[4/4] 推送到 Ink 平台 → 推送到微信公众号草稿箱
```

## 内容多样化机制

脚本内置了多维度的内容变化机制，基于日期种子保证同一天多次运行结果一致，不同天自动轮换：

| 维度 | 说明 |
|------|------|
| **话题池** | 预设 10+ 个 AI 方向，未指定 `--topic` 时自动轮换 |
| **写作视角** | 一线开发者、技术架构、批判性思维等 8 种视角 |
| **文章体裁** | 速览体、深度体、对比体、趋势体、实操体 |
| **关注公司** | 从 10 家核心 AI 公司中随机选取 3-4 家 |
| **封面配色** | 11 套配色方案（9 深色 + 2 浅色），每天自动轮换 |
| **背景图案** | 6 种科技风几何布局随机选取 |

## 封面图说明

封面图尺寸为 900×383（微信公众号 2.35:1 比例），特点：

- 深色科技风背景（暗钢蓝、深靛、深棕、深海蓝等 9 种深色主题）
- 6 种几何图案布局：同心圆弧、网络节点、电路板、弧线散点、波纹扩散、几何叠层
- 自动排版标题（支持自动换行和截断）
- 固定副标题「质取tech」

## 文章自动拆分

当文章 HTML 超过 25,000 字符时，脚本会自动按 `<!-- PART N -->` 标记拆分为系列文章：

- 2 篇时命名为「上」「下」
- 多篇时命名为「一」「二」「三」...
- 每篇自动添加系列衔接提示

## 双平台推送

1. **Ink 平台**（优先）：上传封面图到 OSS，创建文章（含 HTML、Markdown、摘要）
2. **微信公众号**：上传封面图到素材库，创建草稿（自动压缩 HTML、清理外链）

## 批量生成

编辑 `scripts/batch_generate.py` 中的 `ARTICLE_TOPICS` 列表来定义系列文章主题：

```python
ARTICLE_TOPICS = [
    {"topic": "主题描述...", "short_title": "简短标题"},
    {"topic": "主题描述...", "short_title": "简短标题"},
]
```

然后运行：

```bash
python3 scripts/batch_generate.py          # 生成 + 存草稿
python3 scripts/batch_generate.py --local  # 仅本地
```

## 注意事项

- Claude CLI 需要联网搜索，文章生成需要一定时间；使用 DeepSeek / OpenAI 时需额外配置搜索服务
- 微信订阅号不支持外部链接，脚本会自动将 `<a>` 标签转为纯文本
- 微信标题限制约 64 字节（21 个中文字符），超长标题会自动截断
- `config.env` 包含敏感信息，已加入 `.gitignore`
