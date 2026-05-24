import { api } from './client'

/** AI Agent 选项 */
export interface AgentOption {
  /** 显示名称 */
  label: string
  /** 描述信息 */
  description: string
  /** Agent 标识 */
  agent: string
}

/**
 * 获取可用的 AI Agent 列表
 * @returns Agent 选项列表
 */
export function fetchAgents() {
  return api<AgentOption[]>('GET', '/api/agents')
}
