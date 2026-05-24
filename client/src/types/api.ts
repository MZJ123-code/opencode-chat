/**
 * API 请求错误类
 * @param message - 错误信息
 * @param status - HTTP 状态码
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
