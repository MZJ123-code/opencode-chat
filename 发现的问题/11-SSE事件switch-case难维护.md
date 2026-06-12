# 11. SSE 事件类型用 switch-case 难维护

> **严重度**：🟠 中等
> **涉及文件**：`client/src/hooks/useEvents.ts:73-170`
> **类型**：前端

## 问题描述

20+ 种 SSE 事件类型使用一个巨型 switch-case 处理：

```ts
switch (event.type) {
  case 'message.updated':
    // 手动从 props 提取字段
    if (props.info) h.onMessageUpdated?.(props.info as Record<string, unknown>)
    break
  case 'message.part.delta':
    if (props.sessionID && props.partID) {
      h.onPartDelta?.(
        props.partID as string,
        props.messageID as string,
        props.sessionID as string,
        props.delta as string
      )
    }
    break
  // ... 20+ 个 case
  case 'session.next.step.ended':
    h.onStepEnded?.(props.sessionID as string, props.finish as number, ...)
    break
}
```

### 问题

1. **大量类型断言**：`props.xxx as string` 遍布各处，没有运行时校验，字段名写错或类型变更时静默失败
2. **扩展困难**：添加新事件类型需要：修改 switch-case → 修改 EventHandlerMap 接口 → 修改 ChatContext 对应方法 → 实现处理逻辑
3. **无法测试**：switch-case 结构难以单独测试事件路由逻辑

## 改进方向

```ts
// 方案：事件注册表模式
const registry = new Map<string, EventHandler>()
registry.set('message.updated', {
  schema: z.object({ info: z.object({...}) }),
  handler: (props, h) => h.onMessageUpdated?.(props.info)
})
registry.set('message.part.delta', {
  schema: z.object({ sessionID: z.string(), partID: z.string(), ... }),
  handler: (props, h) => h.onPartDelta?.(props.sessionID, ...)
})
```
