# OpenCode Chat — 多用户 AI 咨询平台

基于 [OpenCode SDK](https://github.com/opencode-ai/sdk) 的多用户 AI 对话服务。用户通过 IP 自动识别（无需登录），每个用户独立管理会话。

**架构**：React 19 + TypeScript + Vite（前端） / Express.js ESM（后端） / OpenCode SDK（AI 引擎）

---

## 快速启动

### 前置要求

- **Node.js** >= 18（推荐 20+）
- **npm** >= 9
- 确保本地已安装 **OpenCode CLI**（`opencode` 命令可用），服务启动时 SDK 会自动拉起 OpenCode 进程

### 1. 安装依赖

```bash
# 根目录依赖 (Express 服务端 + SDK)
npm install

# 前端依赖
cd client && npm install && cd ..
```

### 2. 配置

配置源文件 `server/config.json`，通过 `server/config.js` 读取，支持环境变量覆盖：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 服务端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | 运行环境（production 时使用 dist 目录） |
| `MODEL` | `deepseek/deepseek-chat` | AI 模型（来自 config.json） |

OpenCode 内部端口固定为 `4096`，绑定 `127.0.0.1`。

### 3. 构建前端（首次或更新后）

```bash
cd client && npm run build && cd ..
```

构建产物输出到根目录 `dist/`（`tsc -b` 类型检查 → `vite build`）。

> **开发模式**：也可以不构建，服务端会自动 fallback 到 `public/index.html`（Vanilla JS 版本），同时启动 Vite dev server 获得 HMR 体验。

### 4. 启动服务

```bash
# 开发模式（--watch 文件变动自动重启）
npm run dev

# 生产模式
npm start
```

服务启动后：

```
========================================
  AI 咨询平台已启动
  本机访问: http://localhost:3000
  环境: development
  静态目录: .../dist
  按 Ctrl+C 停止
========================================
```

### 5. 开发模式推荐工作流

```bash
# 终端 1：启动后端服务（--watch 自动重启）
npm run dev

# 终端 2：启动前端 dev server（HMR）
cd client && npm run dev
```

前端 Vite dev server 运行在 `http://localhost:5173`，已配置代理将 `/api` 请求转发到后端 `:3000`。

---

## 项目结构

```
opencode-chat/
├── package.json                 # 根 package — Express 服务入口 (ESM)
├── AGENTS.md                    # AI Agent 开发指引（内部文档）
├── server/                      # 后端 (Express.js + ESM)
│   ├── index.js                 # 服务入口：启动 OpenCode、创建 Express app、静态文件服务、优雅退出
│   ├── app.js                   # Express app 工厂：挂载中间件链和路由
│   ├── config.js                # 配置读取（config.json + 环境变量覆盖）
│   ├── config.json              # 配置源文件（模型、工具、Agent 选项、日志轮转等）
│   ├── middleware/
│   │   ├── clientIP.js          # 解析客户端真实 IP（x-forwarded-for → x-real-ip → socket.remoteAddress）
│   │   ├── requestLogger.js     # 请求日志（响应完成后记录方法/路径/状态码/耗时）
│   │   ├── rateLimiter.js       # 基于 IP 的速率限制（15 分钟 200 次），SSE 流路径不限制
│   │   ├── sessionGuard.js      # 会话所有权验证（阻止越权访问，记录阻断统计）
│   │   ├── validate.js          # 请求体字段校验（requireBody 工厂函数）
│   │   └── errorHandler.js      # 全局错误处理（记录堆栈、返回友好错误信息）
│   ├── routes/
│   │   ├── index.js             # 路由注册集中管理（挂载 8 组路由）
│   │   ├── sessions.js          # POST/GET /api/sessions + POST /:id/abort
│   │   ├── chat.js              # POST /api/chat (同步) + /api/chat/async (异步)
│   │   ├── messages.js          # GET /api/sessions/:id/messages — 消息历史
│   │   ├── feedback.js          # POST /api/sessions/:id/feedback — 满意度反馈
│   │   ├── events.js            # GET /api/events — SSE 事件流（实时推送 OpenCode 事件）
│   │   ├── stats.js             # GET /api/stats — 平台统计数据
│   │   ├── permission.js        # POST 权限响应/问题回复/问题跳过
│   │   └── agents.js            # GET /api/agents — 可用 AI Agent 列表
│   ├── services/
│   │   ├── opencode.js          # OpenCode SDK 客户端管理（createOpencode / 启动 / 获取）
│   │   ├── sessionService.js    # 会话 CRUD + 过期清理（7 天 TTL，每小时扫描）
│   │   ├── userService.js       # 访客管理（IP 识别 + 去重统计）
│   │   └── statsService.js      # 统计收集 + 定期持久化到 logs/_stats.json
│   ├── storage/
│   │   └── store.js             # 内存数据存储（Map + Set，进程重启丢失）
│   └── logger/
│       └── index.js             # 日志记录器（控制台彩色输出 + 文件，支持自动轮转压缩归档）
│
├── client/                      # 前端 (React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4)
│   ├── package.json
│   ├── vite.config.ts           # Vite 配置（react 插件、@/ alias、代理 /api → :3000，输出到 ../dist）
│   ├── tsconfig.json
│   ├── index.html               # SPA 入口 HTML（挂载 #root）
│   └── src/
│       ├── main.tsx             # React 入口：ErrorBoundary → ThemeProvider → ChatProvider → App
│       ├── App.tsx              # 根组件：组合 Sidebar + ChatArea 布局，事件处理编排
│       ├── api/                 # API 客户端层
│       │   ├── client.ts        # 通用 fetch 封装（自动 JSON 序列化、ApiError 处理）
│       │   ├── chat.ts          # 发送消息（同步 & 异步）+ 中断会话
│       │   ├── sessions.ts      # 会话 CRUD + 消息历史获取
│       │   ├── feedback.ts      # 提交满意度反馈
│       │   ├── agents.ts        # 获取可用 Agent 列表
│       │   └── permission.ts    # 权限响应 + 问题回复/跳过
│       ├── components/
│       │   ├── layout/          # 布局组件：Sidebar、ChatArea
│       │   ├── chat/            # 聊天核心组件
│       │   │   ├── AgentSelector.tsx    # AI Agent 选择页面（新对话首页）
│       │   │   ├── ChatHeader.tsx       # 顶部标题栏 + 菜单按钮
│       │   │   ├── ChatInput.tsx        # 输入框 + 发送/中断按钮
│       │   │   ├── EmptyState.tsx       # 空状态占位
│       │   │   ├── FeedbackRow.tsx      # 满意度反馈按钮行
│       │   │   ├── JsonView.tsx         # JSON 结构化数据展示
│       │   │   ├── MarkdownRenderer.tsx # 完整 Markdown 渲染（react-markdown + mermaid + 代码高亮）
│       │   │   ├── MessageBubble.tsx    # 消息气泡（用户/AI，含推理、工具调用、子会话导航）
│       │   │   ├── MessageList.tsx      # 消息列表（自动滚动、流式渲染）
│       │   │   ├── PartRenderer.tsx     # 消息部件渲染器（路由到各渲染组件）
│       │   │   ├── ReasoningBlock.tsx   # 推理过程折叠块
│       │   │   ├── ToolCallBlock.tsx    # 工具调用状态展示（Shell / Task / 其他工具）
│       │   │   └── TypingIndicator.tsx  # 打字中动画指示器
│       │   ├── sidebar/         # 侧边栏组件
│       │   │   ├── SidebarHeader.tsx    # 侧边栏标题 + 新建对话按钮
│       │   │   ├── SessionList.tsx      # 会话列表（含多会话导航栈）
│       │   │   └── SessionItem.tsx      # 单条会话条目
│       │   ├── common/          # 通用组件
│       │   │   ├── ErrorBanner.tsx      # 全局错误横幅提示
│       │   │   ├── ErrorBoundary.tsx    # React 错误边界
│       │   │   ├── PermissionDialog.tsx # AI 权限请求/问题对话框（多步表单）
│       │   │   ├── Skeleton.tsx         # 骨架屏加载占位
│       │   │   └── ThemeToggle.tsx      # 深色/浅色主题切换按钮
│       │   └── ui/             # shadcn/ui 基础组件（button、dialog 等）
│       ├── contexts/
│       │   ├── ChatContext.tsx   # 全局状态管理（多会话消息、流式、导航栈、权限）
│       │   └── ThemeContext.tsx  # 主题管理（深色/浅色，跟随系统 + localStorage 持久化）
│       ├── hooks/
│       │   ├── useEvents.ts     # SSE 事件订阅（自动重连 + 指数退避，路由所有 OpenCode 事件类型）
│       │   ├── useFeedback.ts   # 反馈状态管理（去重）
│       │   └── useMediaQuery.ts # 响应式断点检测
│       ├── lib/
│       │   └── utils.ts         # cn() 工具函数（clsx + tailwind-merge）
│       ├── types/
│       │   ├── message.ts       # 完整消息类型定义（ChatMessage、ChatPart 及 10+ 子类型）
│       │   ├── session.ts       # 会话类型定义（SessionListItem、SessionCreateResult）
│       │   └── api.ts           # ApiError 类
│       ├── utils/
│       │   ├── escapeHtml.ts    # HTML 转义
│       │   ├── formatDate.ts    # 日期格式化
│       │   └── renderMarkdown.ts# 简易 Markdown 渲染器（零三方依赖，仅 Vanilla JS fallback 使用）
│       └── styles/
│           └── global.css       # 全局样式入口 — Tailwind CSS v4 + CSS 变量 + 响应式
│
├── public/
│   └── index.html               # Vanilla JS 版 SPA（零构建即可运行，fallback 兜底）
│
├── dist/                        # 前端构建产物（Vite build 输出，gitignore）
├── logs/                        # 运行时日志（gitignore，自动轮转）
│   ├── server.log               # 服务日志（INFO/WARN/ERROR/ACCESS）
│   ├── server-YYYYMMDD-HHmmss.log  # 归档日志文件
│   └── _stats.json              # 统计数据快照
├── node_modules/                # 依赖
└── .gitignore
```

---

## 架构说明

### 数据流

```
用户 → 浏览器 (React SPA / Vanilla JS)
         ↓ HTTP (POST /api/chat) / SSE (GET /api/events)
    Express 服务器 (端口 3000)
         ↓
    OpenCode SDK (@opencode-ai/sdk/v2)
         ↓
    OpenCode AI 引擎 (端口 4096, 本地进程, 绑定 127.0.0.1)
```

### 请求模式

**同步模式**：`POST /api/chat` — 等待 AI 完整响应后一次性返回，适合简单场景。自动记录模型使用、工具调用等日志。

**异步模式**：`POST /api/chat/async` — 立即返回，AI 回复通过 SSE (`/api/events`) 实时推送。支持完整事件流：
- 消息部件（`message.part.*`）：文本增量、工具调用状态、推理过程、代码片段
- 会话导航事件（`session.next.*`）：工具调用、Shell 执行、推理过程、步骤完成
- 权限和问题事件（`permission.asked`、`question.asked`）：AI 请求用户授权或提问
- 会话状态变更（`session.status`、`session.idle`、`session.error`）

### 用户与会话

- **用户识别**：基于 IP（`x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`），无需登录
- **会话隔离**：`sessionGuard` 中间件验证每个请求的会话归属，阻止越权访问并记录阻断统计
- **会话过期**：7 天未活跃自动清理（每小时检查一次）
- **数据存储**：进程内存（`Map`），重启后丢失；统计数据会异步写入 `logs/_stats.json`
- **子会话**：AI Agent 可通过 `task` 工具创建子会话，前端基于 SSE 事件自动维护导航栈（`navigateToSession` / `navigateBack` / `navigateToParent`）

### 中间件链

```
express.json()
  → clientIP          (注入 req.clientIP，基于请求头/ socket 地址)
  → requestLogger     (记录访问日志，含方法/路径/状态码/耗时/IP)
  → rateLimiter       (/api 路径限流 200次/15分钟/IP；SSE 流路径不限制)
  → routes            (8 组路由，权限校验由路由内 sessionGuard 和 validate 负责)
  → errorHandler      (全局错误处理，记录堆栈 + 返回 JSON 错误)
```

| 中间件 | 作用范围 | 说明 |
|--------|----------|------|
| `express.json()` | 全局 | 解析 JSON 请求体 |
| `clientIP` | 全局 | 注入 `req.clientIP` |
| `requestLogger` | 全局 | 响应完成后记录访问日志 |
| `rateLimiter` | `/api` 路径 | 200 次/15 分钟/IP，SSE 流不限制 |
| `routes` | `/api/*` | 路由处理，内部使用 `sessionGuard` 做会话校验 |

### 前端状态管理

使用 React Context 分两层管理全局状态：

**ThemeContext**：深色/浅色主题切换，自动跟随系统偏好，用户选择持久化到 `localStorage`。

**ChatContext**：核心应用状态，包括：
- 会话列表（`sessions`）及加载状态
- 多会话消息存储（`allMessages: Map<sessionId, ChatMessage[]>`）
- 子会话导航栈（`navigationStack`，支持返回父会话）
- 流式渲染状态（`isStreaming`）
- 输入框状态（`inputValue`）
- 侧边栏状态（`sidebarOpen`）
- 全局错误（`globalError`）
- 感知模块/权限对话框（`PermissionDialog`）
- Agent 选择（`agents`、`selectedAgent`）

SSE 事件通过 `useEvents` hook 订阅，自动处理重连和指数退避（初始 1s，最大 30s），支持 20+ 种事件类型的路由分发。

### 核心前端库

| 库 | 用途 |
|------|--------|
| `react-markdown` + `remark-gfm` + `rehype-highlight` | Markdown 渲染 + GFM 表格 + 代码高亮 |
| `mermaid` | 流程图/时序图/类图等图表渲染 |
| `framer-motion` | 消息列表入场动画 |
| `lucide-react` | 图标库 |
| `radix-ui` / `@base-ui/react` | 无障碍 UI 基元（Dialog 等） |
| `@fontsource-variable/geist` | Geist 可变字体 |
| `tailwindcss` v4 + `@tailwindcss/vite` | 原子化 CSS 框架 |
| `clsx` + `tailwind-merge` | 条件类名合并 |

### 两个前端版本

| 版本 | 位置 | 技术栈 | 特点 |
|------|------|--------|------|
| **React** | `client/` | React 19 + TypeScript + Vite + Tailwind CSS v4 | HMR 热更新，完整组件化，支持所有功能 |
| **Vanilla JS** | `public/index.html` | 原生 JS + CSS | 零构建即可运行，纯同步模式，兜底 fallback |

启动时自动检测 `dist/index.html` 是否存在，优先使用构建产物，否则 fallback 到 `public/index.html`。

---

## API 路由一览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 获取当前用户的会话列表 |
| `POST` | `/api/sessions` | 创建新会话（可选指定 agent） |
| `POST` | `/api/sessions/:id/abort` | 中断正在运行的会话 |
| `GET` | `/api/sessions/:id/messages` | 获取会话消息历史 |
| `POST` | `/api/chat` | 同步发送消息（等待完整回复） |
| `POST` | `/api/chat/async` | 异步发送消息（通过 SSE 接收回复） |
| `POST` | `/api/sessions/:id/feedback` | 提交满意度反馈 |
| `GET` | `/api/stats` | 获取平台统计数据 |
| `GET` | `/api/events` | SSE 事件流（实时推送 OpenCode 事件） |
| `POST` | `/api/permission/respond` | 响应权限请求 |
| `POST` | `/api/permission/question/reply` | 回复 AI 提问 |
| `POST` | `/api/permission/question/reject` | 跳过/拒绝 AI 提问 |
| `GET` | `/api/agents` | 获取可用 AI Agent 选项列表 |

### 配置中的 Agent 选项

`server/config.json` 的 `agentOptions` 数组定义了可选的 AI Agent 模式：

| 标签 | Agent | 用途 |
|------|-------|------|
| 代码构建 | `build` | 编写、修改和调试代码，支持完整工具链 |
| 架构规划 | `plan` | 设计系统架构和技术方案 |
| 代码探索 | `explore` | 快速了解和分析现有代码库 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| **前端框架** | React 19 |
| **语言** | TypeScript 5.8 |
| **构建工具** | Vite 6 |
| **CSS** | Tailwind CSS v4 + CSS 变量 + CSS Modules |
| **后端** | Express.js 4.21 (ESM) |
| **AI SDK** | `@opencode-ai/sdk` ^1.14 |
| **运行时** | Node.js 18+（推荐 20+） |
| **日志** | 自定义文件日志（控制台 + 文件，支持自动轮转归档） |
| **数据存储** | 进程内存（Map），重启丢失；统计快照写入日志目录 |
| **无数据库** | 纯内存存储，无需数据库依赖 |
