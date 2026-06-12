/**
 * SQLite 数据库模块 — 持久化统计明细和会话数据
 * 使用 bun:sqlite 内置模块，文件存储于 logs/ 目录
 * 通过 _migrations 表实现版本化迁移
 */
import { Database } from "bun:sqlite"
import path from "path"
import { LOG_DIR } from "../config.js"
import { logger } from "../logger/index.js"

const DB_PATH = path.join(LOG_DIR, "analytics.db")

/** @type {Database | null} */
let db = null

/**
 * @typedef {{ name: string, up: (db: Database) => void }} Migration
 * @type {Migration[]}
 */
const MIGRATIONS = [
  {
    name: "001_add_answer_content",
    up(db2) {
      try { db2.run("ALTER TABLE feedback ADD COLUMN answer_content TEXT DEFAULT ''") } catch {}
    },
  },
  {
    name: "002_add_sessions",
    up(db2) {
      db2.run(`
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
    },
  },
  {
    name: "003_add_sessions_user_index",
    up(db2) {
      try { db2.run("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)") } catch {}
    },
  },
]

/**
 * 创建基础表结构（仅首次运行）
 * @param {Database} d
 */
function createBaseTables(d) {
  d.run(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      visit_date TEXT NOT NULL,
      visited_at TEXT NOT NULL
    )
  `)
  d.run(`
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
  d.run(`
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
  d.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)
}

/**
 * 应用未执行的数据库迁移
 * @param {Database} d
 */
function applyMigrations(d) {
  const applied = new Set()
  try {
    const rows = d.prepare("SELECT name FROM _migrations ORDER BY name").all()
    for (const row of rows) applied.add(row.name)
  } catch {}

  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue
    try {
      m.up(d)
      d.run("INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)", [m.name, new Date().toISOString()])
      logger.info(`数据库迁移已执行: ${m.name}`)
    } catch (err) {
      logger.warn(`数据库迁移失败: ${m.name}`, { error: err.message })
    }
  }
}

/**
 * 初始化数据库：创建表结构并执行迁移
 */
export function initDatabase() {
  db = new Database(DB_PATH, { create: true })
  db.run("PRAGMA journal_mode = WAL")

  createBaseTables(db)

  // 索引（基础索引，非迁移）
  db.run("CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_questions_date ON questions(question_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(feedback_date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id)")
  db.run("CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id)")

  applyMigrations(db)

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
