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

## 已知死代码（可安全删除）

| 文件 | 内容 | 原因 |
|------|------|------|
| `server/services/statsService.js:6` | `recordVisit()` | 从未被调用 |
| `server/services/statsService.js:10` | `incrementSessions()` | 从未被调用 |
| `server/services/userService.js:25` | `getVisitorInfo()` | 从未被引入 |
| `client/src/api/permission.ts:13` | `respondPermission()` | 从未被引入 |
| `client/src/components/ui/` | `input.tsx`, `skeleton.tsx`, `tooltip.tsx`, `separator.tsx`, `sheet.tsx`, `scroll-area.tsx`, `avatar.tsx` | shadcn 生成的占位组件，未被任何代码引用 |
| `server/config.json:63-67` | agent 条目 `"门子俊"` (agent: "explore") | 与上方 `"代码探索"` 重复的测试数据 |

## 团队约定（源自代码，未文档化）

- 所有代码用中文注释/日志/错误信息
- `logs/`、`dist/`、`node_modules/` 在 `.gitignore` 中
- 无 PR/CI/CD 配置
