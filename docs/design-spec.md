# 设计规范

> 本文档定义 Ink 项目的设计系统。面向文字工作者，以黑白为基调，追求极致简洁和阅读舒适。通透轻盈，Apple 官网式的内容优先。默认使用浅色主题，支持手动切换暗色。

---

## 1. 设计哲学

| 原则 | 说明 |
|------|------|
| 黑白为本 | 整个界面只用黑、白、灰，不引入彩色。内容本身就是视觉焦点 |
| 通透轻盈 | 接近纯白的背景、阴影代替边框、较大圆角，营造 Apple 官网式的内容优先感 |
| 护眼优先 | 不用纯黑（对比过强）。背景接近纯白，文字深灰，降低视觉疲劳 |
| 聚焦文字 | 界面元素尽量消隐，一切为阅读和写作让路。无边框、用阴影分层、少装饰 |
| 呼吸感 | 大量留白，宽松行高，较大的组件间距，舒适的阅读节奏 |
| 无障碍 | 对比度满足 WCAG AA，清晰焦点指示，尊重 `prefers-reduced-motion` |

---

## 2. 颜色系统

只用灰度。使用 OKLCH 色彩空间确保感知均匀。

### 2.1 浅色主题

```css
/* 页面背景 — 接近纯白，通透轻盈 */
--background:          oklch(0.99 0 0);
--foreground:          oklch(0.15 0.005 265);

/* 卡片/弹出层 — 纯白 */
--card:                oklch(1 0 0);
--card-foreground:     oklch(0.15 0.005 265);
--popover:             oklch(1 0 0);
--popover-foreground:  oklch(0.15 0.005 265);

/* 主色 — 深炭灰，微暖调，非纯黑 */
--primary:             oklch(0.27 0.005 265);
--primary-foreground:  oklch(0.98 0.002 90);

/* 次要色 — 更浅 */
--secondary:           oklch(0.965 0 0);
--secondary-foreground:oklch(0.30 0.005 265);

/* 弱化色 — 用于辅助文本 */
--muted:               oklch(0.965 0 0);
--muted-foreground:    oklch(0.50 0 0);

/* 强调色 — 悬停用的极浅灰 */
--accent:              oklch(0.955 0 0);
--accent-foreground:   oklch(0.18 0.005 265);

/* 危险色 — 暖琥珀橙，柔和醒目 */
--destructive:         oklch(0.63 0.14 52);

/* 边框 — 极淡，几乎消隐 */
--border:              oklch(0.93 0 0);
--input:               oklch(0.91 0 0);
--ring:                oklch(0.27 0.005 265);

/* 侧边栏 — 接近白色 */
--sidebar:             oklch(0.985 0 0);
--sidebar-foreground:  oklch(0.18 0.005 265);
--sidebar-primary:     oklch(0.27 0.005 265);
--sidebar-primary-foreground: oklch(0.975 0.002 90);
--sidebar-accent:      oklch(0.955 0 0);
--sidebar-accent-foreground: oklch(0.18 0.005 265);
--sidebar-border:      oklch(0.93 0 0);
--sidebar-ring:        oklch(0.27 0.005 265);
```

### 2.2 深色主题

```css
/* 背景 — 暖炭色，非纯黑 */
--background:          oklch(0.14 0.005 265);
--foreground:          oklch(0.88 0.002 90);

/* 卡片 */
--card:                oklch(0.17 0.005 265);
--card-foreground:     oklch(0.88 0.002 90);
--popover:             oklch(0.17 0.005 265);
--popover-foreground:  oklch(0.88 0.002 90);

/* 主色 — 就是白色 */
--primary:             oklch(0.88 0 0);
--primary-foreground:  oklch(0.14 0.005 265);

/* 次要色 */
--secondary:           oklch(0.22 0.005 265);
--secondary-foreground:oklch(0.85 0 0);

/* 弱化色 */
--muted:               oklch(0.22 0.005 265);
--muted-foreground:    oklch(0.55 0 0);

/* 强调色 */
--accent:              oklch(0.24 0.005 265);
--accent-foreground:   oklch(0.88 0.002 90);

/* 危险色 */
--destructive:         oklch(0.72 0.12 52);

/* 边框 */
--border:              oklch(0.26 0 0);
--input:               oklch(0.28 0 0);
--ring:                oklch(0.88 0 0);

/* 侧边栏 */
--sidebar:             oklch(0.16 0.005 265);
--sidebar-foreground:  oklch(0.88 0.002 90);
--sidebar-primary:     oklch(0.88 0 0);
--sidebar-primary-foreground: oklch(0.14 0.005 265);
--sidebar-accent:      oklch(0.24 0.005 265);
--sidebar-accent-foreground: oklch(0.88 0.002 90);
--sidebar-border:      oklch(0.26 0 0);
--sidebar-ring:        oklch(0.88 0 0);
```

### 2.3 阴影

阴影是主要的层级区分手段，替代边框。卡片默认使用 shadow-sm，hover 使用 shadow-md。

```css
--shadow-sm:    0 1px 2px oklch(0 0 0 / 4%);
--shadow-md:    0 2px 8px oklch(0 0 0 / 6%);
--shadow-lg:    0 8px 24px oklch(0 0 0 / 8%);
```

深色模式下阴影不可见，改用边框区分层级。

---

## 3. 排版系统

排版是整个设计的核心。为长时间阅读和写作优化。

### 3.1 字体

| 用途 | 字体 | CSS 变量 |
|------|------|---------|
| 正文/UI | Geist Sans (Variable) | `--font-geist-sans` |
| 代码/等宽 | Geist Mono (Variable) | `--font-geist-mono` |

加载方式：本地字体，`display: swap`。

### 3.2 字号

| Token | 尺寸 | 像素 | 用途 |
|-------|------|------|------|
| `text-xs` | 0.75rem | 12px | 时间戳、徽章 |
| `text-sm` | 0.875rem | 14px | 辅助文本、表单标签 |
| `text-base` | 1rem | 16px | UI 默认 |
| `text-lg` | 1.125rem | 18px | 正文阅读（文章） |
| `text-xl` | 1.25rem | 20px | 小标题 |
| `text-2xl` | 1.5rem | 24px | 段落标题 |
| `text-3xl` | 1.875rem | 30px | 页面标题 |
| `text-4xl` | 2.25rem | 36px | 大标题 |

### 3.3 行高

| 场景 | 行高 | 用途 |
|------|------|------|
| 紧凑 | 1.25 | 标题 |
| 常规 | 1.5 | UI 文本 |
| 阅读 | 1.75 | 文章正文（核心，宽松舒适） |
| 宽松 | 2.0 | 大字标题 |

### 3.4 字重

| 值 | 用途 |
|----|------|
| 400 | 正文 |
| 500 | 标签、导航项 |
| 600 | 标题 |

不使用 700 (bold)。整体偏轻，减少视觉压迫感。

### 3.5 文章排版 `.prose-article`

文章阅读是产品核心场景，排版必须优秀。

```
基础字号: 18px（比 UI 大一号，阅读更舒适）
行高: 1.75（宽松，长文不累）
最大宽度: 680px（每行 60-70 字符，最佳阅读宽度）
段间距: 1.5em
字色: foreground（深灰，非纯黑）
```

- 标题：semibold，标题间有充足的上边距（2em）区分章节
- 链接：下划线，颜色同正文，hover 时加深
- 引用块：左边框 2px，斜体，前景色弱化
- 代码块：等宽字体，极浅灰背景
- 列表：适当缩进，项间距 0.5em
- 图片：圆角 4px，居中，最大宽度 100%

---

## 4. 间距系统

### 4.1 基础比例

基于 4px 步进：4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### 4.2 语义化间距

| Token | 值 | 用途 |
|-------|-----|------|
| `--page-gutter` | 1.5rem (24px) | 页面两侧边距 |
| `--section-gap` | 3rem (48px) | 版块之间 |
| `--card-padding` | 1.5rem (24px) | 卡片内边距 |
| `--stack-gap` | 1rem (16px) | 垂直堆叠默认间距 |
| `--stack-gap-sm` | 0.5rem (8px) | 紧凑垂直间距 |
| `--inline-gap` | 0.5rem (8px) | 水平元素间距 |

### 4.3 容器宽度

| Token | 值 | 用途 |
|-------|-----|------|
| `--container-prose` | 680px | 文章阅读/编辑 |
| `--container-form` | 480px | 表单（登录、设置） |
| `--container-dashboard` | 1080px | 仪表盘 |

---

## 5. 圆角

较大圆角，现代感更强。

| Token | 值 |
|-------|----|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 10px |
| `--radius-xl` | 14px |

默认圆角 `--radius`: 10px。按钮、输入框、卡片统一使用。

---

## 6. 动画

克制。文字工具不需要花哨动画。

### 6.1 时长

| Token | 值 | 用途 |
|-------|----|------|
| `--duration-fast` | 100ms | hover 状态 |
| `--duration-normal` | 150ms | 展开/折叠 |
| `--duration-slow` | 250ms | 页面过渡 |

### 6.2 缓动

统一使用 `ease-out`：`cubic-bezier(0.16, 1, 0.3, 1)`

### 6.3 过渡

所有交互元素的默认过渡：

```css
transition: background-color 150ms ease-out, opacity 150ms ease-out;
```

不使用 transform 动画（scale、translate）。状态变化通过颜色和透明度表达。

### 6.4 减少动画

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0ms !important; }
}
```

---

## 7. 交互状态

所有交互通过灰度明暗变化表达，不使用彩色。

| 状态 | 表现 |
|------|------|
| 默认 | 正常前景/背景 |
| 悬停 | 背景轻微加深（accent 色） |
| 按下 | 背景再加深一级 |
| 焦点 | 2px 黑色（浅色模式）/白色（深色模式）焦点环 |
| 禁用 | opacity: 0.4 |
| 加载 | opacity 脉冲 (0.4 → 1 循环) |

---

## 8. 组件规范

### 8.1 Button

只有两个视觉层级，保持简洁。

| 变体 | 描述 |
|------|------|
| `default` | 黑底白字（浅色模式）/ 白底黑字（深色模式） |
| `outline` | 边框 + 透明背景，hover 加浅灰底 |
| `ghost` | 无边框无背景，hover 加浅灰底 |
| `destructive` | 仅用于删除确认，红色 |

尺寸：

| 尺寸 | 高度 |
|------|------|
| `sm` | 32px |
| `default` | 36px |
| `lg` | 40px |
| `icon` | 36×36px |
| `icon-sm` | 32×32px |

### 8.2 Input

- 高度 36px
- 1px 边框，颜色 `--input`
- 焦点时边框变为 `--ring`（黑/白）
- 无阴影，无圆角过大
- placeholder 颜色 `--muted-foreground`

### 8.3 Card

- 无边框，使用阴影分层（shadow-sm 为默认）
- 背景 `--card`
- 圆角 `--radius-xl` (14px)
- hover 时 shadow-md，transition 200ms
- 内边距 24px

### 8.4 Badge

| 变体 | 描述 |
|------|------|
| `default` | 黑底白字 |
| `secondary` | 浅灰底深灰字 |
| `outline` | 仅边框 |

小尺寸，pill 圆角。

### 8.5 Table

- 无外边框
- 行间 1px 分割线（`--border` 色）
- 行 hover 背景 `--accent`
- 表头字重 500，字号 text-sm

### 8.6 Dialog / AlertDialog

- 居中，max-width 480px
- 遮罩层 `oklch(0 0 0 / 40%)`（浅色模式）/ `oklch(0 0 0 / 60%)`（深色模式）
- 无花哨动画，简单 fade-in

### 8.7 Sidebar

- 宽度 220px
- 背景 `--sidebar`
- 导航项高度 36px
- 选中项背景 `--accent`，字重 500
- 无图标或极简图标（16px，stroke-width 1.5）

### 8.8 Toast (Sonner)

- 右下角弹出
- 1px 边框，白底（浅色）/ 深灰底（深色）
- 纯文字，无图标
- 3秒后自动消失

---

## 9. Markdown 编辑器

编辑器是产品的核心交互场景。

### 9.1 布局

左右分栏或单栏切换：
- 编辑模式：纯文本 Markdown 编辑，等宽字体
- 预览模式：渲染后的排版效果
- 分栏模式：左编辑右预览

### 9.2 编辑区样式

```
字体: Geist Mono（等宽）
字号: 15px
行高: 1.6
背景: --background
光标颜色: --foreground
选中背景: oklch(0 0 0 / 8%)（浅色）/ oklch(1 1 0 / 10%)（深色）
```

### 9.3 预览区样式

使用 `.prose-article` 排版（见排版系统 3.5 节）。

---

## 10. 封面图样式

Agent 生成的封面图视觉规范：

```
尺寸: 900 × 383px (2.35:1)
背景: 简单几何图案，灰度色系
  - 方案 A: 大面积纯色 + 细线几何网格
  - 方案 B: 渐变灰度色块拼接
  - 方案 C: 圆点/圆环散布图案
色调: 用户可选浅色/深色/彩色，选择后强制从对应主题池选取
文字层:
  - 半透明黑色遮罩 (40%)
  - 标题: Noto Sans SC, 28px, semibold, 白色
    - 支持自定义标题，留空则使用文章标题
  - 论点: Noto Sans SC, 16px, normal, 白色 80% 透明度
  - 署名: 可自定义（如 "Ink"）
  - 文字区域左对齐，左侧 60px padding
  - 封面标题可隐藏（cover_show_title 设置）
```

---

## 11. 速查表

| 类别 | 值 |
|------|-----|
| **主色** | 深炭灰 `oklch(0.27 0.005 265)` / 浅灰白 `oklch(0.88 0 0)` |
| **字体** | Geist Sans（UI）/ Geist Mono（代码/编辑器） |
| **文章字号** | 18px，行高 1.75 |
| **最大阅读宽度** | 680px |
| **默认圆角** | 10px |
| **卡片样式** | 无边框，shadow-sm，hover:shadow-md |
| **默认过渡** | 200ms ease-out |
| **间距基准** | 4px |
| **按钮高度** | 36px |
| **边框色** | `oklch(0.93 0 0)` 浅 / `oklch(0.26 0 0)` 深 |
| **彩色** | 仅 destructive (暖琥珀橙) 用于不可逆操作 |
