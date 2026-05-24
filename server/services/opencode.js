import { createOpencode } from "@opencode-ai/sdk/v2"
import { OPENCODE_PORT, OPENCODE_HOST, buildOpenCodeConfig, MODEL, SMALL_MODEL, AGENT_OPTIONS, PROVIDER } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("@opencode-ai/sdk/v2").OpencodeClient|null} */
let _client = null
/** @type {import("@opencode-ai/sdk/v2").OpencodeServer|null} */
let _server = null

export async function startOpenCode() {
  logger.info("正在启动 OpenCode Server...")
  const start = Date.now()

  const cfg = buildOpenCodeConfig()

  logger.info("OpenCode 配置信息", {
    model: MODEL,
    small_model: SMALL_MODEL,
    provider_keys: Object.keys(PROVIDER).length > 0 ? Object.keys(PROVIDER) : undefined,
    agents: AGENT_OPTIONS.map(a => ({ label: a.label, agent: a.agent })),
    tools: Object.entries(cfg.tools || {})
      .filter(([, v]) => v)
      .map(([k]) => k),
    autoupdate: cfg.autoupdate,
    compaction_auto: cfg.compaction?.auto,
    logLevel: cfg.logLevel,
  })

  const result = await createOpencode({
    port: OPENCODE_PORT,
    hostname: OPENCODE_HOST,
    config: cfg,
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

export function killOpenCode() {
  if (_server) {
    try { _server.process?.stdout?.removeAllListeners?.() } catch {}
    try { _server.process?.stderr?.removeAllListeners?.() } catch {}
    try { _server.close?.() } catch {}
    try { _server.process?.kill?.() } catch {}
    _client = null
    _server = null
  }
}

/**
 * @returns {import("@opencode-ai/sdk/v2").OpencodeClient}
 */
export function getClient() {
  if (!_client) throw new Error("OpenCode client not initialized")
  return _client
}

/**
 * @returns {import("@opencode-ai/sdk/v2").OpencodeServer}
 */
export function getServer() {
  if (!_server) throw new Error("OpenCode server not initialized")
  return _server
}
