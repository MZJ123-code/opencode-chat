export function requireBody(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      if (!req.body[f]) {
        return res.status(400).json({ error: `缺少参数: ${f}` })
      }
    }
    next()
  }
}
