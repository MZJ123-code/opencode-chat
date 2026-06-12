import express from "express"
import { clientIPMiddleware } from "./middleware/clientIP.js"
import { userTokenMiddleware } from "./middleware/userToken.js"
import { requestLogger } from "./middleware/requestLogger.js"
import { performanceLogger } from "./middleware/performanceLogger.js"
import { rateLimiter } from "./middleware/rateLimiter.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { registerRoutes } from "./routes/index.js"

/**
 * 创建并配置 Express 应用实例
 * 中间件链顺序：json → clientIP → userToken → requestLogger → rateLimiter(/api) → routes → errorHandler
 * @returns {import("express").Express} 配置完成的 Express 应用
 */
export function createApp() {
  const app = express()
  app.use(express.json())
  app.use(clientIPMiddleware)
  app.use(userTokenMiddleware)
  app.use(requestLogger)
  app.use(performanceLogger)
  app.use("/api", rateLimiter)
  registerRoutes(app)
  app.use(errorHandler)
  return app
}
