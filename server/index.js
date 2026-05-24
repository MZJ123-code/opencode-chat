import express from "express"
import path from "path"
import os from "os"
import { PORT, HOSTNAME, PUBLIC_DIR, isProduction, MODEL, SMALL_MODEL, AGENT_OPTIONS } from "./config.js"
import { logger } from "./logger/index.js"
import { createApp } from "./app.js"
import { startOpenCode, killOpenCode } from "./services/opencode.js"
import { restoreStats, saveStatsSync } from "./services/statsService.js"
import { initDatabase } from "./storage/database.js"

try {
  initDatabase()
  logger.info("数据库初始化完成")
} catch (err) {
  logger.error(`数据库初始化失败: ${err.message}`, { stack: err.stack })
  process.exit(1)
}
try {
  restoreStats()
  logger.info("统计数据已从磁盘恢复")
} catch (err) {
  logger.warn(`统计数据恢复失败（首次启动或无数据）: ${err.message}`)
}
try {
  await startOpenCode()
} catch (err) {
  logger.error("OpenCode 启动失败，无法继续运行", { error: err.message, stack: err.stack })
  process.exit(1)
}

const app = createApp()

// 静态文件服务 & SPA fallback
app.use(express.static(PUBLIC_DIR))
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    logger.warn(`API 路由未命中，返回 SPA fallback: ${req.method} ${req.path}`, { ip: req.clientIP })
  }
  res.sendFile(path.join(PUBLIC_DIR, "index.html"))
})

// 启动 HTTP 服务
let httpServer
httpServer = app.listen(PORT, HOSTNAME, () => {
  const banner = [
    `\n========================================`,
    `  AI 咨询平台已启动`,
    `  本机访问: http://localhost:${PORT}`,
    `  环境: ${isProduction ? "production" : "development"}`,
    `  静态目录: ${PUBLIC_DIR}`,
    `  按 Ctrl+C 停止`,
    `========================================\n`,
  ]
  console.log(banner.join("\n"))
  logger.info(`服务启动成功, 端口: ${PORT}`)
  logger.info("环境信息", {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    pid: process.pid,
    model: MODEL,
    small_model: SMALL_MODEL,
    agents: AGENT_OPTIONS.map(a => ({ label: a.label, agent: a.agent })),
    is_production: isProduction,
  })
})

/**
 * 优雅关闭服务：保存统计、关闭 OpenCode 进程、关闭 HTTP 服务
 */
function shutdown() {
  logger.info("正在关闭服务...")
  saveStatsSync()
  killOpenCode()
  if (httpServer) {
    httpServer.close(() => {
      logger.info("HTTP 服务已关闭")
      process.exit(0)
    })
    // 5 秒超时强制退出
    setTimeout(() => process.exit(0), 5000).unref()
  } else {
    process.exit(0)
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
process.on("uncaughtException", (err) => {
  logger.error(`未捕获异常: ${err.message}`, { stack: err.stack })
  shutdown()
})
process.on("unhandledRejection", (reason) => {
  logger.error("未处理的 Promise 拒绝", { reason: String(reason) })
})
