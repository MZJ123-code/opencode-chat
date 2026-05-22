export interface SessionListItem {
  sessionId: string
  title: string
  createdAt: number
  messageCount: number
  agent: string | null
}

export interface SessionCreateResult {
  sessionId: string
  title: string
  agent: string | null
}
