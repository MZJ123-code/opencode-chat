// 每 IP 保留最近 N 条事件，断连后新连接可回放
const MAX_BUFFER = 200
const BUFFER_TTL = 5 * 60 * 1000 // 5 分钟空闲后清理

const buffers = new Map() // ip -> { events: Event[], seq: number, lastAccess: number }

export function pushEvent(ip, event) {
  let buf = buffers.get(ip)
  if (!buf) {
    buf = { events: [], seq: 0, lastAccess: Date.now() }
    buffers.set(ip, buf)
  }
  buf.seq++
  buf.events.push({ ...event, seq: buf.seq })
  if (buf.events.length > MAX_BUFFER) {
    buf.events.shift()
  }
  buf.lastAccess = Date.now()
  return buf.seq
}

// sinceSeq=0 回放全部，>0 只回放增量
export function getBufferedEvents(ip, sinceSeq = 0) {
  const buf = buffers.get(ip)
  if (!buf) return { events: [], latestSeq: 0 }
  buf.lastAccess = Date.now()
  if (sinceSeq === 0) {
    return { events: [...buf.events], latestSeq: buf.seq }
  }
  return {
    events: buf.events.filter(e => e.seq > sinceSeq),
    latestSeq: buf.seq,
  }
}

export function removeBuffer(ip) {
  buffers.delete(ip)
}

// 定期清理空闲缓冲区
setInterval(() => {
  const now = Date.now()
  for (const [ip, buf] of buffers) {
    if (now - buf.lastAccess > BUFFER_TTL) {
      buffers.delete(ip)
    }
  }
}, 60_000).unref()
