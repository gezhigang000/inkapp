# Ink — AI 内容创作桌面应用

Tauri v2 桌面应用，集成多模型 AI 写作、Agent 深度调研、文档翻译、数据分析，一键生成微信公众号文章。

## 项目结构

```
.
├── app/                          # Tauri 桌面应用
│   ├── src/                      # React 前端
│   │   ├── pages/                # 页面：Home, Create, Articles, Models, Settings, Logs
│   │   ├── components/           # 组件：ArticlePreview, GenerateProgress, FileUpload 等
│   │   ├── hooks/                # useGenerate, useConfig, useTemplates
│   │   └── data/                 # prompt-templates.ts, model-guides.ts
│   └── src-tauri/                # Rust 后端
│       └── src/sidecar.rs        # Sidecar 进程管理 + 事件转发
│
├── scripts/                      # Python sidecar
│   ├── sidecar_main.py           # 主入口：stdin JSON → 路由 → stdout 事件流
│   ├── daily_ai_news.py          # 文章生成 + 封面图 + 微信发布
│   ├── agent_loop.py             # Agent 模式：多轮工具调用循环
│   ├── agent_prompts.py          # Agent 系统提示词 + 排版指令
│   ├── ink_env.py                # 跨平台共享路径（INK_HOME、CJK 字体）
│   ├── llm_adapter.py            # LLM 适配层（OpenAI 兼容协议）
│   ├── search_adapter.py         # 搜索适配层（Tavily/SerpAPI 自动降级）
│   ├── translate_inplace.py      # 原格式文档翻译
│   ├── video_analyzer.py         # YouTube 视频分析
│   ├── image_processor.py        # 文章配图处理
│   └── build_sidecar.py          # PyInstaller 打包脚本
│
├── prompts/                      # 内置提示词模板
├── logo/                         # 应用图标资源
└── docs/                         # 项目文档
    ├── product-design.md         # 产品设计文档
    ├── tech-architecture.md      # 技术架构文档
    ├── visual-standard.md        # 视觉设计规范
    ├── agent-architecture.md     # Agent 模式架构详解
    └── project-progress.md       # 迭代进度
```

## 开发命令

```bash
# 安装前端依赖
cd app && pnpm install

# 启动开发模式（前端 + Tauri 窗口）
cd app && pnpm tauri dev

# 构建发布包
cd app && pnpm tauri build

# 编译 Python sidecar（本地调试用）
python3 scripts/build_sidecar.py
```

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 桌面框架 | Tauri v2 | 比 Electron 体积小 10x，原生性能 |
| AI 后端 | Python sidecar (PyInstaller) | Python 生态丰富（Pillow/docx/pandas），打包为单文件随 Tauri 分发 |
| LLM 协议 | OpenAI 兼容 API | 所有国产模型都支持，统一适配 |
| Agent 独立 LLM 调用 | 不复用 llm_adapter | Agent 需要 tools 参数和多轮 messages，单次 generate() 不够用 |
| 前后端通信 | stdin/stdout JSON Lines | Tauri sidecar 标准模式，无需 HTTP server |
| 跨平台路径 | ink_env.py 共享模块 | macOS `~/.ink`，Windows `%APPDATA%/Ink`，消除重复 |
| 搜索引擎 | Tavily 优先 + SerpAPI 降级 | auto 模式自动选择可用引擎 |
| 排版样式 | 5 种 layoutStyle | 模板级控制，前端→sidecar→LLM 全链路传递 |

## 数据存储

| 数据 | 路径 |
|------|------|
| 文章输出 | `INK_HOME/articles/{timestamp}/` |
| Agent 工作区 | `INK_HOME/agent-workspace/{task_id}/` |
| 日志 | `INK_HOME/logs/{date}.log` |
| 缓存 | `INK_HOME/cache/` |
| 应用配置 | `INK_HOME/config.json` |
| 用户提示词 | `INK_HOME/prompts/`（覆盖内置） |
| 前端配置 | localStorage（模板、模型设置） |

> INK_HOME: macOS/Linux `~/.ink`，Windows `%APPDATA%/Ink`

## 命名约定

- localStorage key 前缀：`ink-`（如 `ink-templates`、`ink-config`）
- Sidecar 事件名：`sidecar-event`
- API 路径风格：sidecar action 字符串（`generate`、`agent_generate`、`list_articles`）
- Python 模块命名：snake_case
- React 组件命名：PascalCase
