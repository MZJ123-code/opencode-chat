# 16. Provider 配置为空

> **严重度**：🟡 关注
> **涉及文件**：`server/config.json`、`server/config.js`
> **类型**：配置
> **状态**：✅ 已解决

## 问题描述

```json
{
  "provider": {}
}
```

Provider 配置为空，用户必须通过环境变量设置模型提供商。但：

1. README 中只列了 `MODEL` 环境变量，没有说明如何配置 API Key
2. 环境变量格式不明确（例如 `ANTHROPIC_API_KEY` 还是 `OPENAI_API_KEY`？）
3. 启动时没有检测 Provider 是否配置，出错信息不友好

### 影响

- 新用户首次启动可能因为缺少 API Key 而失败
- 失败信息指向 OpenCode 内部错误，而非提示用户配置 Provider
- 缺乏配置示例文档

## 改进方向

1. 在 README 中添加 Provider 配置示例：

```bash
# 使用 DeepSeek
export DEEPSEEK_API_KEY=sk-xxx
export MODEL=deepseek/deepseek-chat

# 使用 OpenAI
export OPENAI_API_KEY=sk-xxx
export MODEL=gpt-4o

# 使用 Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-xxx
export MODEL=anthropic/claude-sonnet-4-20250514
```

2. 启动时检测 Provider 配置，如果缺失给出友好提示
3. 支持在 config.json 中配置 provider 参数
