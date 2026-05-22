# OpenCode Chat — 多用户 AI 咨询平台

基于 [OpenCode SDK](https://github.com/opencode-ai/sdk) 的多用户 AI 对话服务。用户通过 IP 自动识别（无需登录），每个用户独立管理会话。

**架构**：React 19 + Vite（前端） / Express.js（后端） / OpenCode SDK（AI 引擎）

---

## 快速启动

### 前置要求

- **Node.js** >= 18（推荐 20+）
- **npm** >= 9
- 确保本地已安装 **OpenCode CLI**（`opencode` 命令可用），服务启动时 SDK 会自动拉起 OpenCode 进程

### 1. 安装依赖

```bash
# 根目录依赖 (Express 服务端)
npm install

# 前端依赖
cd client && npm install && cd ..
```

### 2. 配置

所有配置项在 `server/config.js` 中，可通过环境变量覆盖：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 服务端口 |
| `NODE_ENV` | `development` | 运行环境（production 时使用 dist 目录） |

OpenCode 内部端口固定为 `4096`，绑定 `127.0.0.1`。

### 3. 构建前端（首次或更新后）

```bash
cd client && npm run build && cd ..
```

构建产物输出到根目录 `dist/`。

> **开发模式**：也可以不构建，服务端会自动 fallback 到 `public/index.html`（Vanilla JS 版本），同时启动 Vite dev server 获得 HMR 体验。

### 4. 启动服务

```bash
# 开发模式（文件变动自动重启）
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
# 终端 1：启动后端服务（自动重启）
npm run dev

# 终端 2：启动前端 dev server（HMR）
cd client && npm run dev
```

前端 Vite dev server 运行在 `http://localhost:5173`，已配置代理将 `/api` 请求转发到后端 `:3000`。

---

## 项目结构

```
opencode-chat/
├── package.json                 # 根 package — Express 服务入口
├── server/                      # 后端 (Express.js + ESM)
│   ├── index.js                 # 服务入口：启动 OpenCode、创建 Express app、静态文件服务
│   ├── app.js                   # Express app 工厂：挂载中间件和路由
│   ├── config.js                # 配置常量
│   ├── middleware/
│   │   ├── clientIP.js          # 解析客户端真实 IP（x-forwarded-for / x-real-ip）
│   │   ├── requestLogger.js     # 请求日志（响应完成后记录）
│   │   ├── rateLimiter.js       # 基于 IP 的速率限制（15 分钟 100 次）
│   │   ├── sessionGuard.js      # 会话所有权验证（阻止越权访问）
│   │   ├── validate.js          # 请求体字段校验
│   │   └── errorHandler.js      # 全局错误处理
│   ├── routes/
│   │   ├── index.js             # 路由注册集中管理
│   │   ├── sessions.js          # POST/GET /api/sessions — 创建/列出会话
│   │   ├── chat.js              # POST /api/chat (同步) + /api/chat/async (异步)
│   │   ├── messages.js          # GET /api/sessions/:id/messages — 消息历史
│   │   ├── feedback.js          # POST /api/sessions/:id/feedback — 满意度反馈
│   │   ├── events.js            # GET /api/events — SSE 事件流（实时推送）
│   │   └── stats.js             # GET /api/stats — 统计数据
│   ├── services/
│   │   ├── opencode.js          # OpenCode SDK 客户端管理（启动/获取）
│   │   ├── sessionService.js    # 会话 CRUD + 过期清理（7天 TTL）
│   │   ├── userService.js       # 访客管理（IP 识别）
│   │   └── statsService.js      # 统计收集 + 持久化到 logs/_stats.json
│   ├── storage/
│   │   └── store.js             # 内存数据存储（Map + Set）
│   └── logger/
│       └── index.js             # 日志记录器（控制台 + 文件，支持自动轮转）
│
├── client/                      # 前端 (React 19 + TypeScript + Vite)
│   ├── package.json
│   ├── vite.config.ts           # Vite 配置（代理 /api → :3000，输出到 ../dist）
│   ├── tsconfig.json
│   ├── index.html               # SPA 入口 HTML
│   └── src/
│       ├── main.tsx             # React 入口：渲染 App + 包裹 ErrorBoundary + ChatProvider
│       ├── App.tsx              # 根组件：组合 Sidebar + ChatArea 布局
│       ├── api/                 # API 客户端层
│       │   ├── client.ts        # 通用 fetch 封装（自动 JSON 序列化、错误处理）
│       │   ├── chat.ts          # 发送消息（同步 & 异步）
│       │   ├── sessions.ts      # 会话 CRUD
│       │   └── feedback.ts      # 提交反馈
│       ├── components/
│       │   ├── layout/          # 布局组件：Sidebar、ChatArea
│       │   ├── chat/            # 聊天核心组件：MessageList、ChatInput、PartRenderer、
│       │   │                    #   ToolCallBlock、ReasoningBlock、FeedbackRow、TypingIndicator
│       │   ├── sidebar/         # 侧边栏组件：SidebarHeader、SessionList、SessionItem
│       │   └── common/          # 通用组件：ErrorBanner、ErrorBoundary、Skeleton
│       ├── contexts/
│       │   └── ChatContext.tsx   # 全局状态管理（会话、消息、流式状态、输入）
│       ├── hooks/
│       │   ├── useEvents.ts     # SSE 事件订阅（自动重连 + 指数退避）
│       │   ├── useFeedback.ts   # 反馈状态管理
│       │   └── useMediaQuery.ts # 响应式断点检测
│       ├── types/
│       │   ├── message.ts       # 消息类型定义（ChatMessage、ChatPart 及其子类型）
│       │   ├── session.ts       # 会话类型定义
│       │   └── api.ts           # ApiError 类
│       ├── utils/
│       │   ├── escapeHtml.ts    # HTML 转义
│       │   ├── formatDate.ts    # 日期格式化
│       │   └── renderMarkdown.ts# 简易 Markdown 渲染器（无三方依赖）
│       └── styles/
│           └── global.css       # 全局样式 + CSS 变量 + 响应式
│
├── public/
│   └── index.html               # Vanilla JS 版 SPA（fallback，无需构建即可运行）
│
├── dist/                        # 前端构建产物（Vite build 输出）
├── logs/                        # 运行时日志（自动轮转，保留 5 个备份）
│   ├── server.log               # 服务日志
│   ├── access.log               # 访问日志
│   └── _stats.json              # 统计数据快照
└── node_modules/
```

---

## 架构说明

### 数据流

```
用户 → 浏览器 (React SPA / Vanilla JS)
         ↓ HTTP / SSE
    Express 服务器 (端口 3000)
         ↓
    OpenCode SDK (@opencode-ai/sdk)
         ↓
    OpenCode AI 引擎 (端口 4096, 本地进程)
```

### 请求模式

**同步模式**：`POST /api/chat` — 等待 AI 完整响应后一次性返回，适合简单场景。

**异步模式**：`POST /api/chat/async` — 立即返回，AI 回复通过 SSE (`/api/events`) 实时推送。支持：
- 文本增量（`message.part.delta`）
- 推理过程（`session.next.reasoning.*`）
- 工具调用（`session.next.tool.*`）
- Shell 执行（`session.next.shell.*`）
- 会话状态变更（`session.status`）

### 用户与会话

- **用户识别**：基于 IP（`x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`），无需登录
- **会话隔离**：`sessionGuard` 中间件验证每个请求的会话归属
- **会话过期**：7 天未活跃自动清理（每小时检查一次）
- **数据存储**：进程内存（`Map`），重启后丢失；统计数据会定期写入 `logs/_stats.json`

### 中间件链

```
express.json()
  → clientIP          (解析用户 IP)
  → requestLogger     (记录访问日志)
  → rateLimiter       (/api 限流 100次/15分钟/IP)
  → routes
  → errorHandler      (全局错误处理)
```

### 前端状态管理

使用 React Context (`ChatContext`) 实现全局状态，包括：
- 会话列表（`sessions`）
- 当前会话消息（`messages`）
- 流式渲染状态（`isStreaming`）
- 输入框状态（`inputValue`）
- 侧边栏状态（`sidebarOpen`）
- 全局错误（`globalError`）

SSE 事件通过 `useEvents` hook 订阅，自动处理重连和指数退避。

### 两个前端版本

| 版本 | 位置 | 技术栈 | 特点 |
|------|------|--------|------|
| **React** | `client/` | React 19 + TypeScript + Vite + CSS Modules | 开发模式有 HMR，组件化架构 |
| **Vanilla JS** | `public/index.html` | 原生 JS + CSS | 零构建即可运行，fallback 兜底 |

启动时自动检测 `dist/index.html` 是否存在，优先使用构建产物，否则 fallback 到 `public/index.html`。

---

## API 路由一览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 获取当前用户的会话列表 |
| `POST` | `/api/sessions` | 创建新会话 |
| `GET` | `/api/sessions/:id/messages` | 获取会话消息历史 |
| `POST` | `/api/chat` | 同步发送消息（等待完整回复） |
| `POST` | `/api/chat/async` | 异步发送消息（通过 SSE 接收回复） |
| `POST` | `/api/sessions/:id/feedback` | 提交满意度反馈 |
| `GET` | `/api/stats` | 获取平台统计 |
| `GET` | `/api/events` | SSE 事件流（实时推送） |

---

## 技术栈

| 层 | 技术 |
|------|------|
| **前端框架** | React 19 |
| **语言** | TypeScript 5.8 |
| **构建工具** | Vite 6 |
| **后端** | Express.js 4.21 (ESM) |
| **AI SDK** | `@opencode-ai/sdk` ^1.14 |
| **样式方案** | CSS Variables + CSS Modules |
| **运行时** | Node.js 18+ |
| **日志** | 自定义文件日志（支持自动轮转） |
| **数据存储** | 进程内存（Map） |
