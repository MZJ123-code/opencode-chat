export function requireBody(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const val = req.body[f]
      if (val == null || val === "") {
        return res.status(400).json({ error: `缺少参数: ${f}` })
      }
      // message 字段必须是字符串
      if (f === "message" && typeof val !== "string") {
        return res.status(400).json({ error: `参数类型错误: ${f} 应为字符串` })
      }
    }
    next()
  }
}
