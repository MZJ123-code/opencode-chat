import { createOpencode } from "@opencode-ai/sdk"
import { OPENCODE_PORT, OPENCODE_HOST, buildOpenCodeConfig } from "../config.js"
import { logger } from "../logger/index.js"

let _client = null
let _server = null

export async function startOpenCode() {
  logger.info("正在启动 OpenCode Server...")
  const start = Date.now()

  const result = await createOpencode({
    port: OPENCODE_PORT,
    hostname: OPENCODE_HOST,
    config: buildOpenCodeConfig(),
  })

  _client = result.client
  _server = result.server

  logger.info(`OpenCode Server 已启动: ${_server.url}`, {
    startup_duration_ms: Date.now() - start,
    url: _server.url,
  })

  _server.process?.stdout?.on("data", (chunk) => {
    logger.info(`[opencode stdout] ${chunk.toString().trim()}`)
  })
  _server.process?.stderr?.on("data", (chunk) => {
    logger.warn(`[opencode stderr] ${chunk.toString().trim()}`)
  })

  return { client: _client, server: _server }
}

export function getClient() {
  if (!_client) throw new Error("OpenCode client not initialized")
  return _client
}

export function getServer() {
  if (!_server) throw new Error("OpenCode server not initialized")
  return _server
}
