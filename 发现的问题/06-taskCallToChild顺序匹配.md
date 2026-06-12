# 06. taskCallToChild 顺序匹配不可靠

> **严重度**：🟠 中等
> **涉及文件**：`client/src/contexts/ChatContext.tsx:184-193`
> **类型**：前端

## 问题描述

子会话与父会话 task 工具调用的映射关系通过**顺序匹配**实现，而非通过明确的元数据关联：

```tsx
// ChatContext.tsx:184-193
sessionMetaRef.current.forEach((meta, childID) => {
  if (meta.parentID !== parentID) return
  if (Array.from(mapped.values()).includes(childID)) return
  const tc = unmapped.shift()  // ← 靠顺序匹配！
  if (tc) {
    mapped.set(tc.callID, childID)
    changed = true
  }
})
```

### 问题

1. **顺序依赖**：假设子会话的创建顺序与 task 工具调用的启动顺序完全一致，这在并发场景下不成立
2. **并发 task**：OpenCode 支持 `batch` 工具并行执行多个 task，顺序无法保证
3. **重连问题**：SSE 重连后事件顺序可能变化，导致映射错误
4. **无日志告警**：当 `unmapped` 为空时，子会话静默丢弃，没有告警

## 改进方向

1. 在 OpenCode SDK 的 `session.created` 事件中携带对应的 `callID` 字段
2. 或者从 `task` 工具调用的 output 中解析出子会话 ID
3. 临时方案：记录日志并在子会话无法匹配时触发告警
