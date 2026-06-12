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

/**
 * 用户 Token 中间件
 * 通过 Cookie 或 Header 识别用户身份，替代 IP 作为用户标识
 * 首次访问自动生成 UUID Token，写入 Cookie 和响应头
 */
export function userTokenMiddleware(req, res, next) {
  let token = getCookie(req.headers.cookie, TOKEN_COOKIE) || req.headers[TOKEN_HEADER]
  if (!token || typeof token !== "string" || token.length < 16) {
    token = crypto.randomUUID()
    res.setHeader(TOKEN_HEADER, token)
    res.append("Set-Cookie", `${TOKEN_COOKIE}=${token}; Path=/; Max-Age=${365 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`)
  }
  req.userId = token
  next()
}
