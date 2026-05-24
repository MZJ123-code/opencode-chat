import { api } from './client'

/** 权限请求数据结构 */
export interface PermissionRequest {
  /** 请求 ID */
  id: string
  /** 会话 ID */
  sessionID: string
  /** 权限类型 */
  permission: string
  /** 文件路径模式 */
  patterns: string[]
  /** 附加元数据 */
  metadata: Record<string, unknown>
  /** 始终允许的操作列表 */
  always: string[]
  /** 关联的工具调用信息 */
  tool?: { messageID: string; callID: string }
}

/**
 * 回复权限问题
 * @param requestID - 请求 ID
 * @param answers - 回答列表
 */
export async function replyQuestion(requestID: string, answers: string[][]): Promise<void> {
  await api('POST', '/api/permission/question/reply', { requestID, answers })
}

/**
 * 跳过/拒绝权限问题
 * @param requestID - 请求 ID
 */
export async function rejectQuestion(requestID: string): Promise<void> {
  await api('POST', '/api/permission/question/reject', { requestID })
}
