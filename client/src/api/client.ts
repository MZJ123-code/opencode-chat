import { ApiError } from '../types/api'

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
    console.warn(`[API] ${res.status} ${method} ${url} 返回非 JSON, 前200字符:`, text.slice(0, 200))
  }

  if (!res.ok || !isJSON) {
    const msg = isJSON && (data.error as string || '')
    throw new ApiError(
      msg || `${res.status} ${res.statusText}`,
      res.status
    )
  }

  return data as T
}
