# 质取AI知识创作工具 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有 Python 命令行工具产品化为 Tauri 跨平台桌面应用，支持多模型配置和 GUI 操作。

**Architecture:** Tauri 2.0 + React + TypeScript 前端，Python sidecar（PyInstaller 打包）后端。前后端通过 Tauri sidecar stdout JSON Lines 通信。

**Tech Stack:** Tauri 2.0, React 18, TypeScript, TailwindCSS, Python 3.11+, PyInstaller

---

## Phase 1: 项目脚手架与基础通信

### Task 1: 初始化 Tauri 2.0 + React 项目

**Files:**
- Create: `app/` (Tauri 项目根目录)
- Create: `app/src-tauri/tauri.conf.json`
- Create: `app/src-tauri/src/main.rs`
- Create: `app/src-tauri/Cargo.toml`
- Create: `app/src/App.tsx`
- Create: `app/package.json`

**Step 1: 安装 Tauri CLI**

Run: `npm create tauri-app@latest app -- --template react-ts`

**Step 2: 验证项目结构**

Run: `ls app/src-tauri/src/main.rs && ls app/src/App.tsx`
Expected: 两个文件都存在

**Step 3: 安装依赖**

Run: `cd app && npm install`

**Step 4: 安装 TailwindCSS**

Run: `cd app && npm install -D tailwindcss @tailwindcss/vite`

**Step 5: 验证 dev 构建**

Run: `cd app && npm run tauri dev` (手动执行，确认窗口弹出)

**Step 6: Commit**

```bash
git add app/
git commit -m "feat: 初始化 Tauri 2.0 + React + TypeScript 项目脚手架"
```

---

### Task 2: Python sidecar 通信协议改造

**Files:**
- Create: `scripts/sidecar_main.py`
- Modify: `scripts/llm_adapter.py`

**Step 1: 创建 sidecar 入口脚本**

`scripts/sidecar_main.py` — 接收 JSON 命令（stdin），输出 JSON Lines 进度（stdout）：

```python
#!/usr/bin/env python3
"""
Sidecar 入口：接收 Tauri 前端命令，输出 JSON Lines 进度。
用法: echo '{"action":"generate","mode":"daily",...}' | python3 sidecar_main.py
"""
import sys
import json

def emit(event_type, **kwargs):
    """输出一行 JSON 事件到 stdout"""
    event = {"type": event_type, **kwargs}
    print(json.dumps(event, ensure_ascii=False), flush=True)

def handle_generate(params):
    """处理文章生成请求"""
    emit("progress", stage="init", message="正在初始化...")
    # 调用现有 daily_ai_news 逻辑
    # ...
    emit("result", status="success", title="...", article_path="...")

def main():
    raw = sys.stdin.read()
    try:
        command = json.loads(raw)
    except json.JSONDecodeError:
        emit("error", code="INVALID_INPUT", message="无效的 JSON 输入")
        sys.exit(1)

    action = command.get("action")
    if action == "generate":
        handle_generate(command)
    elif action == "validate_key":
        handle_validate_key(command)
    elif action == "list_articles":
        handle_list_articles(command)
    else:
        emit("error", code="UNKNOWN_ACTION", message=f"未知操作: {action}")

if __name__ == "__main__":
    main()
```

**Step 2: 测试 sidecar 协议**

Run: `echo '{"action":"generate","mode":"daily"}' | python3 scripts/sidecar_main.py`
Expected: JSON Lines 输出

**Step 3: Commit**

```bash
git add scripts/sidecar_main.py
git commit -m "feat: 添加 sidecar 入口脚本，支持 JSON Lines 通信协议"
```

---

### Task 3: Tauri Rust 端 sidecar 集成

**Files:**
- Modify: `app/src-tauri/tauri.conf.json`
- Modify: `app/src-tauri/src/main.rs`
- Create: `app/src-tauri/src/sidecar.rs`

**Step 1: 配置 sidecar**

在 `tauri.conf.json` 中注册 sidecar：

```json
{
  "bundle": {
    "externalBin": ["../scripts/sidecar_main"]
  }
}
```

**Step 2: 编写 Rust sidecar 调用模块**

`app/src-tauri/src/sidecar.rs`:

```rust
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct SidecarEvent {
    pub r#type: String,
    pub stage: Option<String>,
    pub message: Option<String>,
    pub percent: Option<u32>,
    pub status: Option<String>,
    pub article_path: Option<String>,
    pub title: Option<String>,
    pub code: Option<String>,
}

#[tauri::command]
pub async fn run_sidecar(
    app: tauri::AppHandle,
    command: serde_json::Value,
) -> Result<(), String> {
    let sidecar = app.shell()
        .sidecar("sidecar_main")
        .map_err(|e| e.to_string())?;

    let (mut rx, _child) = sidecar
        .args(&[])
        .spawn()
        .map_err(|e| e.to_string())?;

    // 逐行读取 stdout，解析 JSON，发送事件到前端
    // ...
    Ok(())
}
```

**Step 3: 注册命令到 main.rs**

```rust
mod sidecar;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![sidecar::run_sidecar])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 4: Commit**

```bash
git add app/src-tauri/
git commit -m "feat: Tauri Rust 端 sidecar 集成，支持 JSON Lines 事件流"
```

---

## Phase 2: 前端 UI 核心页面

### Task 4: 路由与布局框架

**Files:**
- Create: `app/src/layouts/MainLayout.tsx`
- Create: `app/src/pages/Dashboard.tsx`
- Create: `app/src/pages/Create.tsx`
- Create: `app/src/pages/Models.tsx`
- Create: `app/src/pages/Articles.tsx`
- Create: `app/src/pages/Settings.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/package.json`

**Step 1: 安装路由**

Run: `cd app && npm install react-router-dom`

**Step 2: 创建侧边栏布局**

`MainLayout.tsx` — 左侧导航栏（首页/创作/模型/文章/设置），右侧内容区。

**Step 3: 创建空白页面占位**

每个页面文件只需标题占位，后续逐个实现。

**Step 4: 配置路由**

`App.tsx` 中配置 react-router，5 个路由对应 5 个页面。

**Step 5: 验证导航**

手动 `npm run tauri dev`，确认侧边栏导航切换正常。

**Step 6: Commit**

```bash
git add app/src/
git commit -m "feat: 前端路由与侧边栏布局框架"
```

---

### Task 5: 模型配置页

**Files:**
- Modify: `app/src/pages/Models.tsx`
- Create: `app/src/components/ModelCard.tsx`
- Create: `app/src/components/HelpModal.tsx`
- Create: `app/src/data/model-guides.ts`
- Create: `app/src/hooks/useConfig.ts`

**Step 1: 定义模型数据结构**

`app/src/data/model-guides.ts`:

```typescript
export interface ModelProvider {
  id: string;
  name: string;
  logo: string;        // SVG 或图片路径
  apiEndpoint: string;
  configKeys: { key: string; label: string; placeholder: string }[];
  guide: {
    registerUrl: string;
    steps: string[];    // HTML 内容，支持截图
    freeQuota: string;
    faq: { q: string; a: string }[];
  };
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    apiEndpoint: "https://api.deepseek.com/v1",
    configKeys: [
      { key: "DEEPSEEK_API_KEY", label: "API Key", placeholder: "sk-..." },
      { key: "DEEPSEEK_MODEL", label: "模型", placeholder: "deepseek-chat" },
    ],
    guide: {
      registerUrl: "https://platform.deepseek.com",
      steps: ["访问 platform.deepseek.com 注册账号", "进入控制台 → API Keys", "点击创建 API Key，复制保存"],
      freeQuota: "新用户赠送 500 万 tokens",
      faq: [{ q: "Key 提示无效？", a: "检查是否复制完整，包含 sk- 前缀" }],
    },
    // ...
  },
  // 智谱GLM, 豆包, Kimi, OpenAI ...
];
```

**Step 2: 实现 ModelCard 组件**

显示模型名称、连接状态、API Key 输入框、"如何获取" 按钮。

**Step 3: 实现 HelpModal 弹窗**

点击"如何获取 Key"弹出引导文档。

**Step 4: 实现 useConfig hook**

读写本地 config.json（通过 Tauri fs API）。

**Step 5: 组装 Models 页面**

**Step 6: Commit**

```bash
git add app/src/
git commit -m "feat: 模型配置页 - 支持 5 个模型的 Key 配置与注册引导"
```

---

### Task 6: 文章创作页

**Files:**
- Modify: `app/src/pages/Create.tsx`
- Create: `app/src/components/ModeSelector.tsx`
- Create: `app/src/components/GenerateProgress.tsx`
- Create: `app/src/components/ArticlePreview.tsx`

**Step 1: 实现模式选择器**

三个 Tab：日报模式 / 深度研究 / 视频分析，每个 Tab 对应不同的参数表单。

**Step 2: 实现生成进度组件**

监听 Tauri 事件（sidecar JSON Lines），显示阶段文字 + 进度条。

**Step 3: 实现文章预览组件**

生成完成后，iframe 或 dangerouslySetInnerHTML 渲染 HTML 文章 + 封面图预览。

**Step 4: 串联创作流程**

选模式 → 填参数 → 选模型 → 点击生成 → 调用 sidecar → 实时进度 → 预览结果。

**Step 5: Commit**

```bash
git add app/src/
git commit -m "feat: 文章创作页 - 三种模式选择、实时进度、文章预览"
```

---

### Task 7: 文章管理页

**Files:**
- Modify: `app/src/pages/Articles.tsx`
- Create: `app/src/components/ArticleList.tsx`
- Create: `app/src/components/ArticleActions.tsx`

**Step 1: 扫描本地文章目录**

通过 Tauri fs API 读取 `~/质取AI/articles/` 下的 metadata.json 列表。

**Step 2: 实现文章列表**

封面缩略图 + 标题 + 日期 + 状态，支持搜索筛选。

**Step 3: 实现操作按钮**

预览（新窗口）、复制 HTML（剪贴板）、导出文件。

**Step 4: Commit**

```bash
git add app/src/
git commit -m "feat: 文章管理页 - 历史文章列表与操作"
```

---

## Phase 3: 后端模型扩展

### Task 8: llm_adapter 新增 GLM/豆包/Kimi 支持

**Files:**
- Modify: `scripts/llm_adapter.py`

**Step 1: 新增 _generate_via_glm()**

智谱 GLM 兼容 OpenAI 接口格式，endpoint: `https://open.bigmodel.cn/api/paas/v4/chat/completions`

```python
def _generate_via_glm(prompt, config, timeout):
    api_key = config.get("GLM_API_KEY", "")
    if not api_key:
        raise LLMError("未配置 GLM_API_KEY")
    model = config.get("GLM_MODEL", "glm-4-flash")
    return _generate_via_openai_compatible(
        prompt, api_key, model,
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        timeout, "智谱 GLM"
    )
```

**Step 2: 新增 _generate_via_doubao()**

豆包（火山引擎）endpoint: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`

**Step 3: 新增 _generate_via_kimi()**

Kimi（月之暗面）兼容 OpenAI 格式，endpoint: `https://api.moonshot.cn/v1/chat/completions`

**Step 4: 抽取公共方法 _generate_via_openai_compatible()**

GLM、Kimi、OpenAI 都兼容 OpenAI 格式，抽取公共调用逻辑，减少重复代码。

**Step 5: 更新 generate() 路由**

在 `generate()` 函数中添加 `glm`、`doubao`、`kimi` 三个 provider 分支。

**Step 6: 测试各模型调用**

Run: `python3 -c "from scripts.llm_adapter import generate; print('OK')"`

**Step 7: Commit**

```bash
git add scripts/llm_adapter.py
git commit -m "feat: llm_adapter 新增智谱GLM、豆包、Kimi 模型支持"
```

---

### Task 9: sidecar_main 完整实现

**Files:**
- Modify: `scripts/sidecar_main.py`

**Step 1: 实现 handle_generate()**

调用 daily_ai_news.py 中的核心函数，在关键节点 emit 进度事件：
- `searching` → 搜索资讯
- `generating` → LLM 生成
- `processing_images` → 处理配图
- `generating_cover` → 生成封面
- `splitting` → 拆分文章（如需要）
- `result` → 完成，返回文件路径

**Step 2: 实现 handle_validate_key()**

验证 API Key 有效性（发送一个简单请求测试连通性）。

**Step 3: 实现 handle_list_articles()**

扫描输出目录，返回文章元数据列表。

**Step 4: 实现 handle_get_config() / handle_save_config()**

读写 config.json。

**Step 5: Commit**

```bash
git add scripts/sidecar_main.py
git commit -m "feat: sidecar 完整实现 - 生成、验证、文章管理、配置读写"
```

---

## Phase 4: 增值功能与打包

### Task 10: 微信公众号发布集成

**Files:**
- Modify: `app/src/pages/Settings.tsx`
- Create: `app/src/components/WechatConfig.tsx`

**Step 1: 微信配置表单**

AppID / AppSecret 输入，测试连接按钮。

**Step 2: 文章管理页添加"发布"按钮**

调用 sidecar 的发布功能。

**Step 3: Commit**

```bash
git add app/src/
git commit -m "feat: 微信公众号发布配置与一键发布"
```

---

### Task 11: PyInstaller 打包 sidecar

**Files:**
- Create: `scripts/build_sidecar.py`
- Modify: `app/src-tauri/tauri.conf.json`

**Step 1: 编写 PyInstaller 打包脚本**

```python
# scripts/build_sidecar.py
import PyInstaller.__main__
import platform

PyInstaller.__main__.run([
    "scripts/sidecar_main.py",
    "--onefile",
    "--name", f"sidecar_main-{platform.machine()}",
    "--distpath", "app/src-tauri/binaries/",
    "--clean",
])
```

**Step 2: 配置 Tauri externalBin 路径**

**Step 3: 测试打包后的 sidecar**

Run: `python3 scripts/build_sidecar.py`
Run: `echo '{"action":"list_articles"}' | ./app/src-tauri/binaries/sidecar_main-*`

**Step 4: Commit**

```bash
git add scripts/build_sidecar.py app/src-tauri/
git commit -m "feat: PyInstaller sidecar 打包脚本"
```

---

### Task 12: Tauri 应用打包与分发

**Files:**
- Modify: `app/src-tauri/tauri.conf.json`

**Step 1: 配置应用元信息**

```json
{
  "productName": "质取AI知识创作工具",
  "version": "1.0.0",
  "identifier": "com.zhiqu.ai-creator",
  "bundle": {
    "icon": ["icons/icon.png"],
    "targets": ["dmg", "msi"]
  }
}
```

**Step 2: 构建 macOS 版本**

Run: `cd app && npm run tauri build`

**Step 3: 构建 Windows 版本**（需 Windows 环境或 CI）

**Step 4: Commit**

```bash
git add app/
git commit -m "feat: Tauri 应用打包配置 - macOS dmg + Windows msi"
```

---

## 任务依赖关系

```
Task 1 (Tauri 脚手架)
  ├── Task 2 (sidecar 协议) → Task 3 (Rust 集成) → Task 9 (sidecar 完整实现)
  ├── Task 4 (路由布局) → Task 5 (模型配置页)
  │                      → Task 6 (创作页)
  │                      → Task 7 (文章管理页)
  │                      → Task 10 (微信发布)
  └── Task 8 (模型扩展，可并行)

Task 9 + Task 6 → 端到端生成流程可用
Task 11 (PyInstaller) → Task 12 (最终打包)
```

## 建议执行顺序

1. Task 1 → Task 2 → Task 8（并行）→ Task 3 → Task 4
2. Task 5 → Task 6 → Task 7 → Task 9
3. Task 10 → Task 11 → Task 12
