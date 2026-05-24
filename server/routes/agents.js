import { Router } from "express"
import { AGENT_OPTIONS } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("express").Router} Agent 列表路由：GET /api/agents */
const router = Router()

/**
 * GET /api/agents — 获取可用 AI Agent 列表
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/", (req, res) => {
  logger.info(`查询 Agent 列表: ${req.clientIP}`, { count: AGENT_OPTIONS.length })
  res.json(AGENT_OPTIONS)
})

export default router
