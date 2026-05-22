import { ApiError } from '../types/api'

export async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  if (!res.ok) {
    const json = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new ApiError(
      (json.error as string) || `${res.status} ${res.statusText}`,
      res.status
    )
  }
  return res.json() as Promise<T>
}
