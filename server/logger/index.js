import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import { LOG_DIR, LOG_MAX_SIZE, LOG_MAX_ARCHIVES } from "../config.js"

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

const serverLog = path.join(LOG_DIR, "server.log")
/**
 * 获取当前时间戳字符串
 * @returns {string} 格式 "YYYY-MM-DD HH:mm:ss.mmm"
 */
const ts = () => new Date().toISOString().replace("T", " ").slice(0, 23)
/**
 * 生成归档文件名（按日期时间）
 * @returns {string} 归档文件完整路径
 */
const archiveName = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return path.join(LOG_DIR,
    `server-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.log`)
}

let queue = Promise.resolve()

/**
 * 将异步写入操作排队，保证日志顺序性
 * @param {() => Promise<void>} fn - 异步写入函数
 */
function enqueue(fn) {
  queue = queue.then(fn).catch(() => {})
}

/**
 * 检查当前日志文件是否超出大小限制，超出时归档并清理旧归档
 */
async function maybeArchive() {
  let stat
  try { stat = await fsp.stat(serverLog) } catch { return }
  if (stat.size < LOG_MAX_SIZE) return

  const dest = archiveName()
  await fsp.rename(serverLog, dest)

  const entries = await fsp.readdir(LOG_DIR)
  const archives = entries
    .filter(f => f.startsWith("server-") && f.endsWith(".log"))
    .sort()
  while (archives.length > LOG_MAX_ARCHIVES) {
    const oldest = archives.shift()
    await fsp.unlink(path.join(LOG_DIR, oldest)).catch(() => {})
  }
}

/**
 * 安全序列化日志数据对象
 * @param {unknown} data - 要序列化的数据
 * @returns {string} 序列化后的字符串
 */
function safeStringify(data) {
  if (data === undefined) return ""
  if (typeof data !== "object") return String(data)
  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

/** @type {NodeJS.Timeout | null} 归档 debounce 定时器 */
let archiveTimer = null
/**
 * debounce 版本 maybeArchive，避免每条日志都触发 fs.stat
 */
function debouncedArchive() {
  if (archiveTimer) return
  archiveTimer = setTimeout(() => {
    archiveTimer = null
    maybeArchive()
  }, 5000).unref()
}

/**
 * 写入日志行到控制台和文件
 * @param {string} line - 日志文本
 * @param {string} level - 日志级别（INFO/WARN/ERROR/ACCESS）
 */
function append(line, level) {
  const prefix =
    level === "ERROR" ? "\x1b[31m" : level === "WARN" ? "\x1b[33m" : level === "INFO" ? "\x1b[36m" : "\x1b[90m"
  console.log(`${prefix}${line}\x1b[0m`)
  enqueue(() => fsp.appendFile(serverLog, line + "\n").then(() => debouncedArchive()))
}

/**
 * 格式化并写入日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {unknown} [data] - 附加数据
 */
function write(level, message, data) {
  const t = ts()
  let line = `[${t}] [${level}] ${message}`
  if (data !== undefined) {
    line += " | " + safeStringify(data)
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

/** @type {{ info: (msg: string, data?: unknown) => void, warn: (msg: string, data?: unknown) => void, error: (msg: string, data?: unknown) => void, access: (method: string, path: string, status: number, duration: number, ip: string) => void }} */
export const logger = {
  info(msg, data)   { write("INFO", msg, data) },
  warn(msg, data)   { write("WARN", msg, data) },
  error(msg, data)  { write("ERROR", msg, data) },
  access(method, path, status, duration, ip) {
    const t = ts()
    append(`[${t}] ${method} ${path} -> ${status} (${duration}ms) ip=${ip}`, "ACCESS")
  },
}
