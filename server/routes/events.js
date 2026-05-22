import { Router } from "express"
import { getClient } from "../services/opencode.js"
import { logger } from "../logger/index.js"

const router = Router()

router.get("/", async (req, res) => {
  const client = getClient()

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })

  let closed = false

  req.on("close", () => {
    closed = true
  })

  try {
    const events = await client.event.subscribe()

    for await (const event of events.stream) {
      if (closed) break
      const data = JSON.stringify(event)
      res.write(`event: message\ndata: ${data}\n\n`)
    }
  } catch (err) {
    if (!closed) {
      logger.warn(`SSE stream error: ${err.message}`)
    }
  } finally {
    if (!closed) {
      res.end()
    }
  }
})

export default router
