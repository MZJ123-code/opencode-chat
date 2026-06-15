import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const home = process.env.HOME || process.env.USERPROFILE || ''
const opencodeBin = path.join(home, '.opencode', 'bin')
const env = {
  ...process.env,
  PATH: `${opencodeBin}${path.delimiter}${process.env.PATH}`,
}

const server = spawn('bun', ['--watch', 'server/index.js'], {
  cwd: root,
  stdio: 'inherit',
  env,
})

const vite = spawn('bun', ['run', 'dev'], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env,
})

function shutdown() {
  server.kill()
  vite.kill()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('exit', shutdown)

server.on('exit', (code) => {
  if (code !== null && code !== 0) {
    vite.kill()
    process.exit(code)
  }
})

vite.on('exit', (code) => {
  if (code !== null && code !== 0) {
    server.kill()
    process.exit(code)
  }
})
