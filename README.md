# OpenCode Chat — 多用户 AI 咨询平台

基于 [OpenCode SDK](https://github.com/opencode-ai/sdk) 的多用户 AI 对话服务。用户通过 IP 自动识别（无需登录），每个用户独立管理会话。

**技术栈**：React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4（前端）/ Express.js 4.21 ESM + OpenCode SDK（后端）

---

## 快速启动

```bash
# 1. 安装依赖（两端都要装）
npm install
cd client && npm install && cd ..

# 2. 构建前端（首次或更新后）
cd client && npm run build && cd ..

# 3. 启动服务
npm run dev        # 开发模式（--watch 自动重启）
# npm start       # 生产模式
```

开发时另开终端启动前端 HMR：
```bash
cd client && npm run dev   # Vite dev server @ :5173，代理 /api → :3000
```

**前置条件**：Node.js >= 18（推荐 20+），本地已安装 OpenCode CLI（`opencode` 命令可用）。SDK 启动时自动拉起 OpenCode 进程（`:4096`，绑定 `127.0.0.1`）。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 服务端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | 运行环境（production 使用 `dist/`） |
| `MODEL` | `deepseek/deepseek-chat` | AI 模型 |

---

## 项目结构

```
opencode-chat/
├── package.json              # 根 package — Express ESM 服务入口
├── AGENTS.md                 # AI Agent 开发指引
├── server/                   # 后端 (Express.js + ESM)
│   ├── index.js              # 服务入口：启动 OpenCode、Express、优雅退出
│   ├── app.js                # Express app 工厂（中间件链）
│   ├── config.js             # 配置读取（config.json + 环境变量覆盖）
│   ├── config.json           # 配置源文件
│   ├── routes/               # 9 组 API 路由
│   ├── services/             # 业务服务层（5 个）
│   ├── middleware/           # 6 个中间件
│   ├── storage/store.js      # 内存数据存储（Map + Set）
│   └── logger/index.js       # 彩色控制台 + 文件轮转日志
│
├── client/                   # 前端 (React 19 + TypeScript + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html            # SPA 入口
│   └── src/
│       ├── main.tsx          # React 入口
│       ├── App.tsx           # 根组件
│       ├── api/              # 6 个 API 客户端文件
│       ├── components/       # 组件
│       │   ├── layout/       # Sidebar、ChatArea
│       │   ├── chat/         # 11 个聊天核心组件 + 5 个 CSS Modules
│       │   ├── sidebar/      # SidebarHeader、SessionList、SessionItem
│       │   ├── common/       # ErrorBanner、ErrorBoundary、PermissionDialog 等
│       │   └── ui/           # shadcn/ui 基元：button、dialog
│       ├── contexts/         # ChatContext + ThemeContext
│       ├── hooks/            # useEvents、useFeedback、useMediaQuery
│       ├── types/            # message、session、api 类型定义
│       ├── utils/            # escapeHtml、formatDate
│       ├── lib/utils.ts      # cn() 工具函数
│       └── styles/global.css # Tailwind CSS v4 + CSS 变量入口
│
├── public/
│   └── index.html            # Vanilla JS fallback（零构建即可运行）
├── dist/                     # 前端构建产物（gitignore）
└── logs/                     # 运行时日志（gitignore，自动轮转）
```

---

## 架构说明

### 数据流

```
用户 → 浏览器 (React SPA / Vanilla JS)
         ↓ HTTP / SSE
    Express 服务器 (:3000)
         ↓
    OpenCode SDK (@opencode-ai/sdk/v2)
         ↓
    OpenCode AI 引擎 (:4096, 127.0.0.1, 本地进程)
```

### 请求模式

- **同步** `POST /api/chat` — 等待完整回复后一次性返回
- **异步** `POST /api/chat/async` — 立即返回，AI 回复通过 SSE (`/api/events`) 实时推送

SSE 事件类型包括：`message.part.*`（文本增量、工具调用、推理）、`session.*`（状态变更、创建/删除）、`permission.asked`、`question.asked`、`session.next.*`（子会话导航）等 20+ 种。

### 用户与会话

- **识别**：基于 IP（`x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`），无需登录
- **隔离**：`sessionGuard` 中间件验证会话归属，阻止越权访问
- **过期**：7 天未活跃自动清理（每小时检查一次）
- **存储**：进程内存（`Map`），重启丢失；统计异步写入 `logs/_stats.json`
- **子会话**：AI Agent 通过 `task` 工具创建子会话，前端基于 SSE 维护导航栈

### 中间件链

```
express.json() → clientIP → requestLogger → rateLimiter(/api) → routes → errorHandler
```

| 中间件 | 作用范围 | 说明 |
|--------|----------|------|
| `express.json()` | 全局 | 解析 JSON 请求体 |
| `clientIP` | 全局 | 注入 `req.clientIP` |
| `requestLogger` | 全局 | 记录访问日志 |
| `rateLimiter` | `/api` 路径 | 200 次/15 分钟/IP，SSE 流不限制 |
| `sessionGuard` | 路由内 | 会话归属校验 |
| `validate` | 路由内 | 请求字段校验 |

### 状态管理（React Context）

**ThemeContext**：深色/浅色主题，跟随系统 + localStorage 持久化

**ChatContext**（~790 行）：会话列表、多会话消息 Map、子会话导航栈、流式状态、输入状态、侧边栏、全局错误、权限对话框、Agent 选择。SSE 事件通过 `useEvents` hook 订阅（自动重连 + 指数退避 1s→30s）。

---

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 用户会话列表 |
| `POST` | `/api/sessions` | 创建会话 |
| `POST` | `/api/sessions/:id/abort` | 中断会话 |
| `GET` | `/api/sessions/:id/messages` | 消息历史 |
| `POST` | `/api/sessions/:id/feedback` | 满意度反馈 |
| `POST` | `/api/chat` | 同步发送 |
| `POST` | `/api/chat/async` | 异步发送 |
| `GET` | `/api/events` | SSE 事件流 |
| `GET` | `/api/stats` | 平台统计 |
| `POST` | `/api/permission/respond` | 权限响应 |
| `POST` | `/api/permission/question/reply` | 回复 AI 提问 |
| `POST` | `/api/permission/question/reject` | 跳过提问 |
| `GET` | `/api/agents` | Agent 列表 |

### Agent 选项（`server/config.json`）

| 标签 | Agent | 用途 |
|------|-------|------|
| 代码构建 | `build` | 编写、修改和调试代码 |
| 架构规划 | `plan` | 设计系统架构和技术方案 |
| 代码探索 | `explore` | 快速了解和分析代码库 |

---

## 核心前端库

| 库 | 用途 |
|------|--------|
| `react-markdown` + `remark-gfm` + `rehype-highlight` | Markdown + GFM + 代码高亮 |
| `mermaid` | 图表渲染 |
| `framer-motion` | 消息入场动画 |
| `lucide-react` | 图标库 |
| `@base-ui/react` | 无障碍 UI 基元 |
| `@fontsource-variable/geist` | Geist 可变字体 |
| `tailwindcss` v4 | 原子化 CSS |
| `clsx` + `tailwind-merge` | 条件类名合并 |

---

## 两个前端版本

| 版本 | 位置 | 技术栈 | 触发条件 |
|------|------|--------|----------|
| **React SPA** | `dist/index.html` | React + TypeScript + Vite | `dist/index.html` 存在时优先使用 |
| **Vanilla JS** | `public/index.html` | 原生 JS + CSS | 无构建产物时 fallback 兜底 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端框架 | React 19 |
| 语言 | TypeScript 5.8 |
| 构建工具 | Vite 6 |
| CSS | Tailwind CSS v4 + CSS Modules |
| 后端 | Express.js 4.21 (ESM) |
| AI SDK | `@opencode-ai/sdk` ^1.14 |
| 日志 | 彩色控制台 + 文件轮转归档 |
| 数据存储 | 进程内存（Map），统计快照写文件 |
| 无数据库 | 纯内存，无需外部依赖 |
