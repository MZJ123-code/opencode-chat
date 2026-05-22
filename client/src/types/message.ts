// ====== Part Types ======

export interface PartBase {
  id: string
  type: string
  messageID: string
  sessionID: string
  time?: { start: number; end?: number }
  metadata?: Record<string, unknown>
}

export interface TextPart extends PartBase {
  type: 'text'
  text: string
}

export interface ReasoningPart extends PartBase {
  type: 'reasoning'
  text: string
}

export interface ToolState {
  status: 'pending' | 'running' | 'completed' | 'error'
  input?: Record<string, unknown>
  output?: string
  title?: string
  error?: string
  time?: { start: number; end?: number }
}

export interface ToolPart extends PartBase {
  type: 'tool'
  callID: string
  tool: string
  state: ToolState
}

export interface StepStartPart extends PartBase {
  type: 'step-start'
  agent?: string
  model?: { providerID: string; modelID: string; variant?: string } | { id: string; providerID: string; variant: string }
  snapshot?: string
}

export interface StepFinishPart extends PartBase {
  type: 'step-finish'
  reason: string
  cost: number
  tokens?: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

export interface SubtaskPart extends PartBase {
  type: 'subtask'
  prompt: string
  description: string
  agent: string
  model?: { providerID: string; modelID: string }
  command?: string
}

export interface PatchPart extends PartBase {
  type: 'patch'
  hash: string
  files: string[]
}

export interface AgentPart extends PartBase {
  type: 'agent'
  name: string
}

export type ChatPart = TextPart | ReasoningPart | ToolPart | StepStartPart | StepFinishPart | SubtaskPart | PatchPart | AgentPart | PartBase

// ====== Message Types ======

export interface MessageInfo {
  id: string
  role: 'user' | 'assistant'
  sessionID: string
  agent?: string
  model?: { providerID: string; modelID: string; variant?: string }
  tokens?: { input: number; output: number; reasoning?: number }
  time?: { start: number; end?: number }
  summary?: { title?: string; description?: string }
}

export interface ChatMessage {
  info?: MessageInfo
  id?: string
  role: 'user' | 'assistant'
  parts: ChatPart[]
  time?: number
}

export interface ChatSendResult {
  sessionId: string
  reply: string
  parts: ChatPart[]
  tokens?: { input?: number; output?: number }
}
