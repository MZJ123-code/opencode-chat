import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { ChatMessage, ChatPart } from '../types/message'
import type { SessionListItem } from '../types/session'
import type { FeedbackState } from '../hooks/useFeedback'
import * as sessionsApi from '../api/sessions'
import * as chatApi from '../api/chat'
import * as agentsApi from '../api/agents'
import type { AgentOption } from '../api/agents'
import { useEvents } from '../hooks/useEvents'
import { useFeedback } from '../hooks/useFeedback'
import { PermissionDialog } from '../components/common/PermissionDialog'
import type { PermissionRequest } from '../api/permission'

let renderPending = false

interface ChatContextValue {
  sessions: SessionListItem[]
  sessionsLoading: boolean
  isCreating: boolean
  sessionError: string | null
  createSession: (agent?: string) => Promise<string | null>
  refreshSessions: () => Promise<SessionListItem[]>

  messages: ChatMessage[]
  messagesLoading: boolean
  isStreaming: boolean
  chatError: string | null
  loadHistory: (sessionId: string) => Promise<void>
  sendMessage: (text: string, sessionId: string) => Promise<void>
  abortMessage: () => Promise<void>
  clearMessages: () => void

  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void
  currentSession: SessionListItem | undefined

  feedbackStates: Map<number, FeedbackState>
  submitFeedback: (sessionId: string, satisfied: boolean, msgIdx: number) => Promise<void>

  inputValue: string
  setInputValue: (value: string) => void

  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  globalError: string | null
  setGlobalError: (error: string | null) => void

  agents: AgentOption[]
  agentsLoading: boolean
  selectedAgent: string | null
  setSelectedAgent: (agent: string | null) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const sessionsLoadedRef = useRef(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const loadedSessionRef = useRef<string | null>(null)
  const currentSessionRef = useRef<string | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  // Track child sessions created by the task tool so we can display their events inline
  const childSessionIdsRef = useRef<Set<string>>(new Set())
  const childBoundaryInjectedRef = useRef<Set<string>>(new Set())

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { feedbackStates, submitFeedback } = useFeedback()

  const syncMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const scheduleRender = useCallback(() => {
    if (renderPending) return
    renderPending = true
    requestAnimationFrame(() => {
      renderPending = false
      setMessages([...messagesRef.current])
    })
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      setSessionError(null)
      const data = await sessionsApi.fetchSessions()
      setSessions(data)
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载会话列表失败'
      setSessionError(msg)
      return []
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    if (sessionsLoadedRef.current) return
    sessionsLoadedRef.current = true
    return refreshSessions()
  }, [refreshSessions])

  const createSession = useCallback(async (agent?: string) => {
    setIsCreating(true)
    setSessionError(null)
    try {
      const result = await sessionsApi.createSession(undefined, agent)
      await refreshSessions()
      return result.sessionId
    } catch (e) {
      const msg = e instanceof Error ? e.message : '创建会话失败'
      setSessionError(msg)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [refreshSessions])

  const loadHistory = useCallback(async (sessionId: string) => {
    if (loadedSessionRef.current === sessionId) return
    loadedSessionRef.current = sessionId
    currentSessionRef.current = sessionId
    childSessionIdsRef.current.clear()
    childBoundaryInjectedRef.current.clear()
    setMessagesLoading(true)
    setChatError(null)
    try {
      const data = await sessionsApi.fetchMessages(sessionId)
      syncMessages(data)
    } catch (e) {
      syncMessages([])
      setChatError(e instanceof Error ? e.message : '加载消息历史失败')
    } finally {
      setMessagesLoading(false)
    }
  }, [syncMessages])

  const injectPart = useCallback((part: Record<string, unknown>) => {
    const msgs = messagesRef.current
    let targetIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { targetIdx = i; break }
    }
    if (targetIdx === -1) return

    const next = [...msgs]
    const msg = { ...next[targetIdx] }
    const parts = [...msg.parts]
    const existingIdx = parts.findIndex((p) => p.id === part.id)
    if (existingIdx >= 0) {
      parts[existingIdx] = { ...parts[existingIdx], ...part } as unknown as ChatPart
    } else {
      parts.push(part as unknown as ChatPart)
    }
    msg.parts = parts
    next[targetIdx] = msg
    messagesRef.current = next
    scheduleRender()
  }, [scheduleRender])

  // Helper to get `info` property from a message
  function getMsgInfo(msg: ChatMessage): Record<string, unknown> | undefined {
    return (msg as unknown as Record<string, unknown>).info as Record<string, unknown> | undefined
  }

  function setMsgInfo(msg: ChatMessage, info: Record<string, unknown>): ChatMessage {
    const m = msg as unknown as Record<string, unknown>
    m.info = info
    return m as unknown as ChatMessage
  }

  function getPartText(part: ChatPart): string | undefined {
    return (part as unknown as Record<string, unknown>).text as string | undefined
  }

  function setPartText(part: ChatPart, text: string): void {
    ;(part as unknown as Record<string, unknown>).text = text
  }

  useEvents({
    onMessageUpdated(messageInfo) {
      const sid = messageInfo.sessionID as string
      if (sid !== currentSessionRef.current) return
      const id = messageInfo.id as string
      const msgs = messagesRef.current
      const idx = msgs.findIndex((m) => getMsgInfo(m)?.id === id)

      if (idx === -1) {
        const role = (messageInfo.role as 'user' | 'assistant') || 'assistant'
        if (role === 'user') {
          const lastUserIdx = msgs.findLastIndex((m) => m.role === 'user' && !getMsgInfo(m)?.id)
          if (lastUserIdx !== -1) {
            const next = [...msgs]
            next[lastUserIdx] = setMsgInfo(next[lastUserIdx], messageInfo)
            syncMessages(next)
            return
          }
        }
        const newMsg: ChatMessage = {
          role,
          parts: [],
          time: messageInfo.time ? (messageInfo.time as { start: number }).start : Date.now(),
        }
        syncMessages([...msgs, setMsgInfo(newMsg, messageInfo)])
      } else {
        const next = [...msgs]
        next[idx] = setMsgInfo(next[idx], messageInfo)
        syncMessages(next)
      }
    },

    onMessageRemoved(sessionID, messageID) {
      if (sessionID !== currentSessionRef.current) return
      const msgs = messagesRef.current.filter((m) => getMsgInfo(m)?.id !== messageID)
      syncMessages(msgs)
    },

    onPartUpdated(part, messageID, sessionID) {
      const isChild = childSessionIdsRef.current.has(sessionID)
      const isCurrent = sessionID === currentSessionRef.current
      if (!isCurrent && !isChild) return
      if (part.type === 'compaction' || part.type === 'retry') return

      // For child session parts, inject them into the parent's message flow inline
      if (isChild) {
        injectPart(part as unknown as Record<string, unknown>)
        return
      }

      const msgs = messagesRef.current
      let msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)

      if (msgIdx === -1) {
        const newMsg: ChatMessage = { role: 'assistant', parts: [part], time: Date.now() }
        syncMessages([...msgs, setMsgInfo(newMsg, { id: messageID, sessionID })])
        return
      }

      const next = [...msgs]
      const msg = { ...next[msgIdx] }
      const parts = [...msg.parts]
      const partIdx = parts.findIndex((p) => p.id === part.id)

      if (partIdx === -1) {
        const existingTextIdx = msg.parts.findIndex((p) => p.type === 'text')
        if (msg.role === 'user' && part.type === 'text' && existingTextIdx !== -1) {
          const updatedPart = { ...parts[existingTextIdx], id: part.id, messageID: part.messageID }
          ;(updatedPart as Record<string, unknown>).text = (part as unknown as Record<string, unknown>).text
          parts[existingTextIdx] = updatedPart as ChatPart
        } else {
          parts.push(part)
        }
      } else {
        if (part.type === 'text' && parts[partIdx]?.type === 'text') {
          const existingText = getPartText(parts[partIdx])
          const incomingText = getPartText(part)
          if (existingText && (!incomingText || incomingText.length < existingText.length)) {
            setPartText(part, existingText)
          }
        }
        parts[partIdx] = part
      }

      msg.parts = parts
      next[msgIdx] = msg
      messagesRef.current = next
      scheduleRender()
    },

    onPartDelta(partID, messageID, sessionID, delta) {
      const isChild = childSessionIdsRef.current.has(sessionID)
      const isCurrent = sessionID === currentSessionRef.current
      if (!isCurrent && !isChild) return

      const msgs = messagesRef.current
      let msgIdx = -1
      let partIdx = -1

      if (isCurrent) {
        msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)
        if (msgIdx >= 0) partIdx = msgs[msgIdx].parts.findIndex((p) => p.id === partID)
      } else {
        // For child sessions, the part was injected into the parent's messages — search all
        for (let i = msgs.length - 1; i >= 0; i--) {
          const pIdx = msgs[i].parts.findIndex((p) => p.id === partID)
          if (pIdx >= 0) { msgIdx = i; partIdx = pIdx; break }
        }
      }
      if (msgIdx === -1 || partIdx === -1) return

      const next = [...msgs]
      const msg = { ...next[msgIdx] }
      const parts = [...msg.parts]
      const part = { ...parts[partIdx] }
      if (part.type === 'text' || part.type === 'reasoning') {
        setPartText(part, (getPartText(part) || '') + delta)
      }
      parts[partIdx] = part
      msg.parts = parts
      next[msgIdx] = msg
      messagesRef.current = next
      scheduleRender()
    },

    onPartRemoved(sessionID, messageID, partID) {
      const isChild = childSessionIdsRef.current.has(sessionID)
      const isCurrent = sessionID === currentSessionRef.current
      if (!isCurrent && !isChild) return

      const msgs = messagesRef.current
      let msgIdx = -1

      if (isCurrent) {
        msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)
      } else {
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].parts.find((p) => p.id === partID)) { msgIdx = i; break }
        }
      }
      if (msgIdx === -1) return

      const next = [...msgs]
      const msg = { ...next[msgIdx] }
      msg.parts = msg.parts.filter((p) => p.id !== partID)
      next[msgIdx] = msg
      syncMessages(next)
    },

    onSessionStatus(sessionID, status) {
      if (sessionID !== currentSessionRef.current) return
      const s = (typeof status === 'string' ? status : (status as Record<string, unknown>)?.status) as string
      if (s === 'completed' || s === 'idle') setIsStreaming(false)
      else if (s === 'running') setIsStreaming(true)
    },

    onSessionIdle(sessionID) {
      if (sessionID === currentSessionRef.current) setIsStreaming(false)
    },

    onSessionError(sessionID, err) {
      if (sessionID !== currentSessionRef.current) return
      setChatError((err as Record<string, unknown>).message as string || '未知错误')
      setIsStreaming(false)
    },

    // Detect child sessions created by the task tool
    onSessionUpdated(info) {
      const sid = (info as Record<string, unknown>).id as string | undefined
      const parentID = (info as Record<string, unknown>).parentID as string | undefined
      if (sid && parentID === currentSessionRef.current) {
        childSessionIdsRef.current.add(sid)
        // Inject a subtask boundary so child tool calls are visually grouped
        if (!childBoundaryInjectedRef.current.has(sid)) {
          childBoundaryInjectedRef.current.add(sid)
          const title = ((info as Record<string, unknown>).title as string) || '子任务'
          const agentMatch = title.match(/@(\w+)/)
          injectPart({
            id: `subtask-${sid}`,
            messageID: '',
            sessionID: currentSessionRef.current,
            type: 'subtask',
            agent: agentMatch ? agentMatch[1] : '',
            description: title,
            prompt: '',
          })
        }
      }
    },

    onToolCalled(sessionID, callID, tool, input) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: callID, messageID: '', sessionID, type: 'tool', callID, tool, state: { status: 'running', input, title: tool, time: { start: Date.now() } } })
    },
    onToolSuccess(sessionID, callID, output, title, time) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: callID, messageID: '', sessionID, type: 'tool', callID, tool: title || '', state: { status: 'completed', output, title, time } })
    },
    onToolFailed(sessionID, callID, error) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: callID, messageID: '', sessionID, type: 'tool', callID, tool: '', state: { status: 'error', error } })
    },

    onReasoningDelta(sessionID, reasoningID, delta) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      const msgs = messagesRef.current
      let targetIdx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') { targetIdx = i; break }
      }
      if (targetIdx === -1) return
      const msg = msgs[targetIdx]
      const existing = msg.parts.find((p) => p.id === reasoningID) as Record<string, unknown> | undefined
      const prevText = (existing?.text as string) || ''
      injectPart({ id: reasoningID, messageID: '', sessionID, type: 'reasoning', text: prevText + delta })
    },
    onReasoningEnded(sessionID, reasoningID, text) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: reasoningID, messageID: '', sessionID, type: 'reasoning', text })
    },

    onShellStarted(sessionID, callID, command) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: callID, messageID: '', sessionID, type: 'tool', callID, tool: 'shell', state: { status: 'running', input: { command }, title: command, time: { start: Date.now() } } })
    },
    onShellEnded(sessionID, callID, output) {
      if (sessionID !== currentSessionRef.current && !childSessionIdsRef.current.has(sessionID)) return
      injectPart({ id: callID, messageID: '', sessionID, type: 'tool', callID, tool: 'shell', state: { status: 'completed', output, title: 'shell', time: { start: 0, end: 0 } } })
    },

    onPermissionAsked(props) {
      setPendingPermission({
        id: props.id as string,
        sessionID: props.sessionID as string,
        permission: props.permission as string,
        patterns: props.patterns as string[],
        metadata: props.metadata as Record<string, unknown>,
        always: props.always as string[],
        tool: props.tool as { messageID: string; callID: string } | undefined,
      })
    },
  })

  const sendMessage = useCallback(async (text: string, sessionId: string) => {
    setChatError(null)
    setIsStreaming(true)

    const userMsg: ChatMessage = {
      role: 'user',
      parts: [{ id: `local-${Date.now()}`, type: 'text', text, messageID: '', sessionID: sessionId }],
      time: Date.now(),
    }
    syncMessages([...messagesRef.current, userMsg])

    const session = sessions.find((s) => s.sessionId === sessionId)
    const agent = session?.agent || selectedAgent || undefined

    try {
      await chatApi.sendMessageAsync(sessionId, text, agent)
    } catch (e) {
      setChatError(e instanceof Error ? e.message : '发送失败')
      setIsStreaming(false)
    }
  }, [syncMessages, sessions, selectedAgent])

  const abortMessage = useCallback(async () => {
    const sid = currentSessionRef.current
    if (!sid) return
    try {
      await chatApi.abortSession(sid)
    } catch {
      // ignore
    }
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    syncMessages([])
    loadedSessionRef.current = null
    setChatError(null)
    setIsStreaming(false)
    childSessionIdsRef.current.clear()
    childBoundaryInjectedRef.current.clear()
  }, [syncMessages])

  useEffect(() => {
    agentsApi.fetchAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false))
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  useEffect(() => {
    setGlobalError(sessionError || chatError)
  }, [sessionError, chatError])

  useEffect(() => {
    if (!isStreaming) refreshSessions()
  }, [isStreaming, refreshSessions])

  const currentSession = sessions.find((s) => s.sessionId === currentSessionId)

  const value: ChatContextValue = {
    sessions, sessionsLoading, isCreating, sessionError,
    createSession, refreshSessions,
    messages, messagesLoading, isStreaming, chatError,
    loadHistory, sendMessage, clearMessages,
    currentSessionId, setCurrentSessionId, currentSession,
    feedbackStates, submitFeedback,
    inputValue, setInputValue,
    sidebarOpen, setSidebarOpen, globalError, setGlobalError,
    abortMessage,
    agents, agentsLoading, selectedAgent, setSelectedAgent,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
      {pendingPermission && (
        <PermissionDialog
          request={pendingPermission}
          onClose={() => setPendingPermission(null)}
        />
      )}
    </ChatContext.Provider>
  )
}
