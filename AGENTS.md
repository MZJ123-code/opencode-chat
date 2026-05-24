# OpenCode Chat — Agent 指引

## 快速命令

```bash
# 安装依赖（两端都要装）
npm install
cd client && npm install && cd ..

# 开发：终端1 — 后端（--watch 自动重启）
npm run dev

# 开发：终端2 — 前端 Vite dev server（HMR @ :5173，代理 /api → :3000）
cd client && npm run dev

# 构建前端（tsc -b → vite build → ../dist/）
cd client && npm run build && cd ..

# 生产启动
npm start
```

**无测试、无 lint、无 formatter。** `npm run build` 会执行 `tsc -b` 做类型检查。

## 架构关键点

- **根目录**是 Express ESM 服务端入口（`server/index.js`），`client/` 是前端子项目（React 19 + Vite + TypeScript + Tailwind CSS v4）
- **配置**：`server/config.json`（通过 `server/config.js` 读取，支持环境变量覆盖 `PORT`/`NODE_ENV`/`MODEL`）
- **静态文件**：优先 `dist/index.html`（构建产物），fallback 到 `public/index.html`（零构建 Vanilla JS）
- **SDK**：`@opencode-ai/sdk/v2` → `createOpencode()` 自动拉起 OpenCode 进程（`:4096`，绑定 `127.0.0.1`）
- **数据存储**：进程内存（`Map`），重启丢失；统计快照写入 `logs/_stats.json`
- **会话 TTL**：7 天未活跃自动清理（每小时检查一次）
- **限流**：`/api` 路径 200 次/15 分钟/IP，SSE 流路径不限制
- **用户识别**：基于 IP（`x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`），无需登录
- **中间件链**：`json → clientIP → requestLogger → rateLimiter(/api) → routes → errorHandler`

## 前端注意事项

- **Path alias**：`@/` → `src/`（`tsconfig.json` + `vite.config.ts` 均配置）
- **shadcn/ui**：组件在 `client/src/components/ui/`，配置在 `client/components.json`
- **SSE**：`/api/events`；客户端 `useEvents` hook 自动处理重连和指数退避
- **CSS**：Tailwind CSS v4 + CSS Variables + CSS Modules（`client/src/styles/global.css` 为入口）
- **React Context 全局状态**：`ChatContext`（会话/消息/流式/输入/侧边栏/全局错误）+ `ThemeContext`

## API 路由（server/routes/）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions` | 用户会话列表 |
| POST | `/api/sessions` | 创建会话 |
| GET | `/api/sessions/:id/messages` | 消息历史 |
| POST | `/api/chat` | 同步发送（等待完整回复） |
| POST | `/api/chat/async` | 异步发送（通过 SSE 接收回复） |
| POST | `/api/sessions/:id/feedback` | 满意度反馈 |
| GET | `/api/stats` | 平台统计 |
| GET | `/api/events` | SSE 事件流 |
| POST | `/api/permission/respond` | 权限响应 |
| POST | `/api/permission/question/reply` | 问题回复 |
| POST | `/api/permission/question/reject` | 问题跳过 |
| GET | `/api/agents` | 可用 AI Agent 列表 |

## 编码规范

### 函数级注释（强制）

所有导出的函数/组件/Hook 必须带有 JSDoc（JS）或 TSDoc（TS）注释：

```js
// 服务端 JS — JSDoc
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
// 前端 TSX — TSDoc
/**
 * 消息气泡组件
 * @param props - 组件属性
 * @param props.message - 消息数据
 * @param props.isStreaming - 是否正在流式输出
 */
export function MessageBubble({ message, isStreaming }: Props) { ... }
```

规则：
- **导出函数/组件**：必须写注释，说明用途 + 参数 + 返回值
- **内部函数**：推荐注释，逻辑复杂时强制写
- **React 组件**：Props 用 TypeScript 类型定义，`@param` 标注关键 Props

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getClientIP`, `sessionService` |
| 类/类型/组件 | PascalCase | `ChatProvider`, `SessionListItem` |
| 常量 | UPPER_SNAKE 或 camelCase | `MAX_BUFFER`, `WRITE_INTERVAL` |
| 文件 | kebab-case（JS/TS）或 PascalCase（组件） | `session-service.js`, `MessageBubble.tsx` |
| CSS Module | `*.module.css` | `MessageBubble.module.css` |
| 目录 | kebab-case | `session-service.js` 在 `services/` |

### 注释与日志

- 所有注释、日志、错误消息使用**中文**
- 日志分级使用：`logger.info` / `logger.warn` / `logger.error`
- 避免 `console.log`（服务端用 `logger`，前端仅在 `import.meta.env.DEV` 时允许）
- 前端 SSE 调试日志用 `window.__DEBUG_EVENTS__` 控制（仅开发环境）

### TypeScript 规范

- 禁止 `any`，优先使用精确类型或 `unknown`
- 禁止 `as` 类型断言，除非上游 SDK 无类型
- Props 接口命名：`${组件名}Props`（如 `MessageBubbleProps`）
- 使用 `@/` 路径别名引用 `client/src/` 下的模块

### 错误处理

- 服务端异步路由必须用 `try/catch` + `next(err)` 或全局 `errorHandler`
- SSE 流错误静默处理，禁止未捕获异常导致进程退出
- 前端 API 调用通过 `client.ts` 的 `api()` 统一错误封装
- 外部资源读取（文件、网络）必须 `try/catch` 静默兜底

### React 规范

- 优先 `function Component() { ... }` 而非箭头函数组件
- Hook 以 `use` 开头（`useEvents`, `useFeedback`）
- Context 拆分原则：按关注点分离，避免单 Context 过大
- 模块级变量（模块作用域的 `let`）必须用 `useRef` 替代（StrictMode 安全）

### 文件组织

- 每个文件只对外导出一个主要功能（路由/Hook/Context/组件）
- CSS Module 与组件文件同级
- API 客户端按资源拆分（`sessions.ts`、`chat.ts`、`feedback.ts`）

## 团队约定

- `logs/`、`dist/`、`node_modules/` 在 `.gitignore` 中，不提交
- 无 PR/CI/CD 配置
- 无测试框架、无 ESLint、无 Prettier（使用内置 `tsc -b` 做类型检查）
