import { Router } from "express"
import { getStats } from "../services/statsService.js"
import { getDailyStats, getFeedbackDetail, getBasicStats, getVisitsDetail, getQuestionsDetail, recordPageVisit } from "../services/analyticsService.js"
import { MODEL } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 统计路由 */
const router = Router()

/**
 * GET /api/stats — 获取平台使用统计
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/", (req, res) => {
  const data = getStats()
  logger.info(`查询统计: ${req.clientIP}`, {
    ...data,
    model: MODEL,
  })
  res.json(data)
})

/**
 * GET /api/stats/daily — 获取每日统计明细（看板用）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/daily", (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 90)
  logger.info(`查询每日统计: ${req.clientIP}`, { days })
  const daily = getDailyStats(days)
  const basic = getBasicStats()
  res.json({ basic, daily })
})

/**
 * GET /api/stats/feedback-detail — 获取反馈详情列表（看板用）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/feedback-detail", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200)
  const offset = Math.max(parseInt(req.query.offset) || 0, 0)
  const list = getFeedbackDetail(limit, offset)
  res.json(list)
})

/**
 * GET /api/stats/visits — 获取访问明细列表（看板用）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/visits", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 2000)
  const offset = Math.max(parseInt(req.query.offset) || 0, 0)
  const list = getVisitsDetail(limit, offset)
  res.json(list)
})

/**
 * GET /api/stats/questions — 获取提问明细列表（看板用）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/questions", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 2000)
  const offset = Math.max(parseInt(req.query.offset) || 0, 0)
  const list = getQuestionsDetail(limit, offset)
  res.json(list)
})

/**
 * POST /api/stats/visit — 记录一次页面访问
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.post("/visit", (req, res) => {
  try {
    const ip = req.clientIP
    const ua = req.headers["user-agent"] || ""
    recordPageVisit(ip, ua)
    res.json({ ok: true })
  } catch (err) {
    logger.error(`记录页面访问失败: ${req.clientIP}`, { error: err.message })
    res.json({ ok: true })
  }
})

export default router
