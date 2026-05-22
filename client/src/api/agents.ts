import { api } from './client'

export interface AgentOption {
  label: string
  description: string
  agent: string
}

export function fetchAgents() {
  return api<AgentOption[]>('GET', '/api/agents')
}
