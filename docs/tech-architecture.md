# 技术架构文档

## 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| 前端 | React + TypeScript + Vite + TailwindCSS | React 19, Vite 6, TW 4 |
| 桌面框架 | Tauri v2 (Rust) | 2.x |
| AI 后端 | Python sidecar (PyInstaller 打包) | Python 3.11+ |
| LLM 调用 | OpenAI 兼容协议 (requests) | — |
| 搜索 | Tavily / SerpAPI（auto 降级） | — |
| 封面图 | Pillow | 9.0+ |
| 文档处理 | python-docx / openpyxl / PyMuPDF / python-pptx | — |
| 数据分析 | pandas / numpy / matplotlib | — |
| 对象存储 | 阿里云 OSS (oss2) | — |
| CI/CD | GitHub Actions | — |

## 架构图

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

## 模块划分

### 前端 (app/src/)

| 模块 | 文件 | 职责 |
|------|------|------|
| 页面 | `pages/Home.tsx` | 模板卡片网格，模板编辑弹窗 |
| | `pages/Create.tsx` | 创作输入、文件上传、封面设置、生成进度、预览 |
| | `pages/Articles.tsx` | 文章列表、搜索、删除、发布 |
| | `pages/Models.tsx` | LLM + 搜索引擎配置 |
| | `pages/Settings.tsx` | 作者、输出目录、微信配置、OSS 配置 |
| | `pages/Logs.tsx` | 日志查看器 |
| Hooks | `hooks/useGenerate.tsx` | 生成状态管理、sidecar 调用、事件监听 |
| | `hooks/useConfig.tsx` | localStorage 配置管理 |
| | `hooks/useTemplates.ts` | 模板 CRUD（localStorage + 内置合并） |
| 数据 | `data/prompt-templates.ts` | 10 个内置模板定义 |
| | `data/model-guides.ts` | 5 个 LLM + 2 个搜索引擎配置指南 |

### Rust 层 (app/src-tauri/)

| 文件 | 职责 |
|------|------|
| `src/sidecar.rs` | Sidecar 进程 spawn、stdin 写入、stdout 读取、事件转发 |
| `src/main.rs` | Tauri 应用入口、窗口管理 |

### Python Sidecar (scripts/)

| 模块 | 职责 |
|------|------|
| `sidecar_main.py` | 主入口：JSON 路由、15 个 handler、日志/缓存管理 |
| `daily_ai_news.py` | 文章生成核心：LLM 调用、HTML 提取、封面图、微信发布 |
| `agent_loop.py` | Agent 核心：工具定义、function-calling 循环、workspace 管理 |
| `agent_prompts.py` | Agent 系统提示词、排版样式指令、HTML 质量规则 |
| `ink_env.py` | 跨平台共享路径（INK_HOME、CJK 字体列表） |
| `llm_adapter.py` | LLM 适配层：provider→endpoint/key/model 映射 |
| `search_adapter.py` | 搜索适配层：Tavily/SerpAPI 统一接口 + auto 降级 |
| `translate_inplace.py` | 原格式文档翻译（DOCX/PPTX/PDF） |
| `video_analyzer.py` | YouTube 视频分析（字幕提取 + 元数据） |
| `image_processor.py` | 文章配图：下载、base64、微信 CDN 上传 |
| `build_sidecar.py` | PyInstaller 打包脚本 |

## Sidecar Actions（前后端通信协议）

| Action | Handler | 说明 |
|--------|---------|------|
| `generate` | `handle_generate` | 单次文章生成（非 Agent 模板） |
| `agent_generate` | `handle_agent_generate` | Agent 多轮生成 |
| `validate_key` | `handle_validate_key` | 验证 LLM API Key |
| `test_wechat` | `handle_test_wechat` | 测试微信 API 连接 |
| `list_articles` | `handle_list_articles` | 列出历史文章 |
| `get_config` | `handle_get_config` | 读取配置 |
| `save_config` | `handle_save_config` | 保存配置 |
| `read_file` | `handle_read_file` | 读取文件内容 |
| `delete_article` | `handle_delete_article` | 删除文章 |
| `render_template` | `handle_render_template` | 渲染 HTML 模板 |
| `extract_files` | `handle_extract_files` | 提取上传文件文本 |
| `get_logs` | `handle_get_logs` | 获取日志 |
| `clear_cache` | `handle_clear_cache` | 清理缓存 |
| `publish_wechat` | `handle_publish_wechat` | 发布到微信 |

## 数据流

### 单次生成模式
```
前端 Create 页 → useGenerate → invoke("run_sidecar", {action: "generate", ...})
    → Rust spawn sidecar → Python handle_generate()
    → search_adapter 搜索 → llm_adapter 单次 LLM 调用
    → extract_html → save_article → generate_cover_image
    → emit(result) → stdout JSON → Rust 转发 → 前端 listen("sidecar-event")
```

### Agent 模式
```
前端 Create 页 → useGenerate → invoke("run_sidecar", {action: "agent_generate", ...})
    → Rust spawn sidecar → Python handle_agent_generate()
    → init_workspace → run_agent_loop (最多 N 轮)
    → 每轮: LLM → tool_calls? → 执行工具 → 结果追加到 messages
    → 无 tool_calls → 结束 → 读取 output/article.html
    → save_article → generate_cover_image → emit(result)
```

## 第三方服务

| 服务 | 用途 | 配置方式 |
|------|------|---------|
| DeepSeek / GLM / Doubao / Kimi / OpenAI | LLM 文本生成 | 应用内 Models 页配置 API Key |
| Tavily | 网页搜索 | 应用内配置 API Key |
| SerpAPI | 网页搜索（备选） | 应用内配置 API Key |
| 微信公众号 API | 文章发布 | Settings 页配置 AppID + AppSecret |
| 阿里云 OSS | 图片存储 | Settings 页配置 Bucket + AccessKey |

## 构建与发布

### CI/CD (GitHub Actions)

`v*` tag 推送触发 `.github/workflows/build.yml`：

1. **build-sidecar**: macOS (aarch64) + Windows (x64) 分别用 PyInstaller 打包 Python sidecar
2. **build-tauri**: 下载 sidecar artifact → npm ci → tauri build → 创建 GitHub Release (draft)

### 产物

| 平台 | 格式 |
|------|------|
| macOS | `.dmg` |
| Windows | `.msi` + `.exe` (NSIS) |

## 跨平台路径（v1.9.2+）

通过 `scripts/ink_env.py` 统一管理：

| 平台 | INK_HOME | CJK 字体来源 |
|------|----------|-------------|
| macOS | `~/.ink` | 系统字体（STHeiti/Hiragino/PingFang） |
| Windows | `%APPDATA%/Ink` | Windows Fonts（msyh/simhei/simsun） |
| Linux | `~/.ink` | Noto Sans CJK / WenQuanYi |

Tauri assetProtocol scope 同时包含 `$HOME/.ink/**` 和 `$APPDATA/Ink/**`。
