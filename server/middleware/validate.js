import { logger } from "../logger/index.js"

/**
 * 请求体验证中间件工厂，检查必填字段是否存在且非空
 * 对 message 字段额外校验其类型为字符串
 * @param {...string} fields - 必填字段名列表
 * @returns {import("express").RequestHandler} Express 中间件
 */
export function requireBody(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const val = req.body[f]
      if (val == null || val === "") {
        logger.warn(`参数校验失败: 缺少参数 ${f}`, { ip: req.clientIP, fields, path: req.path })
        return res.status(400).json({ error: `缺少参数: ${f}` })
      }
      if (f === "message" && typeof val !== "string") {
        logger.warn(`参数校验失败: ${f} 类型错误`, { ip: req.clientIP, expected: "string", actual: typeof val })
        return res.status(400).json({ error: `参数类型错误: ${f} 应为字符串` })
      }
    }
    next()
  }
}
