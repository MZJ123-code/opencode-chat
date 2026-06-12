# 20. CSS Modules 与 Tailwind 混用

> **严重度**：🟡 关注
> **涉及文件**：多个 `.module.css` 文件
> **类型**：前端

## 问题描述

项目中同时使用两种 CSS 方案：

```
Tailwind CSS v4（主导方案）
├── global.css          — 全局样式、主题变量、动画
├── markdown-overrides.css — Markdown 样式覆盖
└── 组件中的 className={
   ...} 

CSS Modules（4 个组件）
├── MessageBubble.module.css
├── MessageList.module.css
├── PartRenderer.module.css
└── ToolCallBlock.module.css
```

### 问题

1. **两种心智模型**：开发者需要在 Tailwind utility class 和 CSS Module 的 class 命名之间切换
2. **主题变量使用不一致**：Tailwind 用 `text-[var(--text)]`，CSS Modules 用 `var(--text)`
3. **重构困难**：需要了解两套方案的边界，移除或替换其中一套时风险高
4. **CSS Modules 的文件分散**：`.module.css` 文件和组件文件分散在不同目录

## 改进方向

```tsx
// 统一到 Tailwind（推荐）
<div className="rounded-xl p-3 bg-[var(--chat-bg)] text-[var(--text)]">
```

或者统一到 CSS Modules（适合更复杂的样式逻辑）。避免两者混用。
