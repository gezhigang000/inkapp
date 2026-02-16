# Agent 模式架构演进总结

## 一、核心变化：从单次生成到多轮 Agent

| 维度 | v1（单次生成） | v2（Agent 模式） |
|------|---------------|-----------------|
| LLM 调用 | 1 次请求 → 1 次响应 | 最多 15 轮迭代，LLM 自主决定何时结束 |
| 搜索能力 | 搜索结果注入 prompt，LLM 一次性消化 | LLM 按需调用 `web_search`，可多次搜索不同关键词 |
| 数据处理 | 文件文本提取后拼入 prompt | LLM 通过 `run_python` 自主编写分析代码 |
| 文件输出 | 仅 HTML | HTML + 原格式文件（.docx/.xlsx/.pdf） |
| 工作流控制 | 代码硬编码流程 | LLM 自主规划，工具调用驱动 |

## 二、架构对比

### v1 数据流

```
前端 → Tauri(sidecar.rs) → Python(sidecar_main.py)
         │                        │
         │                   handle_generate()
         │                        │
         │                   search_adapter → 搜索
         │                        │
         │                   llm_adapter.generate() → 单次 LLM 调用
         │                        │
         │                   extract_html → save_article → cover
         │                        │
         └── sidecar-event ←── emit(result)
```

### v2 数据流（Agent 模式）

```
前端(agentMode=true) → Tauri(sidecar.rs) → Python(sidecar_main.py)
         │                    │                     │
         │              Value 透传            handle_agent_generate()
         │                    │                     │
         │                    │              init_workspace()
         │                    │                     │
         │                    │              run_agent_loop() ←── agent_prompts.py
         │                    │                     │
         │                    │              ┌──────┴──────┐
         │                    │              │  Agent 循环  │ (最多 15 轮)
         │                    │              │             │
         │                    │              │  LLM ──→ tool_calls?
         │                    │              │   │         │
         │                    │              │   ├─ web_search (复用 search_adapter)
         │                    │              │   ├─ run_python (subprocess/exec)
         │                    │              │   ├─ read_file  (workspace 内)
         │                    │              │   └─ write_file (workspace 内)
         │                    │              │             │
         │                    │              │  tool result → 追加到 messages
         │                    │              │             │
         │                    │              └─ 无 tool_calls → 结束
         │                    │                     │
         │                    │              读取 output/article.html
         │                    │              复制原格式文件 → articles/
         │                    │              extract → save → cover
         │                    │                     │
         └── sidecar-event ←─┴──────── emit(result)
```

## 三、新增文件

| 文件 | 职责 |
|------|------|
| `scripts/agent_loop.py` | Agent 核心：工具定义、工具实现、LLM function-calling、主循环、workspace 管理 |
| `scripts/agent_prompts.py` | Agent 系统提示词构建，合并模板 prompt，翻译场景文件格式规则 |

## 四、关键设计决策

### 1. Agent 独立的 LLM 调用

Agent 没有复用 `llm_adapter.py` 的 `generate()` 函数，而是自己用 `requests.post` 直接调用 API。原因：

- `llm_adapter.generate()` 只支持单条 prompt → 单条响应
- Agent 需要传递 `tools` 参数和解析 `tool_calls` 响应
- Agent 需要维护多轮 `messages` 对话历史

但 provider→endpoint/key/model 的映射关系与 `llm_adapter.py` 保持一致。

### 2. Workspace 隔离

每次 Agent 运行在 `~/.ink/agent-workspace/{timestamp}/` 下，包含 `input/`、`data/`、`output/` 三个子目录。好处：

- 防止多次运行之间文件冲突
- `run_python` 的 cwd 限定在 workspace 内
- `read_file`/`write_file` 有路径校验防止目录穿越

### 3. run_python 双模式

- 开发环境：`subprocess.run([sys.executable, "-c", code])` — 独立进程，安全隔离
- PyInstaller 打包后：`exec()` + `threading` 超时 — 因为打包后没有独立 Python 解释器

### 4. 事件透传（serde_json::Value）

Rust 侧从固定字段的 `SidecarEvent` struct 改为 `serde_json::Value` 透传。Agent 会发送额外字段（turn、tool、detail 等），Value 模式确保这些字段不会在反序列化时丢失。

### 5. 向后兼容

- 非 Agent 模板（行业日报、技术教程、产品测评、PPT 制作）仍走 `action: "generate"` 单次路径
- `handle_generate` 完全不变
- 前端通过 `agentMode` 字段区分，无 Agent 标记的模板行为不受影响

### 6. 翻译场景格式保持

翻译模板启用 Agent 后，LLM 通过 `run_python` 调用 python-docx/openpyxl/reportlab 生成与上传文件相同格式的输出。同时生成 HTML 预览版供前端展示。

## 五、模板 Agent 启用状态

| 模板 | agentMode | 原因 |
|------|-----------|------|
| 深度研究 | ✅ | 需要多轮搜索 + 深度分析 |
| 数据分析 | ✅ | 需要 run_python 执行分析代码 |
| 文档翻译 | ✅ | 需要 run_python 生成原格式文件 |
| 行业日报 | ❌ | 单次搜索+生成足够 |
| 技术教程 | ❌ | 单次生成足够 |
| 产品测评 | ❌ | 单次生成足够 |
| PPT 制作 | ❌ | 单次生成足够 |
| 视频分析 | ❌ | 独立流程 |
