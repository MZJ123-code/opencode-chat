/**
 * 直接执行 SQL 查询查看数据库
 * 用法: bun run db:sql "SELECT * FROM page_visits LIMIT 10"
 *       bun run db:sql "SELECT COUNT(*) as c FROM questions"
 */
import { Database } from "bun:sqlite"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, "..", "logs", "analytics.db")

const sql = process.argv[2]
if (!sql) {
  console.log("用法: bun run db:sql \"<SQL 查询>\"")
  console.log("示例:")
  console.log("  bun run db:sql \"SELECT * FROM page_visits ORDER BY id DESC LIMIT 10\"")
  console.log("  bun run db:sql \"SELECT visit_date, COUNT(*) as visits FROM page_visits GROUP BY visit_date\"")
  console.log("  bun run db:sql \"SELECT * FROM feedback ORDER BY id DESC LIMIT 20\"")
  console.log("  bun run db:sql \"SELECT ip, COUNT(*) as cnt FROM questions GROUP BY ip ORDER BY cnt DESC\"")
  process.exit(0)
}

const db = new Database(dbPath, { readonly: true })
try {
  const stmt = db.prepare(sql)
  const isWrite = !/^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(sql)
  if (isWrite) {
    console.log("只读模式，仅支持 SELECT 查询")
  } else {
    const rows = stmt.all()
    console.table(rows)
  }
} catch (err) {
  console.error("SQL 错误:", err.message)
}
db.close()
