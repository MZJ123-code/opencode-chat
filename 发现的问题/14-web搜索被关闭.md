# 14. 配置中 web_search / web_fetch 被关闭

> **严重度**：🟡 关注
> **涉及文件**：`server/config.json`
> **类型**：配置
> **状态**：✅ 已解决

## 问题描述

默认配置关闭了 Agent 的联网能力：

```json
{
  "tools": {
    "web_search": false,
    "web_fetch": false
  }
}
```

### 影响

- Agent 无法获取互联网最新信息
- 无法验证或引用外部来源
- 知识局限在本地文件系统内
- 用户需要手动切换到其他 AI 工具来获取网络信息

## 改进方向

```json
{
  "tools": {
    "web_search": "ask",    // 用户确认后才执行
    "web_fetch": "ask"      // 用户确认后才执行
  }
}
```

`ask` 模式让 Agent 在执行联网操作时弹出权限请求，在安全性和实用性之间取得平衡。
