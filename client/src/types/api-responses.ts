/**
 * 前后端共享 API 响应类型
 * 后端 (JS) 参考此文件确保返回结构一致
 * 前端 (TS) 导入此文件获得类型安全
 */

// ====== Sessions ======

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

// ====== Stats ======

export interface StatsResponse {
  visitors: number
  totalSessions: number
  activeSessions: number
  totalQuestions: number
  satisfied: number
  unsatisfied: number
  blockedAccess: number
  agentDistribution: Record<string, number>
}

export interface BasicStats {
  visitors: number
  totalQuestions: number
  totalFeedback: number
  todayVisits: number
  todayQuestions: number
}

export interface DailyStatsResponse {
  basic: BasicStats
  daily: DailyStatsItem[]
}

export interface DailyStatsItem {
  date: string
  visits: number
  visitors: number
  questions: number
  likes: number
  dislikes: number
}

export interface VisitDetailItem {
  id: number
  ip: string
  user_agent: string
  visit_date: string
  visited_at: string
}

export interface QuestionDetailItem {
  id: number
  session_id: string
  ip: string
  content: string
  agent: string
  question_date: string
  asked_at: string
}

export interface FeedbackDetailItem {
  id: number
  session_id: string
  ip: string
  satisfied: number
  question_content: string
  answer_content: string
  created_at: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

// ====== Health ======

export interface HealthResponse {
  status: "ok" | "degraded"
  uptime: number
  opencode: "ok" | "error"
  database: "ok" | "error"
  memory: { heapUsed: number; heapTotal: number }
  pid: number
}

// ====== Chat ======

export interface ChatAsyncResult {
  ok: true
  sessionId: string
}

export interface FeedbackResult {
  ok: true
}

// ====== Agents ======

export interface AgentOption {
  label: string
  description: string
  agent: string
}
