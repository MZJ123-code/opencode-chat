import crypto from "crypto"

const TOKEN_COOKIE = "user_token"
const TOKEN_HEADER = "x-user-token"

/**
 * 解析 Cookie 字符串中指定名称的值
 * @param {string} cookieHeader
 * @param {string} name
 * @returns {string|undefined}
 */
function getCookie(cookieHeader, name) {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key === name) return part.slice(idx + 1).trim()
  }
  return undefined
}

/** 匹配 UUID v4 格式的正则（宽松兼容） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 用户 Token 中间件
 * 通过 Cookie 或 Header 识别用户身份，替代 IP 作为用户标识
 * 首次访问自动生成 UUID Token，写入 Cookie 和响应头
 */
export function userTokenMiddleware(req, res, next) {
  let token = getCookie(req.headers.cookie, TOKEN_COOKIE) || req.headers[TOKEN_HEADER]
  if (!token || typeof token !== "string" || !UUID_RE.test(token)) {
    token = crypto.randomUUID()
    res.setHeader(TOKEN_HEADER, token)
    res.append("Set-Cookie", `${TOKEN_COOKIE}=${token}; Path=/; Max-Age=${365 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`)
  }
  // 仅新 Token 时设置 Cookie（避免每请求重复设置）
  else if (!getCookie(req.headers.cookie, TOKEN_COOKIE)) {
    res.setHeader(TOKEN_HEADER, token)
    res.append("Set-Cookie", `${TOKEN_COOKIE}=${token}; Path=/; Max-Age=${365 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`)
  }
  req.userId = token
  next()
}
