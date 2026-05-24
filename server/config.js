import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const cfg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf-8")
)

export const PORT = process.env.PORT || cfg.server.port
export const HOSTNAME = process.env.HOSTNAME || cfg.server.hostname
export const OPENCODE_PORT = cfg.opencode.port
export const OPENCODE_HOST = cfg.opencode.hostname

export const LOG_DIR = path.join(__dirname, "..", "logs")
export const LOG_MAX_SIZE = cfg.log.maxFileSize
export const LOG_MAX_ARCHIVES = cfg.log.maxArchives

export const MODEL = process.env.MODEL || cfg.model
export const SMALL_MODEL = process.env.SMALL_MODEL || cfg.small_model
export const PROVIDER = cfg.provider || {}

export const AGENT_OPTIONS = cfg.agentOptions || []

export const isProduction = process.env.NODE_ENV === "production"

const distDir = path.join(__dirname, "..", "dist")
const publicDir = path.join(__dirname, "..", "public")
export const PUBLIC_DIR = fs.existsSync(path.join(distDir, "index.html"))
  ? distDir
  : publicDir

// SDK Config — 优先环境变量覆盖，其次 config.json
function overrideJSON(key, fallback) {
  const raw = process.env[key]
  if (raw) {
    try { return JSON.parse(raw) } catch { /* 解析失败，使用 config.json 默认值 */ }
  }
  return fallback
}

function overrideBool(key, fallback) {
  if (process.env[key] === "true") return true
  if (process.env[key] === "false") return false
  return fallback
}

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
