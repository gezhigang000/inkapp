# 迭代进度

## 版本历史

### v1.0 — MVP
- [x] 基础文章生成（单次 LLM 调用）
- [x] 搜索集成（Tavily）
- [x] 微信公众号发布
- [x] 封面图生成（Pillow）

### v1.1–v1.3 — 多模型 + 文件处理
- [x] 多 LLM 提供商支持（DeepSeek/GLM/Doubao/Kimi/OpenAI）
- [x] 文件上传与文本提取（Excel/Word/PDF/PPT）
- [x] 文档翻译（保持原格式）

### v1.4 — Agent 模式
- [x] 多轮 function-calling 循环
- [x] 工具：web_search / run_python / read_file / write_file
- [x] Workspace 隔离
- [x] 提示词分层架构重构

### v1.5–v1.8 — 模板与排版
- [x] 10+ 内置模板
- [x] 自定义模板（用户创建/编辑/删除）
- [x] 5 种排版样式（modular/chapter/card/narrative/custom）
- [x] 视频分析模板
- [x] 数据分析模板

### v1.9 — 封面与跨平台
- [x] 封面标题自定义（留空用文章标题）
- [x] 排版样式个性化 + HTML 质量规则修复
- [x] 跨平台路径统一（ink_env.py）
- [x] CJK 字体跨平台支持（macOS/Windows/Linux）
- [x] 搜索引擎 auto 降级（Tavily → SerpAPI）
- [x] Tauri assetProtocol Windows scope
- [x] 清理过时文件（batch_generate、run.sh、旧文档）
- [x] 标准项目文档补齐

### 下一步计划
- [ ] Linux 平台支持
- [ ] 暗色模式
- [ ] 文章导出（Markdown / PDF / Word）
- [ ] 定时发布
