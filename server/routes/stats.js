import { Router } from "express"
import { getStats } from "../services/statsService.js"
import { MODEL } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} 统计路由：GET /api/stats */
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

export default router
