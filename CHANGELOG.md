# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- UUID Token + Cookie 用户身份标识，替代 IP 识别
- SQLite 数据持久化（sessions 表 + 启动自动恢复）
- 数据库迁移机制（_migrations 表 + 版本化迁移）
- 健康检查端点 GET /api/health
- 类型安全共享层（api-responses.ts 12 个 API 接口类型）
- Provider 配置启动检测
- 测试框架基础设施（vitest + ESLint + Prettier）
- CI/CD 集成（GitHub Actions）
- CHANGELOG 版本管理
- 性能监控中间件（performanceLogger）
- .prettierrc / eslint.config.js / vitest.config.js 工具链配置

### Changed
- ChatContext 拆分为 useMessageStore / useSessionNavigation 自定义 Hook
- ref+state 双存储模式重构为 useReducer 统一状态管理
- CSS Modules 迁移为 Tailwind CSS 统一方案
- 错误处理中间件增强（AppError 类 + 错误码 + 结构化响应）
- 会话淘汰策略统一 userSessions Map + SQLite 同步清理
- SSE 缓冲 MAX_BUFFER: 200→5000, BUFFER_TTL: 5m→30m
- 日志跳过高频路径（/api/events, /api/health）
- config.json 启用 web_search/web_fetch 为 ask
- 移除无用依赖（better-sqlite3, playwright, highlight.js, @types/recharts）
- 移除 package-lock.json（项目统一使用 bun.lock）
- storage/store.js 清理已弃用的 ipUsers/ipSessions 导出
- statsService.js 清理空的向后兼容函数
- 客户端 Service Worker 死代码清理
- rateLimiter SSE 跳过逻辑修复（/events → /api/events）

### Fixed
- 同步路由与 SSE 竞争条件（删除 POST /api/chat 死代码）
- SSE 多流订阅资源泄漏（AbortController 断开释放）
- 懒注册安全漏洞（req.userId 替代 IP 兜底）
- 跨平台路径硬编码（移除 Windows 绝对路径）
- 双前端维护成本高（移除过时 Vanilla JS 页面）
- rateLimiter 未正确跳过 SSE 事件流（路径匹配错误）

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Multi-user support
- Real-time SSE streaming
- Dashboard with statistics
- Multiple Agent support
