import { Router } from "express"
import { getStats } from "../services/statsService.js"
import { logger } from "../logger/index.js"

const router = Router()

router.get("/", (req, res) => {
  const data = getStats()
  logger.info(`查询统计: ${req.clientIP}`, data)
  res.json(data)
})

export default router
