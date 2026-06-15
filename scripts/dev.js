import { spawn } from 'child_process'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const home = process.env.HOME || process.env.USERPROFILE || ''
const opencodeBin = path.join(home, '.opencode', 'bin')
const env = {
  ...process.env,
  PATH: `${opencodeBin}${path.delimiter}${process.env.PATH}`,
}

const SERVER_PORT = process.env.PORT || 3000

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
}

function banner(title) {
  const line = '─'.repeat(50)
  console.log(`\n${C.cyan}${line}${C.reset}`)
  console.log(`${C.cyan}  ${title}${C.reset}`)
  console.log(`${C.cyan}${line}${C.reset}\n`)
}

function lineReader(stream, prefix, color) {
  let buf = ''
  stream.on('data', (data) => {
    buf += data.toString()
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}[${prefix}]${C.reset} ${line}`)
      }
    }
  })
}

function waitForServer(url, label, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`${label} 启动超时 (${timeout / 1000}s)`))
        } else {
          setTimeout(check, 500)
        }
      })
      req.setTimeout(2000, () => {
        req.destroy()
        if (Date.now() - start > timeout) {
          reject(new Error(`${label} 启动超时 (${timeout / 1000}s)`))
        } else {
          setTimeout(check, 500)
        }
      })
    }
    check()
  })
}

function shutdown() {
  if (globalThis.__vite) globalThis.__vite.kill()
  if (globalThis.__server) globalThis.__server.kill()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// ── Phase 1: Express 后端 ──
banner('启动 Express 后端 (--watch 热重启)')

const server = spawn('bun', ['--watch', 'server/index.js'], {
  cwd: root,
  stdio: ['inherit', 'pipe', 'inherit'],
  env,
})
globalThis.__server = server

lineReader(server.stdout, 'server', C.blue)

server.on('exit', (code) => {
  if (code !== null && code !== 0 && globalThis.__vite) {
    globalThis.__vite.kill()
    process.exit(code)
  }
})

// ── 等待后端就绪，再启动前端 ──
try {
  await waitForServer(
    `http://127.0.0.1:${SERVER_PORT}/api/health?_=${Date.now()}`,
    'Express'
  )
} catch (err) {
  console.error(`${C.red}${err.message}${C.reset}`)
  process.exit(1)
}

// ── Phase 2: Vite 前端 ──
banner('启动前端 Vite HMR')

const vite = spawn('bun', ['run', 'dev'], {
  cwd: path.join(root, 'client'),
  stdio: ['inherit', 'pipe', 'inherit'],
  env,
})
globalThis.__vite = vite

lineReader(vite.stdout, 'vite', C.green)

vite.on('exit', (code) => {
  if (code !== null && code !== 0) {
    server.kill()
    process.exit(code)
  }
})
