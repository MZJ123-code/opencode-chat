import { api } from './client'
import type { AgentOption } from '../types/api-responses'

/**
 * 获取可用的 AI Agent 列表
 * @returns Agent 选项列表
 */
export function fetchAgents() {
  return api<AgentOption[]>('GET', '/api/agents')
}
