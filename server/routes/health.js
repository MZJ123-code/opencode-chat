import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { getDatabase } from "../storage/database.js"

const router = Router()

/**
 * GET /api/health — 健康检查端点
 * 返回 OpenCode 进程状态、数据库连接、进程资源等信息
 */
router.get("/health", (req, res) => {
  let opencodeStatus = "unknown"
  let dbStatus = "unknown"
  try {
    getClient()
    opencodeStatus = "ok"
  } catch { opencodeStatus = "error" }
  try {
    getDatabase()
    dbStatus = "ok"
  } catch { dbStatus = "error" }
  res.json({
    status: opencodeStatus === "ok" && dbStatus === "ok" ? "ok" : "degraded",
    uptime: process.uptime(),
    opencode: opencodeStatus,
    database: dbStatus,
    memory: process.memoryUsage(),
    pid: process.pid,
  })
})

export default router
