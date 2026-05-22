import { Router } from "express"
import { getClient } from "../services/opencode.js"
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
    logger.info(`权限响应: id=${requestID} reply=${reply}`)
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

export default router
