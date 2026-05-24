import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { MODEL } from "../config.js"
import { logger } from "../logger/index.js"

const router = Router()

// Respond to a permission request
router.post("/respond", async (req, res, next) => {
  try {
    const { requestID, reply, message } = req.body
    if (!requestID || !["once", "always", "reject"].includes(reply)) {
      return res.status(400).json({ error: "Missing or invalid fields" })
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

// Reply to a question (with answers)
router.post("/question/reply", async (req, res, next) => {
  try {
    const { requestID, answers } = req.body
    if (!requestID) {
      return res.status(400).json({ error: "Missing requestID" })
    }
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers 必须是数组" })
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

// Reject / skip a question
router.post("/question/reject", async (req, res, next) => {
  try {
    const { requestID } = req.body
    if (!requestID) {
      return res.status(400).json({ error: "Missing requestID" })
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
