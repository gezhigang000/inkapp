# AI 编程大战打响：Anthropic 与 OpenAI 同日发布重磅模型，仅差 15 分钟

> 2月5日，AI 行业上演了一场罕见的"贴身肉搏"——Anthropic 发布 Claude Opus 4.6，OpenAI 紧随其后推出 GPT-5.3-Codex，两家原计划在同一时间（太平洋时间上午10点）发布，最终 Anthropic 提前 15 分钟抢先官宣。与此同时，OpenAI 还亮出了企业级 AI Agent 平台 Frontier。这一天，足以载入 AI 发展史。

---

## 一、Claude Opus 4.6：从"写代码"到"做一切知识工作"

Anthropic 这次发布的 Claude Opus 4.6，距离上一代 Opus 4.5 仅隔三个月，但升级幅度惊人。

### 1. 百万级上下文窗口

Opus 4.6 将上下文窗口从 20 万 tokens 扩展至 **100 万 tokens**（约 75 万字），并且在超长上下文下不会出现此前模型常见的性能退化问题。同时，输出上限提升至 **12.8 万 tokens**，可以一次性生成完整的长文档。

超过 20 万 tokens 的长上下文使用采用溢价定价（$10/$37.50 每百万 tokens），常规使用保持 $5/$25 不变。

### 2. 自适应思考（Adaptive Thinking）

传统的"扩展思考"模式需要手动设置预算参数，Opus 4.6 引入了**自适应思考**机制——模型根据问题复杂度自动决定是否启用深度推理以及推理的深度，提供低、中、高、最大四个档位。简单问题快速响应，复杂问题深入思考，不再需要人工调参。

### 3. Agent Teams（智能体团队）

在 Claude Code 中，开发者可以创建**多个 AI 智能体并行协作**。不再是单个助手按顺序处理任务，而是多个 Agent 同时处理项目的不同模块，大幅提升复杂项目的开发效率。

### 4. 发现 500+ 零日漏洞

这是本次发布最震撼的亮点。Anthropic 的前沿红队在沙箱环境中测试 Opus 4.6 的安全能力时，模型仅凭"开箱即用"的能力，**发现了超过 500 个此前未知的零日安全漏洞**，涵盖 GhostScript、OpenSC、CGIF 等广泛使用的开源项目。

这些漏洞中不乏存在了**数十年**而未被发现的高危漏洞。在 CGIF 的案例中，Claude 甚至主动编写了概念验证代码来证实漏洞的真实性。

Anthropic 同时警告：当 AI 发现漏洞的速度和规模超过人类安全研究员时，行业标准的 90 天漏洞披露窗口可能需要重新审视。

### 5. 基准测试全面领先

| 基准测试 | Opus 4.6 得分 | 对比 |
|---------|-------------|------|
| GDPval-AA（知识工作） | 1,606 Elo | 超 GPT-5.2 **144 分** |
| ARC-AGI 2（新问题求解） | 68.8% | 超 GPT-5.2 Pro 的 54.2% |
| Terminal-Bench 2.0（编码） | 65.4% | 最高 agentic 编码分 |
| Humanity's Last Exam | 53.1%（使用工具） | 所有前沿模型最高 |
| BigLaw Bench（法律推理） | 90.2% | — |

### 6. "Vibe Working" 概念

Anthropic 企业产品负责人 Scott White 提出了**"Vibe Working"（氛围工作）**这一概念："过去一年半，软件工程领域经历了 Vibe Coding 的变革。现在，我们正过渡到 Vibe Working 时代。"Opus 4.6 不仅能写代码，还全面升级了 Excel 集成能力，并以研究预览形式推出了 PowerPoint 集成——能感知设计系统，保留现有布局、字体和母版设置。

---

## 二、GPT-5.3-Codex："第一个参与创造自身的模型"

OpenAI 的回应同样重磅。GPT-5.3-Codex 被定位为"迄今最强的 agentic 编码模型"，有一个独特卖点——**它是 OpenAI 第一个在自身的训练和部署调试中发挥关键作用的模型**，可以称为"第一个自我开发的 AI 模型"。

### 核心特性

- **40 万 tokens 上下文 + 12.8 万 tokens 输出**，速度比上一代快 25%
- **覆盖软件全生命周期**：调试、部署、监控、编写 PRD、用户研究、测试、指标分析，不止于写代码
- **像同事一样可引导**：执行长时间运行的复杂任务时，开发者可以像与同事协作一样随时介入、调整方向

### 基准表现

| 基准测试 | GPT-5.3-Codex | 对比 |
|---------|--------------|------|
| Terminal-Bench 2.0 | **77.3%** | 超 Opus 4.6 的 65.4% |
| SWE-Bench Pro | 56.8% | 新行业最高 |
| OSWorld-Verified | 64.7% | 接近人类基线 72% |
| GDPval | 70.9% | 44 个职业类别 |

值得注意的是，在 Terminal-Bench 2.0（编码基准）上，GPT-5.3-Codex 以 **77.3%** 大幅超过 Opus 4.6 的 65.4%，但 Opus 4.6 在知识工作类基准（GDPval-AA）和新问题求解（ARC-AGI 2）上更占优势。**两家各有所长，并非单方面碾压。**

### 安全举措

这是 OpenAI 首次在网络安全领域按"高能力"级别处理的发布，激活了相应的安全保障措施，同时推出：
- Trusted Access for Cyber 试点项目
- Aardvark 安全研究 Agent 扩大测试
- 为主要开源项目提供免费漏洞扫描
- 1000 万美元 API 信用额度用于网络安全防御

---

## 三、OpenAI Frontier：要做企业的"AI 操作系统"

同日发布的还有 OpenAI 的企业级平台 **Frontier**，野心不小——要成为企业的"AI 操作系统"。

### 核心理念

Frontier 像管理员工一样管理 AI Agent：提供入职流程、身份权限、绩效反馈，让 AI Agent 在企业中像真正的"数字员工"一样运作。

### 关键能力

- **打通数据孤岛**：连接企业内部应用、工单系统、数据仓库，为 Agent 提供共享业务上下文
- **开放平台**：兼容 OpenAI、Google、Microsoft、Anthropic 等多方构建的 Agent
- **Agent 可在本地、你的云或 OpenAI 托管环境中运行**
- **内置治理**：每个 Agent 有明确的身份、权限和安全护栏

### 首批客户成果

- 某大型制造商：生产优化工作从**6 周缩短到 1 天**
- 某全球投资公司：销售人员释放了**超 90%** 的时间用于客户交流
- 某科技公司：产品开发每月节省 **1,500 小时**

首批用户包括 Uber、State Farm、Intuit、Thermo Fisher Scientific 等。

---

## 四、一天之内，行业格局悄然改变

回顾 2 月 5 日这一天，几个趋势值得关注：

**1. AI 编程正在"卷"出新高度。** 两家顶尖公司同日发布编码模型，Terminal-Bench、SWE-Bench 等基准分数持续攀升，AI 编程能力正在加速逼近甚至超越人类基线。

**2. 从"写代码"到"做工作"的跨越。** 无论是 Anthropic 的"Vibe Working"还是 OpenAI Codex 的"覆盖软件全生命周期"，两家都在传达同一个信号：AI 不再只是程序员的工具，它正在成为所有知识工作者的协作伙伴。

**3. AI 安全能力成为新战场。** Opus 4.6 发现 500+ 零日漏洞，GPT-5.3-Codex 首次按"高网络安全能力"级别发布。AI 在网络安全领域的能力正在快速增长，这既是机遇也是挑战。

**4. 企业级 AI Agent 平台之争开启。** OpenAI Frontier 的发布标志着 AI 公司从"卖模型"向"卖平台"的转变。未来的竞争不仅在模型能力上，更在谁能成为企业 AI 基础设施的标准。

---

*参考来源：*

- *[Anthropic 官方公告](https://www.anthropic.com/news/claude-opus-4-6)*
- *[OpenAI GPT-5.3-Codex 发布](https://openai.com/index/introducing-gpt-5-3-codex/)*
- *[OpenAI Frontier 平台](https://openai.com/index/introducing-openai-frontier/)*
- *[TechCrunch: 两家同日发布](https://techcrunch.com/2026/02/05/openai-launches-new-agentic-coding-model-only-minutes-after-anthropic-drops-its-own/)*
- *[The New Stack: Opus 4.6 企业评测](https://thenewstack.io/anthropics-opus-4-6-is-a-step-change-for-the-enterprise/)*
- *[VentureBeat: Agent Teams 详解](https://venturebeat.com/technology/anthropics-claude-opus-4-6-brings-1m-token-context-and-agent-teams-to-take)*
- *[Fortune: Frontier 平台分析](https://fortune.com/2026/02/05/openai-frontier-ai-agent-platform-enterprises-challenges-saas-salesforce-workday/)*
