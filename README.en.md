# OpenCode Chat

> **Local Deployment · File System as Knowledge Base · No Authentication · Plug-and-Play AI Chat Platform**

[🇨🇳 中文](./README.md)

Run an AI chat system locally — **your file system is the knowledge base**. Add, edit, or delete documents and code files, and the AI instantly adapts to the latest content. No registration or login required; IP-based identity recognition makes it ideal for internal team AI assistants.

---

## Highlights

### 🖥️ Fully Local, Data Stays In-House

Everything runs on your own machine. The Express server and OpenCode AI engine are both local processes — no external API calls (private models configurable). Chat data and file content remain entirely under your control.

### 📂 File System as Knowledge Base

Traditional knowledge bases require importing, chunking, and vectorization — not here. AI Agents **read and write your files directly** via `read` / `write` / `edit` / `bash` / `search` tools:

| Action | Description |
|--------|-------------|
| **Add knowledge** | Place documents, Markdown, or code files in the project |
| **Update knowledge** | Edit files; the AI reads the latest content on next chat |
| **Remove knowledge** | Delete files; the AI stops referencing them |
| **Batch update** | Global search & replace, batch scripts — the AI stays in sync |

Zero latency, zero indexing, zero preprocessing — files are ready the moment you save them.

### ⚡ Quick Agent Customization

Edit `server/config.json` without touching code:

```json
{
  "agentOptions": [
    { "label": "Doc Assistant", "description": "Answer questions based on project docs", "agent": "custom" }
  ],
  "tools": {
    "read": true, "search": true, "web_search": true
  }
}
```

Tool toggles, Agent roles, model parameters, and system prompts are all configurable.

### 🔑 Frictionless Multi-User

No traditional authentication — **IP is identity**. Users open the browser and start chatting. Ideal for internal tools or small teams. Sessions auto-clean after 7 days TTL, max 100 sessions per IP, global cap of 5000.

### ⚡ Real-Time SSE Streaming

AI replies stream via Server-Sent Events with **20+ event types** (text delta, tool calls, reasoning, sub-session navigation). Built-in **event ring buffer** (200 events per IP) — reconnecting clients replay missed events incrementally.

### 🏗️ Dual Frontend Engine

| Frontend | Description |
|----------|-------------|
| **React SPA (primary)** | React 19 + Vite 6 + Tailwind CSS v4, full-featured |
| **Vanilla JS (fallback)** | Pure JavaScript, zero build, embedded in HTML |

The server loads the built bundle first and falls back to the vanilla version — even if the frontend build fails entirely, the chat interface still works.

### 🔄 AI Sub-Session Navigation

AI Agents create **sub-tasks** via the `task` tool. The frontend maintains a full navigation stack (forward/back/return to parent), delivering a browser-like multi-level conversation experience. SSE events sync navigation state in real time.

### 💬 AI Permissions & Multi-Step Forms

AI Agents can request user permission (e.g., file read/write) or initiate **multi-step form-style Q&A** (single choice, multiple choice, custom input). The `PermissionDialog` component includes step indicators and progress bars.

### 📊 SQLite Persistence + Dashboard

Three types of detail data persisted via `bun:sqlite` (WAL mode):

| Data | Content |
|------|---------|
| `page_visits` | Page visit records (IP + User-Agent) |
| `questions` | User question history (content + Agent + timestamp) |
| `feedback` | Like/dislike records (satisfaction + original Q&A) |

**Admin Dashboard** (`/#dashboard`) with summary cards, Agent distribution pie chart (recharts), satisfaction pie chart, Apple-style sortable/filterable tables, and Markdown modal for full content viewing.

CLI access: `bun run db:view` and `bun run db:sql`.

### 🤖 Multi-Agent Mode

| Label | Agent | Purpose |
|-------|-------|---------|
| 🛠️ Code Build | `build` | Write, modify, and debug code |
| 📐 Architecture | `plan` | Architectural design and planning |
| 🔍 Code Explore | `explore` | Analyze codebase quickly |

Add, remove, or modify Agents freely in `config.json` under `agentOptions`.

### 🛡️ Production Ready

- IP isolation + rate limiting: `/api` routes 200 requests/15 min/IP
- `sessionGuard` middleware validates session ownership
- Colorful console logging + file rotation (10MB auto-archive, keep last 10)
- Graceful shutdown: SIGINT/SIGTERM handling, save stats snapshot, close OpenCode subprocess

---

## Quick Start

**Prerequisites**: Bun, OpenCode CLI (`opencode` command available)

```bash
# Install dependencies
bun install
cd client && bun install && cd ..

# Development mode (starts both Express backend + Vite HMR frontend)
bun run dev

# Production build
cd client && bun run build && cd ..
bun start                 # Production start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `HOSTNAME` | `0.0.0.0` | Listen address |
| `NODE_ENV` | `development` | Runtime environment |
| `MODEL` | `deepseek/deepseek-chat` | AI model (swap for local models) |

---

## How to Modify the Knowledge Base

### Method 1: Edit Files Directly

AI Agents can read and write any file in the workspace:

```
# Create a knowledge document
echo "Product v2.0 API conventions: ..." > docs/api-conventions.md

# Or edit an existing file
edit config/settings.json
```

The AI automatically picks up the latest content via `read` / `search` tools during conversation.

### Method 2: Modify Agent Configuration

The `agentOptions` field in `server/config.json` defines the Agent list and behavior. Restart after editing to apply changes.

### Method 3: Adjust Tool Permissions

The `tools` field in `server/config.json` controls which tools the AI can use:

```json
{
  "tools": {
    "read": true,
    "write": true,
    "edit": true,
    "bash": true,
    "search": true,
    "web_search": true,
    "web_fetch": true
  }
}
```

---

## Architecture

```
User → Browser (React SPA / Vanilla JS)
        ↓ HTTP/SSE
   Express Server (:3000) ← config.json controls behavior
        ↓
   OpenCode SDK (@opencode-ai/sdk/v2)
        ↓
   OpenCode AI Engine (:4096) ← operates directly on local file system
```

### Request Modes

- **Sync** `POST /api/chat` — waits for the full response, suitable for simple queries
- **Async** `POST /api/chat/async` — returns immediately, AI reply streams via SSE

### Middleware Chain

```
express.json() → clientIP → requestLogger → rateLimiter(/api) → routes → errorHandler
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4 |
| Backend | Express.js 4.21 (ESM) |
| AI | `@opencode-ai/sdk` v2 + OpenCode CLI (local AI engine) |
| Database | SQLite (`bun:sqlite` built-in, WAL mode) |
| Charts | recharts |
| Modal | @radix-ui/react-dialog |
| Icons | lucide-react |
| Animation | framer-motion |
| Markdown | react-markdown, mermaid, highlight.js |
| Runtime | Bun |
| Logging | Colorful console + file rotation archive |

---

## Project Structure

```
opencode-chat/
├── server/                    # Express ESM backend
│   ├── config.json            # ⬅ Core config (Agent, tools, model)
│   ├── routes/                # 12 API route groups
│   ├── services/              # OpenCode SDK / sessions / users / stats / analytics
│   ├── middleware/             # IP resolution / rate limit / session guard / logging / validation / errors
│   ├── storage/               # In-memory store (Map) + SQLite init
│   └── logger/                # Colorful console + file rotation
├── client/                    # React 19 + TypeScript + Vite 6 frontend
│   └── src/
│       ├── api/               # Resource-based API clients
│       ├── components/        # chat / sidebar / layout / dashboard / common / ui
│       ├── contexts/          # ChatContext (SSE/multi-session/navigation) + ThemeContext
│       ├── hooks/             # useEvents (SSE reconnect+backoff) / useFeedback / useMediaQuery
│       └── types/             # message / session / api type definitions
├── public/index.html          # Vanilla JS zero-build fallback frontend
├── scripts/                   # Dev launcher + database inspection tools
├── logs/                      # Runtime logs + analytics.db (SQLite)
├── AGENTS.md                  # Coding standards & guidelines
└── CHANGELOG.md               # Version changelog
```

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions` | List sessions |
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions/:id/messages` | Message history |
| `POST` | `/api/chat` | Sync send |
| `POST` | `/api/chat/async` | Async send (SSE response) |
| `GET` | `/api/events` | SSE event stream |
| `POST` | `/api/sessions/:id/feedback` | Satisfaction feedback |
| `GET` | `/api/stats` | Platform stats (aggregated) |
| `GET` | `/api/agents` | Agent list |
| `POST` | `/api/permission/respond` | Permission response |

---

## Database Tools

```bash
bun run db:view                     # Overview of all table counts
bun run db:view visits              # View visit details
bun run db:sql "SELECT * FROM questions LIMIT 10"  # Arbitrary SQL queries
```
