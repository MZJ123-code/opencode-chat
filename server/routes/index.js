import sessionsRouter from "./sessions.js"
import chatRouter from "./chat.js"
import eventsRouter from "./events.js"
import messagesRouter from "./messages.js"
import feedbackRouter from "./feedback.js"
import statsRouter from "./stats.js"
import permissionRouter from "./permission.js"
import agentsRouter from "./agents.js"
import abortRouter from "./abort.js"

export function registerRoutes(app) {
  app.use("/api/sessions", sessionsRouter)
  app.use("/api/sessions", abortRouter)
  app.use("/api/chat", chatRouter)
  app.use("/api/events", eventsRouter)
  app.use("/api/sessions", messagesRouter)
  app.use("/api/sessions", feedbackRouter)
  app.use("/api/stats", statsRouter)
  app.use("/api/permission", permissionRouter)
  app.use("/api/agents", agentsRouter)
}
