import { api } from './client'
import type { DailyStatsResponse, VisitDetailItem, QuestionDetailItem, FeedbackDetailItem, PaginatedResponse } from '../types/api-responses'

/**
 * 获取每日统计数据
 * @param days - 最近天数，默认 14
 */
export function fetchDailyStats(days = 14) {
  return api<DailyStatsResponse>('GET', `/api/stats/daily?days=${days}`)
}

/**
 * 获取反馈详情列表（分页）
 * @param limit - 每页数量，默认 200
 * @param offset - 偏移量，默认 0
 */
export function fetchFeedbackDetail(limit = 200, offset = 0) {
  return api<PaginatedResponse<FeedbackDetailItem>>('GET', `/api/stats/feedback-detail?limit=${limit}&offset=${offset}`)
}

/**
 * 获取访问明细列表（分页）
 * @param limit - 每页数量，默认 200
 * @param offset - 偏移量，默认 0
 */
export function fetchVisitsDetail(limit = 200, offset = 0) {
  return api<PaginatedResponse<VisitDetailItem>>('GET', `/api/stats/visits?limit=${limit}&offset=${offset}`)
}

/**
 * 获取提问明细列表（分页）
 * @param limit - 每页数量，默认 200
 * @param offset - 偏移量，默认 0
 */
export function fetchQuestionsDetail(limit = 200, offset = 0) {
  return api<PaginatedResponse<QuestionDetailItem>>('GET', `/api/stats/questions?limit=${limit}&offset=${offset}`)
}

/**
 * 记录一次页面访问
 */
export function recordVisit() {
  return api<{ ok: boolean }>('POST', '/api/stats/visit')
}
