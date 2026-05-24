import { Router } from "express"
import { AGENT_OPTIONS } from "../config.js"

/** @type {import("express").Router} Agent 列表路由：GET /api/agents */
const router = Router()

/**
 * GET /api/agents — 获取可用 AI Agent 列表
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
router.get("/", (req, res) => {
  res.json(AGENT_OPTIONS)
})

export default router
