import express from "express"
import { clientIPMiddleware } from "./middleware/clientIP.js"
import { requestLogger } from "./middleware/requestLogger.js"
import { rateLimiter } from "./middleware/rateLimiter.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { registerRoutes } from "./routes/index.js"

export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(clientIPMiddleware)
  app.use(requestLogger)
  app.use("/api", rateLimiter)
  registerRoutes(app)
  app.use(errorHandler)
  return app
}
