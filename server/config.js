import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const cfg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf-8")
)

/** @type {number} HTTP 服务端口，环境变量 PORT 优先 */
export const PORT = process.env.PORT || cfg.server.port
/** @type {string} HTTP 服务主机地址，环境变量 HOSTNAME 优先 */
export const HOSTNAME = process.env.HOSTNAME || cfg.server.hostname
/** @type {number} OpenCode 子进程端口 */
export const OPENCODE_PORT = cfg.opencode.port
/** @type {string} OpenCode 子进程主机地址 */
export const OPENCODE_HOST = cfg.opencode.hostname

/** @type {string} 日志文件目录 */
export const LOG_DIR = path.join(__dirname, "..", "logs")
/** @type {number} 日志文件最大字节数 */
export const LOG_MAX_SIZE = cfg.log.maxFileSize
/** @type {number} 日志文件最大归档数 */
export const LOG_MAX_ARCHIVES = cfg.log.maxArchives

/** @type {string} 主模型名称，环境变量 MODEL 优先 */
export const MODEL = process.env.MODEL || cfg.model
/** @type {string} 轻量模型名称，环境变量 SMALL_MODEL 优先 */
export const SMALL_MODEL = process.env.SMALL_MODEL || cfg.small_model
/** @type {Record<string, unknown>} AI 提供商配置 */
export const PROVIDER = cfg.provider || {}

/** @type {Array<{label: string, agent: string}>} 可选 AI Agent 列表 */
export const AGENT_OPTIONS = cfg.agentOptions || []

/** @type {boolean} 是否为生产环境 */
export const isProduction = process.env.NODE_ENV === "production"

const distDir = path.join(__dirname, "..", "dist")
const publicDir = path.join(__dirname, "..", "public")
/** @type {string} 静态文件目录，优先 dist/，回退 public/ */
export const PUBLIC_DIR = fs.existsSync(path.join(distDir, "index.html"))
  ? distDir
  : publicDir

// SDK Config — 优先环境变量覆盖，其次 config.json
/**
 * 从环境变量覆盖 JSON 类型配置
 * @param {string} key - 环境变量名
 * @param {unknown} fallback - config.json 中的默认值
 * @returns {unknown} 环境变量解析值或默认值
 */
function overrideJSON(key, fallback) {
  const raw = process.env[key]
  if (raw) {
    try { return JSON.parse(raw) } catch { /* 解析失败，使用 config.json 默认值 */ }
  }
  return fallback
}

/**
 * 从环境变量覆盖布尔类型配置
 * @param {string} key - 环境变量名
 * @param {boolean} fallback - config.json 中的默认值
 * @returns {boolean} 环境变量值或默认值
 */
function overrideBool(key, fallback) {
  if (process.env[key] === "true") return true
  if (process.env[key] === "false") return false
  return fallback
}

/**
 * 构建 OpenCode SDK 配置对象，环境变量优先于 config.json
 * @returns {import("@opencode-ai/sdk/v2").OpenCodeConfig} OpenCode 配置
 */
export function buildOpenCodeConfig() {
  return {
    model: MODEL,
    small_model: SMALL_MODEL,
    logLevel: process.env.OPENCODE_LOG_LEVEL || cfg.logLevel,
    autoupdate: overrideBool("OPENCODE_AUTOUPDATE", cfg.autoupdate),
    agent: overrideJSON("OPENCODE_AGENT", cfg.agent),
    tools: overrideJSON("OPENCODE_TOOLS", cfg.tools),
    compaction: overrideJSON("OPENCODE_COMPACTION", cfg.compaction),
    tool_output: cfg.tool_output,
    snapshot: overrideBool("OPENCODE_SNAPSHOT", cfg.snapshot),
    provider: PROVIDER,
  }
}
