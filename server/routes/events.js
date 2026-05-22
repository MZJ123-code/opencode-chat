import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"

const router = Router()

router.get("/", async (req, res) => {
  const client = getClient()
  const ip = req.clientIP

  logger.info(`SSE 事件流连接: ${ip}`)

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })

  let closed = false
  let eventCount = 0

  req.on("close", () => {
    closed = true
    logger.info(`SSE 事件流关闭: ${ip}`, { events_delivered: eventCount })
  })

  try {
    const events = await client.event.subscribe()

    for await (const event of events.stream) {
      if (closed) break
      eventCount++
      const data = JSON.stringify(event)
      res.write(`event: message\ndata: ${data}\n\n`)

      // Log key event types for traceability
      if (event.type === "tool" || event.type === "step-start" || event.type === "step-finish" || event.type === "subtask") {
        const logData = { sessionID: event.sessionID, type: event.type }
        if (event.type === "step-start" && event.agent) logData.agent = event.agent
        if (event.type === "step-start" && event.model) logData.model = event.model
        if (event.type === "subtask") {
          logData.agent = event.agent
          logData.description = event.description
        }
        if (event.type === "tool") {
          logData.tool = event.tool
          logData.state = event.state
        }
        if (event.type === "step-finish" && event.tokens) {
          logData.tokens = event.tokens
        }
        logger.info(`SSE 事件: ${event.type}`, logData)
      }
    }
  } catch (err) {
    if (!closed) {
      logger.warn(`SSE stream error: ${err.message}`, { ip, events_delivered: eventCount })
    }
  } finally {
    if (!closed) {
      res.end()
    }
  }
})

export default router
