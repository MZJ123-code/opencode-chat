/** @type {number} 每用户事件缓冲区最大条数 */
const MAX_BUFFER = 5000
/** @type {number} 缓冲区空闲 TTL（30 分钟） */
const BUFFER_TTL = 30 * 60 * 1000

/** @type {Map<string, {events: Array<Record<string, unknown>>, seq: number, lastAccess: number}>} userId → 事件缓冲区 */
const buffers = new Map()

/**
 * 向指定用户的事件缓冲区推入一条新事件
 * @param {string} userId - 用户 ID
 * @param {Record<string, unknown>} event - 事件对象
 * @returns {number} 当前序列号
 */
export function pushEvent(userId, event) {
  let buf = buffers.get(userId)
  if (!buf) {
    buf = { events: [], seq: 0, lastAccess: Date.now() }
    buffers.set(userId, buf)
  }
  buf.seq++
  buf.events.push({ ...event, seq: buf.seq })
  if (buf.events.length > MAX_BUFFER) {
    buf.events.shift()
  }
  buf.lastAccess = Date.now()
  return buf.seq
}

/**
 * 获取缓冲事件，支持增量回放
 * @param {string} userId - 用户 ID
 * @param {number} [sinceSeq=0] - 起始序列号，0 回放全部
 * @returns {{ events: Array<Record<string, unknown>>, latestSeq: number }} 事件列表和最新序列号
 */
export function getBufferedEvents(userId, sinceSeq = 0) {
  const buf = buffers.get(userId)
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

// 定期清理空闲缓冲区
setInterval(() => {
  const now = Date.now()
  for (const [key, buf] of buffers) {
    if (now - buf.lastAccess > BUFFER_TTL) {
      buffers.delete(key)
    }
  }
}, 60_000).unref()
