import { createOpencode } from "@opencode-ai/sdk/v2"
import { OPENCODE_PORT, OPENCODE_HOST, buildOpenCodeConfig, MODEL, SMALL_MODEL, AGENT_OPTIONS, PROVIDER } from "../config.js"
import { logger } from "../logger/index.js"

/** @type {import("@opencode-ai/sdk/v2").OpencodeClient|null} */
let _client = null
/** @type {import("@opencode-ai/sdk/v2").OpencodeServer|null} */
let _server = null

/** 常见 API Key 环境变量名列表 */
const API_KEY_ENVVARS = [
  "DEEPSEEK_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY", "GROQ_API_KEY", "TOGETHER_API_KEY",
  "MISTRAL_API_KEY", "PERPLEXITY_API_KEY", "OPENROUTER_API_KEY",
]

/**
 * 启动前检查 Provider API Key 是否配置
 * 仅输出警告，不阻止启动——用户在运行时配置也合法
 */
function checkProviderConfig() {
  const configured = API_KEY_ENVVARS.filter(k => process.env[k])
  if (configured.length === 0 && Object.keys(PROVIDER).length === 0) {
    logger.warn("未检测到任何 API Key 环境变量（如 DEEPSEEK_API_KEY），模型调用可能失败", {
      hint: "请设置对应模型的 API Key，或在 config.json 中配置 provider",
      model: MODEL,
    })
  } else {
    logger.info("检测到 API Key 环境变量", { keys: configured })
  }
}

/**
 * 启动 OpenCode 子进程，创建 SDK 客户端和服务端连接
 * @returns {Promise<{client: import("@opencode-ai/sdk/v2").OpencodeClient, server: import("@opencode-ai/sdk/v2").OpencodeServer}>}
 */
export async function startOpenCode() {
  logger.info("正在启动 OpenCode Server...")
  const start = Date.now()

  checkProviderConfig()

  const cfg = buildOpenCodeConfig()

  logger.info("OpenCode 配置信息", {
    model: MODEL,
    small_model: SMALL_MODEL,
    provider_keys: Object.keys(PROVIDER).length > 0 ? Object.keys(PROVIDER) : undefined,
    agents: AGENT_OPTIONS.map(a => ({ label: a.label, agent: a.agent, directory: a.directory || "(default)" })),
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

/**
 * 关闭 OpenCode 子进程，清理客户端和服务端引用
 */
export function killOpenCode() {
  if (_server) {
    logger.info("正在关闭 OpenCode Server...")
    try { _server.process?.stdout?.removeAllListeners?.() } catch {}
    try { _server.process?.stderr?.removeAllListeners?.() } catch {}
    try { _server.close?.() } catch {}
    try { _server.process?.kill?.() } catch {}
    _client = null
    _server = null
    logger.info("OpenCode Server 已关闭")
  }
}

/**
 * 获取 OpenCode SDK 客户端实例
 * @returns {import("@opencode-ai/sdk/v2").OpencodeClient} SDK 客户端
 * @throws {Error} 客户端未初始化时抛出
 */
export function getClient() {
  if (!_client) throw new Error("OpenCode client not initialized")
  return _client
}
