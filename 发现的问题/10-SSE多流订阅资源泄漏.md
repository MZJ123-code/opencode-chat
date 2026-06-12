# 10. SSE 多流订阅资源泄漏风险

> **严重度**：🟠 中等
> **涉及文件**：`server/routes/events.js:165-169`
> **类型**：后端

## 问题描述

每个 SSE 客户端连接会订阅 N+1 个 OpenCode 事件流：

```js
// events.js:165-169
const subscribeTasks = [client.event.subscribe()]        // 默认目录
for (const dir of AGENT_DIR_MAP.values()) {               // 每个独立目录
  subscribeTasks.push(client.event.subscribe({ directory: dir }))
}
const streams = await Promise.all(subscribeTasks)
```

### 问题

1. **线性增长**：每个配置了独立目录的 Agent 多一个订阅流。3 个 Agent → 4 个流 / 客户端
2. **10 个客户端 × 4 个流 = 40 个长连接**，每个流占用 OpenCode 进程的资源
3. **客户端断连清理延迟**：浏览器关闭后，服务端可能需要一段时间（TCP keepalive 超时）才能检测到断开并取消订阅

## 影响

高并发场景下，OpenCode 进程需要维护大量事件订阅流，可能达到进程的文件描述符限制。

## 改进方向

1. 使用单一事件流，服务端按目录合并
2. 参考 OpenCode 官方的 `opencode serve` 实现，使用更轻量的事件路由
3. 在不支持按目录订阅时，由 OpenCode 进程统一推送所有事件，前端自行过滤
