import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { MODEL } from "../config.js"
import { logger } from "../logger/index.js"
import { AppError } from "../middleware/errorHandler.js"

/** @type {import("express").Router} 权限路由：POST /respond, /question/reply, /question/reject */
const router = Router()

/**
 * POST /api/permission/respond — 响应权限请求（允许/拒绝）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/respond", async (req, res, next) => {
  try {
    const { requestID, reply, message } = req.body
    if (!requestID || !["once", "always", "reject"].includes(reply)) {
      throw new AppError("缺少必要参数", "MISSING_PARAMS", 400)
    }

    const client = getClient()
    logger.info(`权限响应: id=${requestID}`, {
      reply,
      has_message: !!message,
      ip: req.clientIP,
      model: MODEL,
    })
    await client.permission.reply({
      requestID,
      reply,
      message: message || "",
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/permission/question/reply — 回复问题（带答案）
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/question/reply", async (req, res, next) => {
  try {
    const { requestID, answers } = req.body
    if (!requestID) {
      throw new AppError("缺少 requestID", "MISSING_REQUEST_ID", 400)
    }
    if (!Array.isArray(answers)) {
      throw new AppError("answers 必须是数组", "INVALID_ANSWERS", 400)
    }

    const client = getClient()
    logger.info(`问题回复: id=${requestID}`, {
      answer_count: answers?.length || 0,
      ip: req.clientIP,
      model: MODEL,
    })
    await client.question.reply({ requestID, answers })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/permission/question/reject — 跳过问题
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
router.post("/question/reject", async (req, res, next) => {
  try {
    const { requestID } = req.body
    if (!requestID) {
      throw new AppError("缺少 requestID", "MISSING_REQUEST_ID", 400)
    }

    const client = getClient()
    logger.info(`问题跳过: id=${requestID}`, { ip: req.clientIP, model: MODEL })
    await client.question.reject({ requestID })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
