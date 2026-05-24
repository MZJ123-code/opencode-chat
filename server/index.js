import express from "express"
import path from "path"
import os from "os"
import { PORT, HOSTNAME, PUBLIC_DIR, isProduction, MODEL, SMALL_MODEL, AGENT_OPTIONS } from "./config.js"
import { logger } from "./logger/index.js"
import { createApp } from "./app.js"
import { startOpenCode, getServer } from "./services/opencode.js"
import { restoreStats, saveStats, saveStatsSync } from "./services/statsService.js"

restoreStats()
await startOpenCode()

const app = createApp()

// 静态文件服务 & SPA fallback
app.use(express.static(PUBLIC_DIR))
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"))
})

// 启动 HTTP 服务
app.listen(PORT, HOSTNAME, () => {
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

// 优雅退出
function shutdown() {
  logger.info("正在关闭服务...")
  saveStatsSync()
  try {
    const server = getServer()
    server.close?.()
  } catch {
    // Server may not be initialized yet
  }
  logger.info("服务已关闭")
  process.exit(0)
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
