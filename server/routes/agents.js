import { Router } from "express"
import { AGENT_OPTIONS } from "../config.js"

const router = Router()

router.get("/", (req, res) => {
  res.json(AGENT_OPTIONS)
})

export default router
