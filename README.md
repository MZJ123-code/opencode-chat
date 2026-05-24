# OpenCode Chat

> 零认证、零数据库、双前端引擎的 OpenCode AI 对话平台。IP 即身份，打开浏览器就能用。

---

## 特色

| | 特性 | 说明 |
|---|---|---|
| 🔑 | **零认证多用户** | 无需注册登录，IP 自动识别，团队内直接使用 |
| 🏗️ | **双前端引擎** | React SPA（全功能）+ Vanilla JS（零构建兜底），任选 |
| ⚡ | **SSE 实时流** | 事件环形缓冲区，断连回放，不丢消息 |
| 🔄 | **AI 子会话导航** | Agent 可创建子任务，前端维护完整导航栈（进入/返回/回根） |
| 💬 | **AI 权限问答** | Agent 能主动请求权限、发起多步表单问答 |
| 🗄️ | **零数据库** | 纯内存存储，`npm install && npm start` 即用 |
| 🤖 | **多 Agent 模式** | 代码构建 / 架构规划 / 代码探索，按需切换 |
| 🛡️ | **生产就绪** | IP 隔离+限流、会话 TTL 清理、日志轮转归档 |

---

## 快速启动

> **前置条件**：Node.js >= 18，本地已安装 OpenCode CLI（`opencode` 命令可用）

> **前置条件**：Bun，本地已安装 OpenCode CLI（`opencode` 命令可用）

### 后端

```bash
# 安装依赖
bun install

# 开发模式（--watch 自动重启）
bun run dev

# 生产模式
bun start
```

### 前端

```bash
# 安装依赖
cd client && bun install && cd ..

# 开发模式（Vite HMR @ :5173）
cd client && bun run dev

# 生产构建（输出到 dist/）
cd client && bun run build && cd ..
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | 运行环境 |
| `MODEL` | `deepseek/deepseek-chat` | AI 模型 |

---

## 架构

```
用户 → 浏览器 (React SPA 或 Vanilla JS)
         ↓ HTTP/SSE
    Express 服务器 (:3000)
         ↓
    OpenCode SDK (@opencode-ai/sdk/v2)
         ↓
    OpenCode AI 引擎 (:4096, 127.0.0.1)
```

### 请求模式

- **同步** `POST /api/chat` — 等待完整回复后返回，适合简单查询
- **异步** `POST /api/chat/async` — 立即返回，AI 回复通过 SSE 实时推送。支持 20+ 事件类型：
  - `message.part.*` — 文本增量、工具调用、推理过程
  - `session.*` — 状态变更、创建/删除
  - `session.next.*` — 子会话导航
  - `permission.asked` / `question.asked` — 权限和问答

### 用户与会话

- **识别**：`x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`，无需登录
- **隔离**：`sessionGuard` 中间件验证会话归属
- **过期**：7 天未活跃自动清理（每小时检查）
- **存储**：进程内存（`Map`），重启丢失；统计快照异步写入 `logs/_stats.json`
- **子会话**：AI `task` 工具创建子会话，SSE 事件自动维护导航栈

### 中间件链

```
express.json() → clientIP → requestLogger → rateLimiter(/api) → routes → errorHandler
```

---

## 项目结构

```
opencode-chat/
├── server/                     # Express ESM 后端
│   ├── index.js / app.js       # 入口 + Express 工厂
│   ├── config.js / config.json # 配置
│   ├── routes/                 # 9 组 API 路由
│   ├── services/               # OpenCode SDK、会话、用户、统计、事件缓冲
│   ├── middleware/             # IP 解析、限流、会话守卫、日志、校验、错误处理
│   ├── storage/store.js        # 内存数据存储（Map + Set）
│   └── logger/                 # 彩色控制台 + 文件轮转日志
│
├── client/                     # React 19 + TypeScript + Vite 6 前端
│   └── src/
│       ├── api/                # API 客户端（按资源拆分）
│       ├── components/         # layout/ chat/ sidebar/ common/ ui/
│       ├── contexts/           # ChatContext + ThemeContext
│       ├── hooks/              # useEvents（SSE 重连），useFeedback，useMediaQuery
│       ├── types/              # message、session、api 类型定义
│       └── styles/global.css   # Tailwind CSS v4 入口
│
├── public/index.html           # Vanilla JS 版（零构建 fallback）
├── dist/                       # 构建产物（gitignore）
└── logs/                       # 运行时日志（gitignore）
```

---

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 会话列表 |
| `POST` | `/api/sessions` | 创建会话 |
| `POST` | `/api/sessions/:id/abort` | 中断会话 |
| `GET` | `/api/sessions/:id/messages` | 消息历史 |
| `POST` | `/api/sessions/:id/feedback` | 满意度反馈 |
| `POST` | `/api/chat` | 同步发送 |
| `POST` | `/api/chat/async` | 异步发送（SSE 接收回复） |
| `GET` | `/api/events` | SSE 事件流 |
| `GET` | `/api/stats` | 平台统计 |
| `POST` | `/api/permission/respond` | 权限响应 |
| `POST` | `/api/permission/question/reply` | 回复 AI 提问 |
| `POST` | `/api/permission/question/reject` | 跳过提问 |
| `GET` | `/api/agents` | Agent 列表 |

### Agent 选项

| 标签 | Agent | 用途 |
|------|-------|------|
| 代码构建 | `build` | 编写、修改和调试代码 |
| 架构规划 | `plan` | 架构设计和技术方案 |
| 代码探索 | `explore` | 快速分析代码库 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端框架 | React 19 |
| 构建工具 | Vite 6 |
| CSS | Tailwind CSS v4 + CSS Modules |
| 后端 | Express.js 4.21 (ESM) |
| AI SDK | `@opencode-ai/sdk` ^1.14 |
| 日志 | 控制台 + 文件轮转 |
| 存储 | 进程内存（Map），零数据库 |
| 图表 | mermaid + react-markdown + highlight.js |
