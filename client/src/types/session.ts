export interface SessionListItem {
  sessionId: string
  title: string
  createdAt: number
  messageCount: number
}

export interface SessionCreateResult {
  sessionId: string
  title: string
}
