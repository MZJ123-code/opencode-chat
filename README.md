# OpenCode Chat

> **本地部署 · 文件即知识库 · 免认证 · 开箱即用的 AI 对话平台**

[🇺🇸 English](./README.en.md)

本地启动一个 AI 对话系统，你的**文件系统就是知识库**——直接添加、修改文档或代码文件，AI 即刻感知并基于最新内容回答。无需注册登录，UUID Token 自动识别身份，适合团队内部快速搭建 AI 助手。

---

## 亮点特色

### 🖥️ 纯本地部署，数据不出局

一切运行在你自己机器上。Express 服务端 + OpenCode AI 引擎均为本地进程，无需调用外部 API（可配置私有模型），对话数据和文件内容完全由你掌控。

### 📂 文件系统即知识库

传统知识库需要导入、切片、向量化——这里不用。AI Agent 通过 `read` / `write` / `edit` / `bash` / `search` 等工具**直接读写你的文件**：

| 操作 | 说明 |
|------|------|
| **添加知识** | 往项目里放文档、Markdown、代码文件即可 |
| **修改知识** | 编辑文件，AI 下次对话自动读取最新内容 |
| **删除知识** | 删掉文件，AI 不再引用 |
| **批量更新** | 全局搜索替换、批量脚本，AI 都能感知 |

零延迟、零索引、零预处理——文件改完即用。

### ⚡ 快捷自定义 Agent 行为

编辑 `server/config.json`，无需改代码即可调整：

```json
{
  "agentOptions": [
    { "label": "文档助手", "description": "基于项目文档回答问题", "agent": "custom" }
  ],
  "tools": {
    "read": true, "search": true, "web_search": true
  }
}
```

工具开关、Agent 角色、模型参数、系统提示词均可配置，灵活适配不同场景。

### 🔑 零摩擦多用户

抛弃传统认证体系，**UUID Token 自动识别**。用户首次访问时生成唯一 Token，存储在 Cookie 中，兜底使用 IP。用户打开浏览器即可使用，适合企业内部工具或小团队场景。会话 7 天 TTL 自动清理，每个用户最多 100 会话，全局上限 5000。

### ⚡ SSE 实时流式输出

通过 Server-Sent Events 实现 AI 回复实时推送，支持 **20+ 事件类型**（文本增量、工具调用、推理过程、子会话导航）。内置**事件环形缓冲区**（每 IP 200 条），客户端断连后重连可增量回放，不丢消息。

### 🏗️ 双前端引擎

| 前端 | 说明 |
|------|------|
| **React SPA** | React 19 + Vite 6 + Tailwind CSS v4，全功能体验 |

### 🔄 AI 子会话导航

AI Agent 可通过 `task` 工具创建**子任务**，前端自动维护完整导航栈（前进/后退/返回父级），实现类似浏览器的多层级对话体验。SSE 事件实时同步导航状态。

### 💬 AI 权限与多步问答

AI Agent 能主动向用户请求权限（如文件读写），或发起**多步骤表单式问答**（单选/多选/自定义输入）。`PermissionDialog` 组件带有步骤指示器和进度条，交互体验接近专业表单工具。

### 📊 SQLite 持久化 + 数据看板

使用 `bun:sqlite`（WAL 模式）持久化三类明细数据：

| 数据 | 内容 |
|------|------|
| `page_visits` | 页面访问记录（IP + User-Agent） |
| `questions` | 用户提问记录（内容 + Agent + 时间） |
| `feedback` | 赞踩记录（满意度 + 问题/回答原文） |

**管理员看板**（`/#dashboard`）独享入口，包含摘要卡片、Agent 使用分布饼图（recharts）、满意度饼图、Apple 风格可排序筛选表格、Markdown 弹窗查看全文。

支持命令行查看：`bun run db:view` 和 `bun run db:sql`。

### 🤖 多 Agent 模式

| 标签 | Agent | 用途 |
|------|-------|------|
| 📖 知识向导 | `knowledge-guide` | 基于独立知识库目录回答问题，只读不修改 |
| 🛠️ 代码构建 | `build` | 编写、修改和调试代码 |
| 📐 架构规划 | `plan` | 架构设计和技术方案 |
| 🔍 代码探索 | `explore` | 快速分析代码库 |

可在 `config.json` 的 `agentOptions` 中自由增删改 Agent。

#### 按 Agent 指定工作目录

可为 Agent 配置独立工作目录，使其操作特定知识库或项目：

```json
{
  "agentOptions": [
    {
      "label": "知识向导",
      "agent": "knowledge-guide",
      "directory": "D:/workspace/knowledge-base"
    }
  ]
}
```

配置 `directory` 后，该 Agent 的会话创建和消息发送都会通过 `x-opencode-directory` 请求头路由到指定目录。未配置 `directory` 的 Agent 使用默认工作目录（项目根目录）。

Agent 配置文件同时需要安装在全局目录 `.config/opencode/agents/` 下，确保切换工作目录后仍能被 OpenCode 加载。

### 🛡️ 生产就绪

- IP 隔离 + 请求限流：`/api` 路由 200 次/15 分钟/IP
- `userToken` 中间件：UUID Cookie 用户识别，兜底 IP
- `performanceLogger` 中间件：请求耗时监控，辅助性能分析
- `sessionGuard` 中间件验证会话归属
- 日志彩色控制台输出 + 文件轮转归档（10MB 自动归档，保留最近 10 个）
- 优雅关闭：SIGINT/SIGTERM 信号处理，保存统计快照 + 关闭 OpenCode 子进程

---

## 快速启动

**前置条件**：Bun、OpenCode CLI（`opencode` 命令可用）

```bash
# 安装依赖
bun install
cd client && bun install && cd ..

# 开发模式
bun run dev               # 后端 --watch 自动重启
cd client && bun run dev  # 前端 Vite HMR @ :5173

# 生产构建
cd client && bun run build && cd ..
bun start                 # 生产启动
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | 运行环境 |
| `MODEL` | `deepseek/deepseek-chat` | AI 模型（可换本地模型） |

---

## 如何快捷修改知识库

### 方式一：直接编辑文件

AI Agent 可以读写工作区内的任何文件。你只需：

```
# 新建知识文档
echo "产品 v2.0 的 API 约定：..." > docs/api-conventions.md

# 或修改现有文件
编辑 config/settings.json
```

AI 在对话中通过 `read` / `search` 工具自动获取最新内容。

### 方式二：修改 Agent 配置

`server/config.json` 中的 `agentOptions` 定义 Agent 列表和行为，改完重启即可生效。

### 方式三：调整工具权限

`server/config.json` 的 `tools` 字段控制 AI 能使用的工具：

```json
{
  "tools": {
    "read": true,       // 读取文件
    "write": true,      // 写入文件
    "edit": true,       // 编辑文件
    "bash": true,       // 执行命令
    "search": true,     // 搜索代码
    "web_search": true, // 联网搜索
    "web_fetch": true   // 抓取网页
  }
}
```

---

## 架构

```
用户 → 浏览器 (React SPA)
         ↓ HTTP/SSE
    Express 服务器 (:3000) ← config.json 控制行为
         ↓
    OpenCode SDK (@opencode-ai/sdk/v2)
         ↓
    OpenCode AI 引擎 (:4096) ← 直接操作本地文件系统
```

### 请求模式

- **异步** `POST /api/chat/async` — 立即返回，AI 回复通过 SSE 实时推送

### 中间件链

```
express.json() → clientIP → userToken → requestLogger → performanceLogger → rateLimiter(/api) → routes → errorHandler
```

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4 |
| 后端 | Express.js 4.21 (ESM) |
| AI | `@opencode-ai/sdk` v2 + OpenCode CLI（本地 AI 引擎） |
| 数据库 | SQLite（`bun:sqlite` 内置，WAL 模式） |
| 图表 | recharts |
| 弹窗 | @radix-ui/react-dialog |
| 图标 | lucide-react |
| 动画 | framer-motion |
| Markdown | react-markdown, mermaid, highlight.js |
| 运行时 | Bun |
| 日志 | 控制台彩色输出 + 文件轮转归档 |

---

## 项目结构

```
opencode-chat/
├── server/                    # Express ESM 后端
│   ├── config.json            # ⬅ 核心配置（Agent、工具、模型）
│   ├── routes/                # 12 组 API 路由
│   ├── services/              # OpenCode SDK / 会话 / 用户 / 统计 / 分析
│   ├── middleware/             # IP 解析 / 限流 / 会话守卫 / 日志 / 校验 / 错误处理
│   ├── storage/               # 内存存储 (Map) + SQLite 初始化
│   └── logger/                # 彩色控制台 + 文件轮转日志
├── client/                    # React 19 + TypeScript + Vite 6 前端
│   └── src/
│       ├── api/               # 按资源拆分的 API 客户端
│       ├── components/        # chat / sidebar / layout / dashboard / common / ui
│       ├── contexts/          # ChatContext (SSE/多会话/导航) + ThemeContext
│       ├── hooks/             # useEvents (SSE 重连+退避) / useFeedback / useMediaQuery
│       └── types/             # message / session / api 类型定义
├── 发现的问题/                # 问题跟踪与解决记录
├── scripts/                   # 数据库查看工具
├── logs/                      # 运行时日志 + analytics.db (SQLite)
└── AGENTS.md                  # 编码规范指引
```

---

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 会话列表 |
| `POST` | `/api/sessions` | 创建会话 |
| `GET` | `/api/sessions/:id/messages` | 消息历史 |
| `POST` | `/api/chat/async` | 异步发送（SSE 接收回复） |
| `GET` | `/api/events` | SSE 事件流 |
| `POST` | `/api/sessions/:id/feedback` | 满意度反馈 |
| `GET` | `/api/stats` | 平台统计（聚合） |
| `GET` | `/api/agents` | Agent 列表 |
| `POST` | `/api/permission/respond` | 权限响应 |

---

## 数据库工具

```bash
bun run db:view                     # 各表记录数一览
bun run db:view visits              # 查看访问明细
bun run db:sql "SELECT * FROM questions LIMIT 10"  # 任意 SQL 查询
```
