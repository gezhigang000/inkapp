# 质取AI知识创作工具 - 产品设计文档

## 产品定位

跨平台桌面 AI 知识创作工具，支持 Windows/macOS，买断制售卖，用户自带大模型 API Key。

## 目标用户

自媒体运营者、企业内容团队、个人知识工作者。

## 技术架构：Tauri + Python Sidecar

```
质取AI知识创作工具
├── Tauri Shell (Rust)
│   ├── 窗口管理、系统托盘、自动更新
│   ├── Sidecar 生命周期管理
│   └── 文件系统访问
├── 前端 UI (React/Vue + TypeScript)
│   ├── 首页仪表盘
│   ├── 文章创作（三种模式）
│   ├── 模型配置 + 帮助文档
│   ├── 发布管理（微信公众号，增值功能）
│   └── 设置
├── Python Sidecar (PyInstaller 打包)
│   ├── daily_ai_news.py
│   ├── llm_adapter.py
│   ├── search_adapter.py
│   ├── image_processor.py
│   └── video_analyzer.py
└── 本地存储
    ├── config.json（API Key 用 keychain 加密）
    ├── articles/（生成的文章）
    └── logs/
```

## 功能模块

### 1. 模型配置页

支持模型：DeepSeek、智谱GLM、豆包、Kimi、OpenAI。

每个模型卡片：名称 + Logo、连接状态、API Key 输入、"如何获取 Key" 引导文档。
搜索服务配置：Tavily / SerpAPI，同样带引导。

### 2. 文章创作页

三种模式：
- 日报模式：自动选题或手动指定方向
- 深度研究：输入主题关键词
- 视频分析：粘贴 YouTube 链接

选择模型 → 开始生成 → 实时进度展示 → 预览文章 + 封面图。

### 3. 文章管理页

历史文章列表（封面缩略图 + 标题 + 日期 + 状态），支持预览、复制 HTML、导出。

### 4. 发布管理（增值功能）

微信公众号配置（AppID/AppSecret），一键发布或存草稿。

### 5. 设置页

输出目录、默认作者名、封面图风格偏好。

## 本地存储结构

```
~/质取AI/
├── config.json          # 用户配置（Key 用 keychain 加密）
├── articles/
│   └── 2026-02-16-AI-Agent/
│       ├── article.html
│       ├── cover.png
│       ├── metadata.json
│       └── images/
└── logs/
```

## Sidecar 通信协议

Python 通过 stdout 输出 JSON Lines：

```json
{"type": "progress", "stage": "searching", "message": "正在搜索..."}
{"type": "progress", "stage": "generating", "message": "正在生成...", "percent": 30}
{"type": "result", "status": "success", "article_path": "...", "title": "..."}
{"type": "error", "code": "API_KEY_INVALID", "message": "API Key 无效"}
```

Tauri Rust 端逐行解析，通过事件系统推送给前端。

## 模型注册引导文档

| 模型 | 平台 | 引导内容 |
|------|------|---------|
| DeepSeek | open.bigmodel.cn | 注册、Key 创建、免费额度 |
| 智谱 GLM | open.bigmodel.cn | 注册、Key 创建、模型选择 |
| 豆包 | console.volcengine.com | 注册、开通服务、创建 Key |
| Kimi | platform.moonshot.cn | 注册、Key 获取、额度说明 |
| OpenAI | platform.openai.com | 注册（海外手机号说明）、Key 创建 |

内嵌应用内，点击"如何获取"弹窗展示。

## 打包分发

- Windows：`.msi`（Tauri 默认）
- macOS：`.dmg`（需 Apple 签名）
- Python sidecar 用 PyInstaller 分平台编译
- 自动更新：Tauri updater 插件

## 授权方式

买断制，激活码验证。可区分基础版/专业版（专业版含发布功能）。

## 需要新增支持的模型

现有 llm_adapter.py 支持 Claude/DeepSeek/OpenAI，需新增：
- 智谱 GLM（兼容 OpenAI 接口格式）
- 豆包（火山引擎 API）
- Kimi（Moonshot API，兼容 OpenAI 接口格式）
