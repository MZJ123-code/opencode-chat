# 04. 前端 ChatContext 职责过重

> **严重度**：🟠 中等
> **涉及文件**：`client/src/contexts/ChatContext.tsx`（793 行）
> **类型**：前端

## 问题描述

`ChatContext.tsx` 是一个 793 行的巨型 Context Provider，承担了太多职责：

| 职责 | 行数 | 说明 |
|------|:----:|------|
| 全局状态管理 | ~793 行 | 20+ 个 state 变量 |
| SSE 事件分发 | ~150 行 | 注入 Part、处理消息增量 |
| 多会话导航 | ~60 行 | 导航栈、父子会话切换 |
| 消息发送 | ~40 行 | async 发送、用户消息注入 |
| 会话列表管理 | ~60 行 | 创建、刷新、懒加载 |
| Agent 选择 | ~20 行 | 加载 Agent 列表、选择状态 |
| 权限弹窗 | ~10 行 | pendingPermission 渲染 |
| 子会话映射 | ~80 行 | taskCallToChild 重建逻辑 |

### 问题

1. **单一职责原则违反**：一个文件承担状态管理、事件处理、导航、消息发送等核心逻辑
2. **测试困难**：几乎所有组件逻辑都依赖这个 Context，无法独立测试
3. **耦合度高**：修改导航逻辑可能影响事件处理，修改事件处理可能影响消息发送
4. **难以理解**：新开发者需要理解整个 793 行才能做任何修改

## 改进方向

```
拆分方案：
├── SessionManager     → 会话列表 CRUD + TTL + 限额
├── MessageStore       → 多会话消息存储（可用 useReducer）
├── SessionNavigator   → 子会话导航栈 + 父子切换
├── EventDispatcher    → SSE 事件 → React 状态转化
└── PermissionManager  → 权限弹窗状态管理
```
