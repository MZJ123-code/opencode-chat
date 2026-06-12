import { ApiError } from '../types/api'

const TOKEN_KEY = 'user_token'

/**
 * 读取用户唯一标识 Token
 * 优先从 localStorage 读取，不存在时返回 null
 */
export function getUserToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 保存用户 Token 到 localStorage
 */
function setUserToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 通用 API 请求函数
 * 自动携带 x-user-token 请求头，首次请求后若响应中有该头部则自动保存
 * @typeParam T - 响应数据类型
 * @param method - HTTP 方法
 * @param url - 请求 URL
 * @param body - 可选的请求体
 * @returns 解析后的响应数据
 */
export async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getUserToken()
  if (token) headers['x-user-token'] = token

  const opts: RequestInit = {
    method,
    headers,
    credentials: 'include',
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)

  // 如果响应中包含 x-user-token，保存到 localStorage
  const respToken = res.headers.get('x-user-token')
  if (respToken) setUserToken(respToken)

  const text = await res.text()

  let data: Record<string, unknown> = {}
  let isJSON = true
  try {
    data = JSON.parse(text)
  } catch {
    isJSON = false
    if (import.meta.env.DEV) {
      console.warn(`[API] ${res.status} ${method} ${url} 返回非 JSON, 前200字符:`, text.slice(0, 200))
    }
  }

  if (!res.ok || !isJSON) {
    const error = typeof data.error === 'string' ? data.error : ''
    const msg = isJSON && error
    throw new ApiError(
      msg || `${res.status} ${res.statusText}`,
      res.status
    )
  }

  return data as unknown as T
}
