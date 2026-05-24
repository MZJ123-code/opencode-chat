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
  const eventTypeCount = new Map()

  req.on("close", () => {
    closed = true
    logger.info(`SSE 事件流关闭: ${ip}`, {
      events_delivered: eventCount,
      event_types: Object.fromEntries(eventTypeCount),
    })
  })

  try {
    const events = await client.event.subscribe()

    for await (const event of events.stream) {
      if (closed) break
      eventCount++

      // Track all event types
      const etype = event.type || "unknown"
      eventTypeCount.set(etype, (eventTypeCount.get(etype) || 0) + 1)

      // Log all events for debugging (especially child session events)
      const props = event.properties || {}
      const sessionID = props.sessionID || event.sessionID || "?"
      const partType = props.part?.type
      const toolName = props.part?.tool || props.tool
      const hasParentID = props.info?.parentID

      // Log key event types with details
      if (
        event.type?.startsWith("session.") ||
        event.type?.startsWith("message.") ||
        event.type?.startsWith("permission.") ||
        event.type?.startsWith("question.")
      ) {
        const logData = {
          sessionID,
          eventType: event.type,
          seq: eventCount,
          ...(partType ? { partType } : {}),
          ...(toolName ? { tool: toolName } : {}),
          ...(hasParentID ? { parentID: hasParentID } : {}),
        }
        logger.info(`SSE: ${event.type}`, logData)
      }

      const data = JSON.stringify(event)
      res.write(`event: message\ndata: ${data}\n\n`)
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
