# Ink — AI 内容创作桌面应用

Tauri v2 桌面应用，集成多模型 AI 写作、Agent 深度调研、文档翻译、数据分析，一键生成微信公众号文章。

## 功能

- **模板化创作**：行业日报、深度研究、数据分析、文档翻译等 10+ 模板
- **Agent 模式**：多轮工具调用（web_search / run_python / read_file / write_file），自主调研+写作
- **多模型支持**：DeepSeek / 智谱 GLM / 豆包 / Kimi / OpenAI，应用内切换
- **封面图生成**：Pillow 自动生成，支持自定义色调（深色/浅色/彩色）、图案、标题、署名
- **文档翻译**：上传 Word/Excel/PDF/PPT，保持原格式翻译
- **微信发布**：一键推送到公众号草稿箱（封面图+文章+配图自动处理）
- **文章管理**：历史文章浏览、搜索、删除、重新发布

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React + TypeScript + Vite + TailwindCSS |
| 桌面框架 | Tauri v2 (Rust) |
| AI 后端 | Python sidecar (PyInstaller 打包) |
| LLM 调用 | OpenAI 兼容协议 (requests) |
| 搜索 | Tavily / SerpAPI |
| 封面图 | Pillow |
| 文档处理 | python-docx / openpyxl / PyMuPDF / python-pptx |

## 项目结构

```
.
├── app/                          # Tauri 桌面应用
│   ├── src/                      # React 前端
│   │   ├── pages/                # 页面：Home, Create, Articles, Settings
│   │   ├── components/           # 组件：ArticlePreview, GenerateProgress, FileUpload
│   │   ├── hooks/                # useGenerate, useConfig
│   │   └── data/                 # prompt-templates.ts (模板定义)
│   └── src-tauri/                # Rust 后端
│       └── src/sidecar.rs        # Sidecar 进程管理 + 事件转发
│
├── scripts/                      # Python sidecar
│   ├── sidecar_main.py           # 主入口：stdin JSON → 路由 → stdout 事件流
│   ├── daily_ai_news.py          # 文章生成 + 封面图 + 微信发布
│   ├── agent_loop.py             # Agent 模式：多轮工具调用循环
│   ├── agent_prompts.py          # Agent 系统提示词
│   ├── ink_env.py                # 跨平台共享路径（INK_HOME、CJK 字体）
│   ├── llm_adapter.py            # LLM 适配层
│   ├── search_adapter.py         # 搜索适配层（Tavily/SerpAPI 自动降级）
│   ├── translate_inplace.py      # 原格式文档翻译
│   ├── image_processor.py        # 文章配图处理
│   └── build_sidecar.py          # PyInstaller 打包脚本
│
└── docs/                         # 文档
    ├── design-spec.md            # UI 设计规范
    ├── agent-architecture.md     # Agent 模式架构
    └── open-api.md               # 开放 API 文档
```

## 开发

```bash
# 安装前端依赖
cd app && pnpm install

# 编译 Python sidecar
python3 scripts/build_sidecar.py

# 启动开发模式
pnpm tauri dev

# 构建发布包
pnpm tauri build
```

## 封面图自定义

封面图 900×383（微信 2.35:1），在创作页「封面与排版设置」面板配置：

| 设置 | 选项 |
|------|------|
| 色调 | 随机 / 深色 / 浅色 / 彩色 |
| 图案 | 随机 / 几何 / 科技 / 波纹 |
| 标题 | 显示/隐藏，支持自定义（留空用文章标题） |
| 署名 | 自定义文字，默认 "Ink" |

## 架构

```
用户操作 → React 前端 → Tauri invoke("run_sidecar", JSON)
                              ↓
                        Rust sidecar.rs → spawn Python 进程
                              ↓
                        Python sidecar_main.py (stdin 读 JSON)
                              ↓
                        路由到 handler (generate / agent_generate / publish / ...)
                              ↓
                        stdout 输出 JSON 事件流 → Rust 转发 → 前端 listen("sidecar-event")
```
