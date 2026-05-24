// ====== Part Types ======

/** 片段基础接口 */
export interface PartBase {
  /** 片段 ID */
  id: string
  /** 片段类型 */
  type: string
  /** 所属消息 ID */
  messageID: string
  /** 所属会话 ID */
  sessionID: string
  /** 时间信息 */
  time?: { start: number; end?: number }
  /** 附加元数据 */
  metadata?: Record<string, unknown>
}

/** 文本片段 */
export interface TextPart extends PartBase {
  type: 'text'
  /** 文本内容 */
  text: string
}

/** 推理片段 */
export interface ReasoningPart extends PartBase {
  type: 'reasoning'
  /** 推理文本 */
  text: string
}

/** 工具状态 */
export interface ToolState {
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'error'
  /** 输入参数 */
  input?: Record<string, unknown>
  /** 输出内容 */
  output?: string
  /** 工具标题 */
  title?: string
  /** 错误信息 */
  error?: string
  /** 时间信息 */
  time?: { start: number; end?: number }
}

/** 工具调用片段 */
export interface ToolPart extends PartBase {
  type: 'tool'
  /** 调用 ID */
  callID: string
  /** 工具名称 */
  tool: string
  /** 工具状态 */
  state: ToolState
}

/** 步骤开始片段 */
export interface StepStartPart extends PartBase {
  type: 'step-start'
  /** Agent 名称 */
  agent?: string
  /** 模型信息 */
  model?: { providerID: string; modelID: string; variant?: string } | { id: string; providerID: string; variant: string }
  /** 快照信息 */
  snapshot?: string
}

/** 步骤完成片段 */
export interface StepFinishPart extends PartBase {
  type: 'step-finish'
  /** 完成原因 */
  reason: string
  /** 消耗成本 */
  cost: number
  /** Token 用量 */
  tokens?: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

/** 子任务片段 */
export interface SubtaskPart extends PartBase {
  type: 'subtask'
  /** 提示内容 */
  prompt: string
  /** 描述信息 */
  description: string
  /** 执行的 Agent */
  agent: string
  /** 模型信息 */
  model?: { providerID: string; modelID: string }
  /** 执行命令 */
  command?: string
}

/** 补丁片段 */
export interface PatchPart extends PartBase {
  type: 'patch'
  /** 补丁哈希 */
  hash: string
  /** 涉及文件列表 */
  files: string[]
}

/** Agent 信息片段 */
export interface AgentPart extends PartBase {
  type: 'agent'
  /** Agent 名称 */
  name: string
}

/** 聊天片段联合类型 */
export type ChatPart = TextPart | ReasoningPart | ToolPart | StepStartPart | StepFinishPart | SubtaskPart | PatchPart | AgentPart | PartBase

// ====== Message Types ======

/** 消息元信息 */
export interface MessageInfo {
  /** 消息 ID */
  id: string
  /** 消息角色 */
  role: 'user' | 'assistant'
  /** 所属会话 ID */
  sessionID: string
  /** Agent 名称 */
  agent?: string
  /** 模型信息 */
  model?: { providerID: string; modelID: string; variant?: string }
  /** Token 用量 */
  tokens?: { input: number; output: number; reasoning?: number }
  /** 时间信息 */
  time?: { start: number; end?: number }
  /** 摘要信息 */
  summary?: { title?: string; description?: string }
}

/** 聊天消息 */
export interface ChatMessage {
  /** 消息元信息 */
  info?: MessageInfo
  /** 消息 ID */
  id?: string
  /** 消息角色 */
  role: 'user' | 'assistant'
  /** 消息片段列表 */
  parts: ChatPart[]
  /** 消息时间戳 */
  time?: number
}

/** 聊天发送结果 */
export interface ChatSendResult {
  /** 会话 ID */
  sessionId: string
  /** 回复文本 */
  reply: string
  /** 回复片段列表 */
  parts: ChatPart[]
  /** Token 用量 */
  tokens?: { input?: number; output?: number }
}
