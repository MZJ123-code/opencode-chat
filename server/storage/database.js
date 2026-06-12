/**
 * SQLite 数据库模块 — 持久化统计明细数据
 * 使用 bun:sqlite 内置模块，文件存储于 logs/ 目录
 */
import { Database } from "bun:sqlite"
import path from "path"
import { LOG_DIR } from "../config.js"

const DB_PATH = path.join(LOG_DIR, "analytics.db")

/** @type {Database | null} */
let db = null

/**
 * 初始化数据库：创建表结构（如不存在）
 */
export function initDatabase() {
  db = new Database(DB_PATH, { create: true })

  // 启用 WAL 模式提升并发性能
  db.run("PRAGMA journal_mode = WAL")

  db.run(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      visit_date TEXT NOT NULL,
      visited_at TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      ip TEXT NOT NULL,
      content TEXT NOT NULL,
      agent TEXT DEFAULT '',
      question_date TEXT NOT NULL,
      asked_at TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      ip TEXT NOT NULL,
      satisfied INTEGER NOT NULL,
      question_content TEXT DEFAULT '',
      answer_content TEXT DEFAULT '',
      feedback_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  // 兼容旧表：已有表可能缺少 answer_content 列
  try { db.run("ALTER TABLE feedback ADD COLUMN answer_content TEXT DEFAULT ''") } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      agent TEXT,
      message_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      ip TEXT DEFAULT ''
    )
  `)

  // 索引
  db.run("CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_questions_date ON questions(question_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(feedback_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id)")
  db.run("CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id)")
  db.run("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")

  return db
}

/**
 * 获取数据库实例
 * @returns {Database}
 */
export function getDatabase() {
  if (!db) throw new Error("数据库未初始化，请先调用 initDatabase()")
  return db
}
