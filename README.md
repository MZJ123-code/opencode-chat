# OpenCode Chat

> 零认证、IP 即身份、SQLite 统计分析 — 开箱即用的 AI 对话平台。

---

## 特色

| | 特性 | 说明 |
|---|---|---|
| 🔑 | **零认证多用户** | 无需注册登录，IP 自动识别，团队内直接使用 |
| 🏗️ | **双前端引擎** | React SPA（全功能）+ Vanilla JS（零构建兜底），任选 |
| ⚡ | **SSE 实时流** | 事件环形缓冲区，断连回放，不丢消息 |
| 🔄 | **AI 子会话导航** | Agent 可创建子任务，前端维护完整导航栈 |
| 💬 | **AI 权限问答** | Agent 能主动请求权限、发起多步表单问答 |
| 🗄️ | **SQLite 统计分析** | 访问/提问/赞踩明细持久化存储，支持看板 |
| 📊 | **数据看板** | 每日统计 + 赞踩明细，管理员独享入口 |
| 🤖 | **多 Agent 模式** | 代码构建 / 架构规划 / 代码探索，按需切换 |
| 🛡️ | **生产就绪** | IP 隔离+限流、会话 TTL 清理、日志轮转归档 |

---

## 快速启动

> **前置条件**：Bun、OpenCode CLI（`opencode` 命令可用）

### 后端

```bash
bun install                # 安装依赖
bun run dev                # 开发模式（--watch 自动重启）
bun start                  # 生产模式
```

### 前端

```bash
cd client && bun install && cd ..       # 安装依赖
cd client && bun run dev                # 开发模式（Vite HMR @ :5173）
cd client && bun run build && cd ..     # 生产构建（输出到 dist/）
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
- **运行时**：进程内存（`Map`），重启丢失；统计快照异步写入 `logs/_stats.json`
- **持久化**：访问/提问/赞踩明细写入 `logs/analytics.db`（SQLite），看板全量查询（单表 limit 9999）
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
│   ├── routes/                 # 12 组 API 路由
│   ├── services/               # OpenCode SDK、会话、用户、统计、分析
│   ├── middleware/             # IP 解析、限流、会话守卫、日志、校验、错误处理
│   ├── storage/
│   │   ├── store.js            # 内存数据存储（Map + Set）
│   │   └── database.js         # SQLite 数据库初始化
│   └── logger/                 # 彩色控制台 + 文件轮转日志
│
├── client/                     # React 19 + TypeScript + Vite 6 前端
│   └── src/
│       ├── api/                # API 客户端（按资源拆分）
│       ├── components/         # layout/ chat/ sidebar/ common/ dashboard/
│       ├── contexts/           # ChatContext + ThemeContext
│       ├── hooks/              # useEvents（SSE 重连），useFeedback，useMediaQuery
│       ├── types/              # message、session、api 类型定义
│       └── styles/global.css   # Tailwind CSS v4 入口
│
├── scripts/
│   ├── view-db.js              # 数据库概况查看工具
│   └── sql-query.js            # 直接执行 SQL 查询工具
├── public/index.html           # Vanilla JS 版（零构建 fallback）
├── dist/                       # 构建产物（gitignore）
└── logs/                       # 运行时日志 + analytics.db（gitignore）
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
| `GET` | `/api/stats` | 平台统计（聚合） |
| `GET` | `/api/stats/daily?days=30` | 每日统计明细（看板用） |
| `GET` | `/api/stats/feedback-detail?limit=50` | 赞踩明细列表（看板用） |
| `GET` | `/api/stats/visits?limit=500` | 访问明细列表（看板用） |
| `GET` | `/api/stats/questions?limit=500` | 提问明细列表（看板用） |
| `POST` | `/api/stats/visit` | 记录页面访问 |
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

## 数据库

项目使用 **SQLite**（`bun:sqlite` 内置模块）持久化统计明细数据，文件位于 `logs/analytics.db`。

### 表结构

**`page_visits`** — 页面访问记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 自增主键 |
| `ip` | TEXT | 访客 IP |
| `user_agent` | TEXT | 浏览器标识 |
| `visit_date` | TEXT | 访问日期 |
| `visited_at` | TEXT | 访问时间 |

**`questions`** — 用户提问记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 自增主键 |
| `session_id` | TEXT | 会话 ID |
| `ip` | TEXT | 提问者 IP |
| `content` | TEXT | 问题原文 |
| `agent` | TEXT | 使用的 Agent |
| `question_date` | TEXT | 提问日期 |
| `asked_at` | TEXT | 提问时间 |

**`feedback`** — 赞踩记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 自增主键 |
| `session_id` | TEXT | 会话 ID |
| `ip` | TEXT | 用户 IP |
| `satisfied` | INTEGER | 1=点赞，0=点踩 |
| `question_content` | TEXT | 关联的问题原文 |
| `answer_content` | TEXT | AI 的回答原文 |
| `feedback_date` | TEXT | 反馈日期 |
| `created_at` | TEXT | 反馈时间 |

---

## 数据看板

管理员独享入口，普通用户不可见。

**访问方式**：在浏览器地址栏输入 `http://localhost:3000/#dashboard`

### 功能

- **摘要卡片**：总访客 / 总提问 / 今日访问 / 今日提问 / 反馈总数
- **全局筛选栏**：日期范围 / Agent 多选 / 满意度 / IP 搜索，联动所有表格和图表
- **Agent 使用分布饼图**：recharts 环形饼图，展示各 Agent 使用占比
- **满意度分布饼图**：展示点赞/点踩比例
- **每日统计表**：访问次数、访客数、提问数、点赞数、点踩数
- **访问明细表**：时间 / IP / User-Agent
- **提问明细表**：时间 / IP / Agent / 问题内容 / 会话 ID
- **赞踩明细表**：时间 / IP / 类型 / 问题内容 / AI 回答

### 交互

- Apple 风格表头设计：列名 + 排序图标 | 下方嵌入筛选输入框
- 所有表格支持列排序（点击列名切换升降序）
- 所有表格支持列筛选（文本输入框即时过滤，类型列用赞/踩按钮）
- 问题 / 回答内容 3 行截断，点击弹窗查看全文
- 弹窗支持 Markdown 渲染和源码标签切换
- 看完点击「← 返回聊天」回到对话页

---

## 数据库查看工具

### 概况一览

```bash
bun run db:view              # 显示各表记录数
bun run db:view visits       # 查看 page_visits 明细
bun run db:view questions    # 查看 questions 明细
bun run db:view feedback     # 查看 feedback 明细
```

### 任意 SQL 查询

```bash
bun run db:sql "SELECT * FROM page_visits LIMIT 10"
bun run db:sql "SELECT visit_date, COUNT(*) as visits FROM page_visits GROUP BY visit_date"
bun run db:sql "SELECT * FROM feedback ORDER BY id DESC LIMIT 20"
bun run db:sql "SELECT ip, COUNT(*) as cnt FROM questions GROUP BY ip ORDER BY cnt DESC"
bun run db:sql "PRAGMA table_info(page_visits)"
bun run db:sql "SELECT name FROM sqlite_master WHERE type='table'"
```

### GUI 工具

也可用 [DB Browser for SQLite](https://sqlitebrowser.org/) 打开 `logs/analytics.db` 直接浏览。

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端框架 | React 19 |
| 构建工具 | Vite 6 |
| CSS | Tailwind CSS v4 + CSS Modules |
| 图表 | recharts（看板饼图） |
| 弹窗 | @radix-ui/react-dialog（看板内容查看） |
| 图标 | lucide-react |
| 后端 | Express.js 4.21 (ESM) |
| AI SDK | `@opencode-ai/sdk` ^1.14 |
| 数据库 | SQLite（`bun:sqlite` 内置） |
| 日志 | 控制台 + 文件轮转 |
| 运行时 | Bun |
| Markdown | mermaid + react-markdown + highlight.js |
