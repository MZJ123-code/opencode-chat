import { ApiError } from '../types/api'

/**
 * 通用 API 请求函数
 * @typeParam T - 响应数据类型
 * @param method - HTTP 方法
 * @param url - 请求 URL
 * @param body - 可选的请求体
 * @returns 解析后的响应数据
 */
export async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
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
