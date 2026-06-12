# 09. 同步路由与 SSE 事件流竞争条件

> **严重度**：🟠 中等
> **涉及文件**：`server/routes/chat.js:80-136`、`client/src/hooks/useEvents.ts`
> **类型**：后端
> **状态**：✅ 已解决

## 问题描述

`POST /api/chat`（同步模式）的工作方式是先发送 prompt 到 OpenCode，然后等待完整响应返回。但 SSE 事件流早已在后台运行，并实时推送同一会话的 `message.part.*` 事件。

```
时序：
1. 客户端发起同步 POST /api/chat
2. 服务端调用 client.session.prompt() 并等待
3. 此时 SSE 已在推送：message.part.delta, message.part.updated...
4. 前端 SSE 处理器接收事件 → 更新消息状态
5. prompt() 返回完整结果 → 前端又收到一份数据
```

### 风险

- 前端 SSE 和同步响应**两份数据**可能引起消息重复
- SSE 的增量 delta 推送后，同步结果又覆盖一次，可能导致光标跳动
- `POST /api/chat` 和 `GET /api/events` 是两个独立的 HTTP 连接，时序不可控

## 影响

目前前端只用 `POST /api/chat/async`（异步模式），但同步路由代码仍然存在，是潜在问题源。

## 改进方向

1. 删除同步路由，全量迁移至异步+SSE 模式
2. 或在同步返回中包含序列号，前端据此忽略 SSE 重复事件
3. 或在同步请求前暂停当前会话的 SSE 事件处理
