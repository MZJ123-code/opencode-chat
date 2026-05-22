import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import { LOG_DIR, LOG_MAX_SIZE, LOG_MAX_ARCHIVES } from "../config.js"

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

const serverLog = path.join(LOG_DIR, "server.log")
const ts = () => new Date().toISOString().replace("T", " ").slice(0, 23)
const archiveName = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return path.join(LOG_DIR,
    `server-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.log`)
}

let queue = Promise.resolve()

function enqueue(fn) {
  queue = queue.then(fn).catch(() => {})
}

async function maybeArchive() {
  let stat
  try { stat = await fsp.stat(serverLog) } catch { return }
  if (stat.size < LOG_MAX_SIZE) return

  const dest = archiveName()
  await fsp.rename(serverLog, dest)

  // prune old archives
  const entries = await fsp.readdir(LOG_DIR)
  const archives = entries
    .filter(f => f.startsWith("server-") && f.endsWith(".log"))
    .sort()
  while (archives.length > LOG_MAX_ARCHIVES) {
    const oldest = archives.shift()
    await fsp.unlink(path.join(LOG_DIR, oldest)).catch(() => {})
  }
}

function append(line, level) {
  const prefix =
    level === "ERROR" ? "\x1b[31m" : level === "WARN" ? "\x1b[33m" : level === "INFO" ? "\x1b[36m" : "\x1b[90m"
  console.log(`${prefix}${line}\x1b[0m`)
  enqueue(() => fsp.appendFile(serverLog, line + "\n").then(maybeArchive))
}

function write(level, message, data) {
  const t = ts()
  let line = `[${t}] [${level}] ${message}`
  if (data !== undefined) {
    line += " | " + (typeof data === "object" ? JSON.stringify(data) : data)
  }
  append(line, level)
}

// startup: archive existing oversized server.log
;(async function () {
  try {
    const stat = await fsp.stat(serverLog)
    if (stat.size > LOG_MAX_SIZE) {
      const dest = archiveName()
      await fsp.rename(serverLog, dest)
    }
  } catch {}
})()

export const logger = {
  info(msg, data)   { write("INFO", msg, data) },
  warn(msg, data)   { write("WARN", msg, data) },
  error(msg, data)  { write("ERROR", msg, data) },
  access(method, path, status, duration, ip) {
    const t = ts()
    append(`[${t}] ${method} ${path} -> ${status} (${duration}ms) ip=${ip}`, "ACCESS")
  },
}
