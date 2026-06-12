# OpenCode 生态与背景知识

## 什么是 OpenCode？

OpenCode 是一款**开源 AI 编程助手**，可在终端、IDE 或桌面环境中运行。由 SST 团队的 [anomalyco](https://github.com/anomalyco/opencode) 开发，MIT 协议。

- GitHub: https://github.com/anomalyco/opencode
- 官网: https://opencode.ai
- **160K+ GitHub 星标**，**900+ 贡献者**，**每月 750 万+ 开发者**使用

## 核心特性

- **不受单一供应商限制**：连接 75+ 个 LLM 提供商（Anthropic、OpenAI、Google、GitHub Copilot、Groq、Mistral、xAI、Ollama 等）
- **免费内置模型**：提供可免费使用的模型
- **隐私优先**：不存储用户数据
- **多种界面**：终端 TUI、Web UI、桌面应用（Tauri v2）

## OpenCode 的架构

### 整体架构（官方 OpenCode，非本项目）

```
用户输入 `opencode`
  │
  ├─ yargs 解析命令
  ├─ 中间件：日志、环境变量、数据库迁移
  │
  └─ 默认命令：TuiThreadCommand
     │
     ├─ 创建 Worker 线程
     │   └─ Worker 运行 HTTP 服务 + 事件转发
     │
     ├─ 建立主线程与 Worker 之间的 RPC 连接
     │
     └─ 启动 SolidJS TUI 渲染
```

### 技术栈（官方）

| 层 | 技术 | 原因 |
|----|------|------|
| 运行时 | Bun | 启动速度，原生 `bun:sqlite` |
| 单体仓库 | Turborepo | 多包协作 |
| TUI/Web UI | SolidJS | 细粒度响应式更新 |
| 推理引擎 | Vercel AI SDK v5 | 25+ 提供商的统一流式接口 |
| ORM | Drizzle + SQLite | 轻量级类型安全持久化 |
| 验证 | Zod v4 | 运行时 schema 验证 |
| 桌面 | Tauri v2 | 轻量级原生包装 |

### Agent 系统（6 大内置 Agent）

| Agent | 角色 | 工具权限 |
|-------|------|---------|
| **build** | 默认，构建和修改 | 几乎所有工具 |
| **plan** | 计划模式，只分析不执行 | 只读工具 + 计划文件编辑 |
| **general** | 通用子 Agent | 多数工具 |
| **explore** | 快速代码探索 | 仅搜索相关工具 |
| **compaction** | 消息压缩（内部）| — |
| **title** | 标题生成（内部）| — |

**关键设计**：Agent 不是靠提示词区分的，而是**权限规则集**——`plan` Agent 只是看不到写入工具。Agent 间可通过 `task` 工具递归委托。

### 核心循环（SessionPrompt.loop()）

```
用户输入 → SessionPrompt.prompt() → SessionPrompt.loop()
  ├─ 解析可用工具（按 Agent + Model 过滤）
  ├─ 注入系统提醒
  ├─ LLM.stream() → Vercel AI SDK
  │   ├─ 组装系统提示词
  │   ├─ 编排对话历史
  │   └─ 开始流式输出
  ├─ 处理流式事件
  │   ├─ text-delta → 更新文本
  │   ├─ reasoning-delta → 更新推理过程
  │   ├─ tool-call → 执行工具
  │   └─ finish-step → 计算成本，生成 diff
  └─ 检查完成条件
```

### 22+ 内置工具

包括：`bash`、`read`、`write`、`edit`、`apply_patch`、`glob`、`grep`、`websearch`、`codesearch`、`webfetch`、`task`、`question`、`skill`、`batch`、`todowrite` 等。

**编辑工具配备 9 层回退匹配策略**，从精确匹配到多重出现匹配。

## SDK（`@opencode-ai/sdk`）

- npm: `@opencode-ai/sdk`，每周 800 万+ 下载
- 由 [Stainless](https://www.stainless.com/) 从 OpenAPI 规范自动生成
- 两种使用方式：
  1. `createOpencode()` — 启动服务端 + 客户端
  2. `createOpencodeClient()` — 纯客户端模式

### SDK v2（本项目使用）

`@opencode-ai/sdk/v2` 入口，变更包括：
- 请求/响应路由使用 v2 参数结构（顶层 `sessionID` 参数）
- 新增设置：`permission`、`variant`、`directory`、`outputFormatRetryCount`
- 结构化输出使用原生 `json_schema` 模式
- 旧版 `cwd` 和 `tools` 路径已弃用

### 关键 API 方法

| 方法 | 用途 |
|--------|------|
| `client.session.list()` | 列出会话 |
| `client.session.create()` | 创建会话 |
| `client.session.prompt()` | 同步提示（等待完成） |
| `client.session.promptAsync()` | 异步提示（通过 SSE 获取结果） |
| `client.message.list()` | 列出消息 |
| `client.event.subscribe()` | SSE 事件流订阅 |

## CLI 命令

| 命令 | 用途 |
|---------|------|
| `opencode [project]` | 在目录中启动 TUI |
| `opencode run [message..]` | 一次性无头调用 |
| `opencode serve` | 无头 HTTP API 服务端 |
| `opencode web` | 无头服务端 + Web UI |
| `opencode attach <url>` | 将 TUI 附加到运行中的服务端 |
| `opencode session` | 列出或删除会话 |
| `opencode export [sessionID]` | 将会话导出为 JSON |
| `opencode stats` | 使用统计仪表板 |
| `opencode mcp` | 管理 MCP 服务端 |
| `opencode upgrade` | 更新 OpenCode |

## OpenCode Web UI 生态

OpenCode 生态中有多个社区开发的 Web UI，本项目是其中之一：

| 项目 | 技术栈 | 星标 | 特色 |
|------|--------|------|------|
| **OpenCode Chat (本项目)** | Express + React 19 | - | 多用户、看板、Vanilla 双前端 |
| **OpenCodeUI** (lehhair) | React 19 + Vite 7 + Tauri 2 | 447⭐ | 内置终端、PWA、Docker、桌面应用 |
| **opencode-vibe** (joelhooks) | Next.js 16 + Effect | 176⭐ | RSC、多服务器发现、Catppuccin 主题 |
| **openvibe** (Shubham-Rasal) | Next.js + GitHub Auth | - | GitHub 登录、项目管理、Workspace |
| **open-code-chat** (wan-kong) | Vue 3 + shadcn-vue | - | Vue 生态、多项目 |
| **OpenCode Angular Client** (nalyk) | Angular 19 | - | Angular 生态、命令面板 |

## 关键设计理念

1. **分层回退优于完美预测** — 编辑工具的 9 层匹配、提供商的多级回退、配置的 7 层合并
2. **约束即安全** — Agent 能力不由提示词定义，而由可使用的工具定义
3. **事件驱动是粘合剂** — GlobalBus 连接 LLM 流式响应、工具执行、UI 和多线程
4. **务实主义胜过炫耀** — SQLite 优先于 PostgreSQL、Drizzle 优先于 Prisma、去规范化 JOIN 语句
