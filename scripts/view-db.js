/**
 * 数据库查看工具
 * 用法: bun run db:view          # 查看所有表概况
 *       bun run db:view visits   # 查看 page_visits 表
 *       bun run db:view questions
 *       bun run db:view feedback
 */
import { Database } from "bun:sqlite"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, "..", "logs", "analytics.db")

const db = new Database(dbPath, { create: false, readonly: true })

const tableArg = process.argv[2]

const TABLES = {
  visits: "page_visits",
  questions: "questions",
  feedback: "feedback",
}

if (tableArg && TABLES[tableArg]) {
  const rows = db.prepare(`SELECT * FROM ${TABLES[tableArg]} ORDER BY id DESC LIMIT 50`).all()
  console.log(`\n=== ${TABLES[tableArg]} (最近 50 条) ===`)
  console.table(rows)
} else {
  console.log("\n=== 数据库概况 ===\n")

  for (const [key, table] of Object.entries(TABLES)) {
    const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()
    console.log(`  ${table}: ${count.c} 条记录`)
  }

  console.log("\n查看详情: bun run db:view <表名>")
  console.log("表名可选: visits | questions | feedback\n")
}

db.close()
