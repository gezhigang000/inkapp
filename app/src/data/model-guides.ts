export interface ModelProvider {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
  configKeys: { key: string; label: string; placeholder: string; type?: "text" | "password" }[];
  guide: {
    registerUrl: string;
    steps: string[];
    freeQuota: string;
    faq: { q: string; a: string }[];
  };
}

export interface SearchProvider {
  id: string;
  name: string;
  description: string;
  configKeys: { key: string; label: string; placeholder: string; type?: "text" | "password" }[];
  guide: {
    registerUrl: string;
    steps: string[];
    freeQuota: string;
  };
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "深度求索，国产高性能大模型",
    apiEndpoint: "https://api.deepseek.com/v1",
    configKeys: [
      { key: "DEEPSEEK_API_KEY", label: "API Key", placeholder: "sk-...", type: "password" },
      { key: "DEEPSEEK_MODEL", label: "模型名称", placeholder: "deepseek-chat" },
    ],
    guide: {
      registerUrl: "https://platform.deepseek.com",
      steps: [
        "1. 访问 platform.deepseek.com 注册账号",
        "2. 登录后进入「API Keys」页面",
        "3. 点击「创建 API Key」",
        "4. 复制生成的 Key（以 sk- 开头）",
      ],
      freeQuota: "新用户赠送 500 万 tokens 免费额度",
      faq: [
        { q: "Key 提示无效？", a: "检查是否复制完整，包含 sk- 前缀。确认账户余额充足。" },
        { q: "支持哪些模型？", a: "推荐使用 deepseek-chat（默认）或 deepseek-reasoner。" },
      ],
    },
  },
  {
    id: "glm",
    name: "智谱 GLM",
    description: "智谱AI，清华系大模型",
    apiEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    configKeys: [
      { key: "GLM_API_KEY", label: "API Key", placeholder: "输入 API Key", type: "password" },
      { key: "GLM_MODEL", label: "模型名称", placeholder: "glm-4-flash" },
    ],
    guide: {
      registerUrl: "https://open.bigmodel.cn",
      steps: [
        "1. 访问 open.bigmodel.cn 注册账号",
        "2. 进入控制台 →「API 密钥」",
        "3. 点击「创建 API Key」",
        "4. 复制保存生成的 Key",
      ],
      freeQuota: "GLM-4-Flash 模型免费使用",
      faq: [
        { q: "选哪个模型？", a: "推荐 glm-4-flash（免费且速度快）或 glm-4-plus（效果更好）。" },
      ],
    },
  },
  {
    id: "doubao",
    name: "豆包",
    description: "字节跳动火山引擎大模型",
    apiEndpoint: "https://ark.cn-beijing.volces.com/api/v3",
    configKeys: [
      { key: "DOUBAO_API_KEY", label: "API Key", placeholder: "输入 API Key", type: "password" },
      { key: "DOUBAO_MODEL", label: "模型名称", placeholder: "doubao-1.5-pro-32k" },
    ],
    guide: {
      registerUrl: "https://console.volcengine.com/ark",
      steps: [
        "1. 访问 console.volcengine.com 注册火山引擎账号",
        "2. 进入「火山方舟」控制台",
        "3. 开通模型服务，创建推理接入点",
        "4. 在「API Key 管理」中创建 Key",
      ],
      freeQuota: "新用户有免费体验额度",
      faq: [
        { q: "模型名称怎么填？", a: "使用推理接入点的 endpoint ID，或模型名如 doubao-1.5-pro-32k。" },
      ],
    },
  },
  {
    id: "kimi",
    name: "Kimi",
    description: "月之暗面，长上下文大模型",
    apiEndpoint: "https://api.moonshot.cn/v1",
    configKeys: [
      { key: "KIMI_API_KEY", label: "API Key", placeholder: "sk-...", type: "password" },
      { key: "KIMI_MODEL", label: "模型名称", placeholder: "moonshot-v1-8k" },
    ],
    guide: {
      registerUrl: "https://platform.moonshot.cn",
      steps: [
        "1. 访问 platform.moonshot.cn 注册账号",
        "2. 进入控制台 →「API Key 管理」",
        "3. 点击「新建」创建 API Key",
        "4. 复制保存（以 sk- 开头）",
      ],
      freeQuota: "新用户赠送 15 元免费额度",
      faq: [
        { q: "选哪个模型？", a: "moonshot-v1-8k（快速）、moonshot-v1-32k（长文）、moonshot-v1-128k（超长上下文）。" },
      ],
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT 系列模型",
    apiEndpoint: "https://api.openai.com/v1",
    configKeys: [
      { key: "OPENAI_API_KEY", label: "API Key", placeholder: "sk-...", type: "password" },
      { key: "OPENAI_MODEL", label: "模型名称", placeholder: "gpt-4o" },
    ],
    guide: {
      registerUrl: "https://platform.openai.com",
      steps: [
        "1. 访问 platform.openai.com 注册账号（需要海外手机号）",
        "2. 进入「API Keys」页面",
        "3. 点击「Create new secret key」",
        "4. 复制保存（以 sk- 开头）",
      ],
      freeQuota: "新账号有少量免费额度，之后需充值",
      faq: [
        { q: "国内无法访问？", a: "需要科学上网，或使用 API 代理服务。" },
        { q: "选哪个模型？", a: "推荐 gpt-4o（性价比高）或 gpt-4o-mini（更便宜）。" },
      ],
    },
  },
];

export const SEARCH_PROVIDERS: SearchProvider[] = [
  {
    id: "tavily",
    name: "Tavily",
    description: "AI 搜索 API（推荐）",
    configKeys: [
      { key: "TAVILY_API_KEY", label: "API Key", placeholder: "tvly-...", type: "password" },
    ],
    guide: {
      registerUrl: "https://tavily.com",
      steps: ["1. 访问 tavily.com 注册", "2. 进入 Dashboard 获取 API Key"],
      freeQuota: "每月 1000 次免费搜索",
    },
  },
  {
    id: "serpapi",
    name: "SerpAPI",
    description: "Google 搜索 API",
    configKeys: [
      { key: "SERPAPI_API_KEY", label: "API Key", placeholder: "输入 API Key", type: "password" },
    ],
    guide: {
      registerUrl: "https://serpapi.com",
      steps: ["1. 访问 serpapi.com 注册", "2. 在 Dashboard 获取 API Key"],
      freeQuota: "每月 100 次免费搜索",
    },
  },
];
