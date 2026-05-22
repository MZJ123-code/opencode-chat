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

export const isProduction = process.env.NODE_ENV === "production"

const distDir = path.join(__dirname, "..", "dist")
const publicDir = path.join(__dirname, "..", "public")
export const PUBLIC_DIR = fs.existsSync(path.join(distDir, "index.html"))
  ? distDir
  : publicDir

// SDK Config — passed to createOpencode({ config })
export function buildOpenCodeConfig() {
  return {
    model: process.env.MODEL || cfg.model,
    small_model: cfg.small_model,
    logLevel: cfg.logLevel,
    autoupdate: cfg.autoupdate,
    agent: cfg.agent,
    tools: cfg.tools,
    compaction: cfg.compaction,
    tool_output: cfg.tool_output,
    snapshot: cfg.snapshot,
    provider: cfg.provider,
  }
}
