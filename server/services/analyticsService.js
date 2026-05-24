/**
 * 分析服务 — 使用 SQLite 记录访问、提问、反馈明细
 */
import { getDatabase } from "../storage/database.js"

/**
 * 获取当天日期字符串 YYYY-MM-DD
 * @returns {string}
 */
function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 获取当前时间字符串 YYYY-MM-DD HH:mm:ss
 * @returns {string}
 */
function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19)
}

import { logger } from "../logger/index.js"

/**
 * 记录一次页面访问
 * @param {string} ip - 访客 IP
 * @param {string} [ua=""] - User-Agent
 */
export function recordPageVisit(ip, ua = "") {
  try {
    const db = getDatabase()
    const stmt = db.prepare(
      "INSERT INTO page_visits (ip, user_agent, visit_date, visited_at) VALUES (?, ?, ?, ?)"
    )
    stmt.run(ip, ua.slice(0, 500), today(), now())
  } catch (err) {
    logger.error(`记录页面访问失败: ${ip}`, { error: err.message })
  }
}

/**
 * 记录一次提问
 * @param {string} sessionId - 会话 ID
 * @param {string} ip - 客户端 IP
 * @param {string} content - 问题内容
 * @param {string} [agent=""] - 使用的 Agent
 */
export function recordQuestion(sessionId, ip, content, agent = "") {
  try {
    const db = getDatabase()
    const stmt = db.prepare(
      "INSERT INTO questions (session_id, ip, content, agent, question_date, asked_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    stmt.run(sessionId, ip, content.slice(0, 2000), agent, today(), now())
  } catch (err) {
    logger.error(`记录提问失败: ${sessionId}`, { ip, error: err.message })
  }
}

/**
 * 记录满意度反馈
 * @param {string} sessionId - 会话 ID
 * @param {string} ip - 客户端 IP
 * @param {boolean} satisfied - 是否满意
 * @param {string} [questionContent=""] - 关联问题内容
 * @param {string} [answerContent=""] - 关联回答内容
 */
export function recordFeedback(sessionId, ip, satisfied, questionContent = "", answerContent = "") {
  try {
    const db = getDatabase()
    const stmt = db.prepare(
      "INSERT INTO feedback (session_id, ip, satisfied, question_content, answer_content, feedback_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    stmt.run(sessionId, ip, satisfied ? 1 : 0, questionContent.slice(0, 2000), answerContent.slice(0, 2000), today(), now())
  } catch (err) {
    logger.error(`记录反馈失败: ${sessionId}`, { ip, satisfied, error: err.message })
  }
}

/**
 * 获取指定会话最近一条提问
 * @param {string} sessionId
 * @returns {{ content: string } | undefined}
 */
export function getLatestQuestion(sessionId) {
  const db = getDatabase()
  const row = db.prepare(
    "SELECT content FROM questions WHERE session_id = ? ORDER BY id DESC LIMIT 1"
  ).get(sessionId)
  return row
}

/**
 * 获取每日统计
 * @param {number} [days=14] - 最近天数
 * @returns {Array<{date: string, visits: number, visitors: number, questions: number, likes: number, dislikes: number}>}
 */
export function getDailyStats(days = 14) {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT
      v.visit_date AS date,
      v.visits,
      v.visitors,
      COALESCE(q.questions, 0) AS questions,
      COALESCE(f.likes, 0) AS likes,
      COALESCE(f.dislikes, 0) AS dislikes
    FROM (
      SELECT visit_date, COUNT(*) AS visits, COUNT(DISTINCT ip) AS visitors
      FROM page_visits
      GROUP BY visit_date
    ) v
    LEFT JOIN (
      SELECT question_date, COUNT(*) AS questions
      FROM questions
      GROUP BY question_date
    ) q ON v.visit_date = q.question_date
    LEFT JOIN (
      SELECT feedback_date,
        SUM(CASE WHEN satisfied = 1 THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN satisfied = 0 THEN 1 ELSE 0 END) AS dislikes
      FROM feedback
      GROUP BY feedback_date
    ) f ON v.visit_date = f.feedback_date
    ORDER BY v.visit_date DESC
    LIMIT ?
  `).all(days)
  return rows
}

/**
 * 获取反馈详情列表（含问题和回答内容）
 * @param {number} [limit=50]
 * @param {number} [offset=0]
 * @returns {Array<{id: number, session_id: string, ip: string, satisfied: number, question_content: string, answer_content: string, created_at: string}>}
 */
export function getFeedbackDetail(limit = 50, offset = 0) {
  const db = getDatabase()
  return db.prepare(`
    SELECT id, session_id, ip, satisfied, question_content, answer_content, created_at
    FROM feedback
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)
}

/**
 * 获取访问明细列表
 * @param {number} [limit=500]
 * @param {number} [offset=0]
 * @returns {Array<{id: number, ip: string, user_agent: string, visit_date: string, visited_at: string}>}
 */
export function getVisitsDetail(limit = 500, offset = 0) {
  const db = getDatabase()
  return db.prepare(`
    SELECT id, ip, user_agent, visit_date, visited_at
    FROM page_visits
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)
}

/**
 * 获取提问明细列表
 * @param {number} [limit=500]
 * @param {number} [offset=0]
 * @returns {Array<{id: number, session_id: string, ip: string, content: string, agent: string, question_date: string, asked_at: string}>}
 */
export function getQuestionsDetail(limit = 500, offset = 0) {
  const db = getDatabase()
  return db.prepare(`
    SELECT id, session_id, ip, content, agent, question_date, asked_at
    FROM questions
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)
}

/**
 * 获取基础统计数据（兼容原 statsService 格式）
 * @returns {{ visitors: number, totalQuestions: number, totalFeedback: number, todayVisits: number, todayQuestions: number }}
 */
export function getBasicStats() {
  const db = getDatabase()
  const visitors = db.prepare("SELECT COUNT(DISTINCT ip) AS c FROM page_visits").get()
  const totalQuestions = db.prepare("SELECT COUNT(*) AS c FROM questions").get()
  const totalFeedback = db.prepare("SELECT COUNT(*) AS c FROM feedback").get()
  const todayVisits = db.prepare(
    "SELECT COUNT(*) AS c FROM page_visits WHERE visit_date = ?"
  ).get(today())
  const todayQuestions = db.prepare(
    "SELECT COUNT(*) AS c FROM questions WHERE question_date = ?"
  ).get(today())
  return {
    visitors: visitors.c,
    totalQuestions: totalQuestions.c,
    totalFeedback: totalFeedback.c,
    todayVisits: todayVisits.c,
    todayQuestions: todayQuestions.c,
  }
}
