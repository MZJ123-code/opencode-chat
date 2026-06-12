# 05. 前端 ref+state 双存储模式脆弱

> **严重度**：🟠 中等
> **涉及文件**：`client/src/contexts/ChatContext.tsx`
> **类型**：前端

## 问题描述

项目中多处使用 ref + state 双存储模式，ref 用于快速读写，state 用于触发 React 渲染：

```tsx
// ChatContext.tsx
const [allMessages, setAllMessages] = useState<Map<string, ChatMessage[]>>(new Map())
const allMessagesRef = useRef<Map<string, ChatMessage[]>>(new Map())

const [sessionMeta, setSessionMeta] = useState<Map<string, SessionMeta>>(new Map())
const sessionMetaRef = useRef<Map<string, SessionMeta>>(new Map())

const [navigationStack, setNavigationStack] = useState<string[]>([])
const navigationStackRef = useRef<string[]>([])
```

同步策略有两种：

```tsx
// 当前会话：requestAnimationFrame 批量同步
const scheduleFlush = useCallback(() => {
  requestAnimationFrame(() => flushAllMessages())
}, [flushAllMessages])

// 非当前会话：500ms setTimeout 延迟同步
const scheduleBackgroundFlush = useCallback(() => {
  setTimeout(() => flushAllMessages(), 500)
}, [flushAllMessages])
```

### 风险

1. **ref 与 state 可能不一致**：ref 修改后到下一次 `setState` 之间，其他组件读取 state 拿到的是旧数据
2. **延迟同步的竞态**：`scheduleBackgroundFlush(500)` 期间若有多次修改，有些可能丢失
3. **复杂度过高**：需要跟踪 ref/state 两套状态，容易遗漏同步

## 改进方向

1. 使用 `useReducer` 替代 ref+state，所有修改走 dispatch
2. 或引入 Zustand/Jotai 等外部状态管理库
3. 或使用 `useSyncExternalStore` 替代手动同步
