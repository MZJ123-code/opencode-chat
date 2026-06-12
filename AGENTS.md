# OpenCode Chat — Agent 指引

## 快速命令

```bash
bun install
cd client && bun install && cd ..

bun run dev              # 后端（自动拉起 OpenCode 子进程 + --watch 重启）
cd client && bun run dev # 前端 Vite HMR @ :5173，代理 /api → :3000
cd client && bun run build && cd .. # tsc -b → vite build → ../dist/
bun start                # 生产启动
bun run dev:external     # 连接已有外部 OpenCode 进程（OPENCODE_EXTERNAL_URL）
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 开发模式（--watch 热重启） |
| `bun start` | 生产启动 |
| `bun run test` | 运行所有测试（vitest run） |
| `bun run test:watch` | 监听模式 |
| `bun run test:perf` | 性能测试 |
| `bun run db:view` | SQLite 数据查看 |
| `bun run db:sql` | SQLite 自定义查询 |

## 架构关键点

- **根目录**是 Express ESM 服务端，`client/` 是 React 19 + Vite + TypeScript 前端
- **配置**：`server/config.json`（环境变量覆盖 `PORT`/`NODE_ENV`/`MODEL`）
- **静态文件**：优先 `dist/index.html`，fallback `public/index.html`（Vanilla JS）
- **SDK**：`@opencode-ai/sdk/v2` → `createOpencode()` 自动拉起 OpenCode 进程（`:4096`）
- **数据**：SQLite 持久化（`data/opencode-chat.db`，`sessions` 表 + `_migrations` 表），启动自动恢复；统计写入 `logs/_stats.json`
- **会话 TTL**：7 天未活跃清理（每小时检查），SQLite 同步清理
- **限流**：`/api` 200 次/15 分钟/IP，SSE 不限
- **用户识别**：UUID Token + Cookie 标识（`opencode-chat-token`），兜底 IP
- **中间件链**：`json → clientIP → userToken → requestLogger → performanceLogger → rateLimiter(/api) → routes → errorHandler`
- **看板（Dashboard）**：`#dashboard` 路由，组件位于 `client/src/components/dashboard/`
  - `DashboardPage.tsx` — 主页面，Apple 风格表头统一排序+筛选
  - `DashboardFilters.tsx` — 全局筛选栏（日期/Agent/满意度/IP）
  - `DashboardCharts.tsx` — recharts Agent + 满意度饼图
  - `ContentModal.tsx` — @radix-ui/react-dialog 弹窗（Markdown/源码）
- **SDK v2 消息结构**：角色在 `msg.info.role`（agent/plan/build/explore）而非 `msg.role`

## 测试

```bash
bun test                   # 运行所有测试（vitest run）
bun run test:watch         # 监听模式
bun run test:perf          # 性能测试（server/__tests__/performance/）
```

## 强制流程

- **跟踪更新**：每次代码修改后必须更新 `发现的问题/解决跟踪.md`，标记已解决问题的状态和解决方式

## 编码规范

### 函数级注释（强制）

所有导出函数/组件/Hook 必须带 JSDoc（JS）或 TSDoc（TS）注释：

```js
/**
 * 创建新会话
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createSession(req, res) { ... }

/**
 * @param {string} ip - 客户端 IP
 * @returns {boolean} 是否新访客
 */
export function ensureIP(ip) { ... }
```

```tsx
/**
 * 消息气泡组件
 * @param props - 组件属性
 * @param props.message - 消息数据
 * @param props.isStreaming - 是否正在流式输出
 */
export function MessageBubble({ message, isStreaming }: Props) { ... }
```

规则：导出函数必须写注释说明用途 + 参数 + 返回值；React 组件 Props 用 TS 类型 + `@param`。

### 命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getClientIP` |
| 类/类型/组件 | PascalCase | `ChatProvider` |
| 常量 | UPPER_SNAKE | `MAX_BUFFER` |
| 文件 | kebab-case（JS）或 PascalCase（组件） | `session-service.js` |

### 注释与日志

- 全部使用**中文**
- 日志分级：`logger.info` / `logger.warn` / `logger.error`
- 禁用 `console.log`（服务端用 `logger`，前端仅 `import.meta.env.DEV` 时允许）

### TypeScript

- 禁止 `any`，用 `unknown`
- 禁止 `as` 类型断言（除非上游 SDK 无类型）
- Props 接口命名：`${组件名}Props`
- 路径别名 `@/` → `src/`

### 错误处理

- 异步路由必须 `try/catch` + `next(err)`
- SSE 错误静默处理，禁止进程退出
- 外部资源读取必须 `try/catch` 静默兜底

### React

- 优先 `function Component() { ... }`
- Hook 以 `use` 开头
- 模块级 `let` 必须用 `useRef` 替代（StrictMode 安全）

### 文件组织

- 每文件只导出一个主要功能（路由/Hook/Context/组件）
- CSS Module 与组件同级
- API 客户端按资源拆分

## API 路由（server/routes/）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions` | 用户会话列表 |
| POST | `/api/sessions` | 创建会话 |
| GET | `/api/sessions/:id/messages` | 消息历史 |
| POST | `/api/chat/async` | 异步发送（通过 SSE 接收回复） |
| POST | `/api/sessions/:id/feedback` | 满意度反馈 |
| GET | `/api/stats` | 平台统计（聚合） |
| GET | `/api/stats/daily?days=90` | 每日统计明细（看板用） |
| GET | `/api/stats/feedback-detail?limit=9999` | 赞踩明细（看板用） |
| GET | `/api/stats/visits?limit=9999` | 访问明细（看板用） |
| GET | `/api/stats/questions?limit=9999` | 提问明细（看板用） |
| GET | `/api/events` | SSE 事件流 |
| POST | `/api/permission/respond` | 权限响应 |
| POST | `/api/permission/question/reply` | 问题回复 |
| POST | `/api/permission/question/reject` | 问题跳过 |
| GET | `/api/agents` | 可用 AI Agent 列表 |
