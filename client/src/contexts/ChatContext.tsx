import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createCtx } from '../lib/utils'
import type { ChatMessage, ChatPart, TextPart, ReasoningPart, ToolPart } from '../types/message'
import type { SessionListItem } from '../types/api-responses'
import type { FeedbackState } from '../hooks/useFeedback'
import * as sessionsApi from '../api/sessions'
import * as chatApi from '../api/chat'
import * as agentsApi from '../api/agents'
import type { AgentOption } from '../types/api-responses'
import { useEvents, type ConnectionStatus } from '../hooks/useEvents'
import { useFeedback } from '../hooks/useFeedback'
import { PermissionDialog } from '../components/common/PermissionDialog'
import type { PermissionRequest } from '../api/permission'

/** 会话元数据 */
export interface SessionMeta {
  /** 会话 ID */
  id: string
  /** 父会话 ID（用于多会话导航） */
  parentID?: string
  /** 会话标题 */
  title?: string
}

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

  // Multi-session: child navigation (following opencode web pattern)
  allMessages: Map<string, ChatMessage[]>
  sessionMeta: Map<string, SessionMeta>
  taskCallToChild: Map<string, string>
  navigationStack: string[]
  parentSessionId: string | null
  navigateToSession: (sessionId: string) => void
  navigateBack: () => void
  navigateToParent: () => void

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
  connectionStatus: ConnectionStatus
}

const [ChatContext, useChatContext] = createCtx<ChatContextValue>('useChatContext must be used within ChatProvider')
export { useChatContext }

function isTaskToolPart(part: ChatPart): part is ToolPart {
  return part.type === 'tool' && (part as ToolPart).tool === 'task'
}

/**
 * 聊天上下文提供者
 * @param props - 组件属性
 * @param props.children - 子组件
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const sessionsLoadedRef = useRef(false)

  // === Multi-session message store (like opencode web's state.message[sessionID]) ===
  const [allMessages, setAllMessages] = useState<Map<string, ChatMessage[]>>(new Map())
  const allMessagesRef = useRef<Map<string, ChatMessage[]>>(new Map())

  // Session metadata store (like opencode web's state.session[])
  const [sessionMeta, setSessionMeta] = useState<Map<string, SessionMeta>>(new Map())
  const sessionMetaRef = useRef<Map<string, SessionMeta>>(new Map())

  // Navigation stack for back button (pushed when navigating to child)
  const [navigationStack, setNavigationStack] = useState<string[]>([])
  const navigationStackRef = useRef<string[]>([])

  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const loadedSessionRef = useRef<string | null>(null)
  // Map task tool callID → child sessionID (fallback when metadata.sessionId is missing)
  const taskCallToChildRef = useRef<Map<string, string>>(new Map())
  const [taskCallToChild, setTaskCallToChild] = useState<Map<string, string>>(new Map())

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const currentSessionRef = useRef<string | null>(null)

  const renderPendingRef = useRef(false)
  const bgFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [inputValue, setInputValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { feedbackStates, submitFeedback } = useFeedback()

  // Derived: parent session ID for the current session
  const parentSessionId = useMemo(() => {
    if (!currentSessionId) return null
    return sessionMeta.get(currentSessionId)?.parentID ?? null
  }, [currentSessionId, sessionMeta])

  // Derived: messages for the currently viewed session
  const messages = useMemo(() => {
    if (!currentSessionId) return [] as ChatMessage[]
    return allMessages.get(currentSessionId) ?? []
  }, [currentSessionId, allMessages])

  // === Multi-session helpers ===

  const getSessionMessages = useCallback((sessionID: string): ChatMessage[] => {
    let msgs = allMessagesRef.current.get(sessionID)
    if (!msgs) {
      msgs = []
      allMessagesRef.current.set(sessionID, msgs)
    }
    return msgs
  }, [])

  // Rebuild taskCallToChild mapping by scanning sessionMeta for child sessions
  // and matching them to task tool parts in the current session's messages.
  // This handles cases where: (a) child sessions existed before page load,
  // (b) user navigates to a parent session via sidebar/history.
  const rebuildTaskCallToChildMapping = useCallback(() => {
    const parentID = currentSessionRef.current
    if (!parentID) return
    const parentMsgs = getSessionMessages(parentID)
    if (parentMsgs.length === 0) return

    const mapped = new Map(taskCallToChildRef.current)
    let changed = false

    // Find all task tool callIDs in the parent session
    const taskCalls: { callID: string; status: string }[] = []
    for (const msg of parentMsgs) {
      if (msg.role !== 'assistant') continue
      for (const p of msg.parts) {
        if (isTaskToolPart(p)) {
          const tp = p as ToolPart
          if (tp.callID && !mapped.has(tp.callID)) {
            taskCalls.push({ callID: tp.callID, status: tp.state?.status || '' })
          }
        }
      }
    }

    // Find child sessions for this parent (not yet mapped)
    const unmapped = taskCalls.filter((tc) => tc.status === 'running' || tc.status === 'completed')
    if (unmapped.length === 0) return

    let unmatchedChildren = 0
    sessionMetaRef.current.forEach((meta, childID) => {
      if (meta.parentID !== parentID) return
      if (Array.from(mapped.values()).includes(childID)) return
      const tc = unmapped.shift()
      if (tc) {
        mapped.set(tc.callID, childID)
        changed = true
      } else {
        unmatchedChildren++
      }
    })

    if (unmatchedChildren > 0 || unmapped.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(`[taskCallToChild] 匹配不完整: ${unmatchedChildren} 个子会话未匹配, ${unmapped.length} 个 task 调用无子会话, parent=${parentID}`)
      }
    }

    if (changed) {
      taskCallToChildRef.current = mapped
      setTaskCallToChild(new Map(mapped))
    }
  }, [getSessionMessages])

  const setSessionMessages = useCallback((sessionID: string, msgs: ChatMessage[]) => {
    allMessagesRef.current.set(sessionID, msgs)
  }, [])

  const flushAllMessages = useCallback(() => {
    setAllMessages(new Map(allMessagesRef.current))
  }, [])

  const flushSessionMeta = useCallback(() => {
    setSessionMeta(new Map(sessionMetaRef.current))
  }, [])

  const scheduleFlush = useCallback(() => {
    if (renderPendingRef.current) return
    renderPendingRef.current = true
    requestAnimationFrame(() => {
      renderPendingRef.current = false
      flushAllMessages()
    })
  }, [flushAllMessages])

  // Flush non-current session updates at a lower frequency (every 500ms max)
  const scheduleBackgroundFlush = useCallback(() => {
    if (bgFlushTimerRef.current) return
    bgFlushTimerRef.current = setTimeout(() => {
      bgFlushTimerRef.current = null
      flushAllMessages()
    }, 500)
  }, [flushAllMessages])

  const flushSession = useCallback((sessionID: string) => {
    if (sessionID === currentSessionRef.current) scheduleFlush()
    else scheduleBackgroundFlush()
  }, [scheduleFlush, scheduleBackgroundFlush])

  // === Inject a part into a specific session's last assistant message ===
  const injectPartToSession = useCallback((sessionID: string, part: Record<string, unknown>) => {
    const msgs = getSessionMessages(sessionID)
    let targetIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { targetIdx = i; break }
    }
    if (targetIdx === -1) return

    const msg = { ...msgs[targetIdx] }
    const parts = [...msg.parts]
    const existingIdx = parts.findIndex((p) => p.id === part.id)
    if (existingIdx >= 0) {
      // Deep-merge state so partial updates (e.g. onToolSuccess) don't lose metadata/output
      const existing = parts[existingIdx] as unknown as Record<string, unknown>
      const merged: Record<string, unknown> = { ...existing, ...part }
      if (existing.state && part.state) {
        merged.state = { ...(existing.state as unknown as Record<string, unknown>), ...(part.state as unknown as Record<string, unknown>) }
      }
      parts[existingIdx] = merged as unknown as ChatPart
    } else {
      parts.push(part as unknown as ChatPart)
    }
    msg.parts = parts
    msgs[targetIdx] = msg
    flushSession(sessionID)
  }, [getSessionMessages, flushSession])

  const syncMessages = useCallback((next: ChatMessage[]) => {
    if (!currentSessionRef.current) return
    setSessionMessages(currentSessionRef.current, next)
    setAllMessages(new Map(allMessagesRef.current))
  }, [setSessionMessages])

  // Helper to get/set `info` property from a message
  function getMsgInfo(msg: ChatMessage): Record<string, unknown> | undefined {
    return msg.info as Record<string, unknown> | undefined
  }

  function setMsgInfo(msg: ChatMessage, info: Record<string, unknown>): ChatMessage {
    ;(msg as unknown as { info: Record<string, unknown> }).info = info
    return msg
  }

  function getPartText(part: ChatPart): string | undefined {
    return 'text' in part ? (part as TextPart | ReasoningPart).text : undefined
  }

  function setPartText(part: ChatPart, text: string): void {
    if ('text' in part) (part as TextPart | ReasoningPart).text = text
  }

  // === Navigation (following opencode web's session tree navigation) ===

  const navigateToSession = useCallback((sessionId: string) => {
    if (!currentSessionRef.current) return
    // Push current session onto navigation stack
    navigationStackRef.current = [...navigationStackRef.current, currentSessionRef.current]
    setNavigationStack([...navigationStackRef.current])
    // Switch to new session
    currentSessionRef.current = sessionId
    setCurrentSessionId(sessionId)
    loadedSessionRef.current = sessionId
    // Load history if not already loaded
    const existing = allMessagesRef.current.get(sessionId)
    if (!existing || existing.length === 0) {
      setMessagesLoading(true)
      sessionsApi.fetchMessages(sessionId).then(data => {
        setSessionMessages(sessionId, data)
        setMessagesLoading(false)
        flushAllMessages()
      }).catch(() => {
        setSessionMessages(sessionId, [])
        setMessagesLoading(false)
        flushAllMessages()
      })
    } else {
      flushAllMessages()
    }
  }, [setSessionMessages, flushAllMessages])

  const navigateBack = useCallback(() => {
    const stack = navigationStackRef.current
    if (stack.length === 0) return
    const prevSession = stack[stack.length - 1]
    navigationStackRef.current = stack.slice(0, -1)
    setNavigationStack([...navigationStackRef.current])
    currentSessionRef.current = prevSession
    setCurrentSessionId(prevSession)
    loadedSessionRef.current = prevSession
    flushAllMessages()
  }, [flushAllMessages])

  const navigateToParent = useCallback(() => {
    if (!currentSessionRef.current) return
    const meta = sessionMetaRef.current.get(currentSessionRef.current)
    if (meta?.parentID) {
      navigateToSession(meta.parentID)
    }
  }, [navigateToSession])

  // === Session list management ===

  const refreshSessions = useCallback(async () => {
    try {
      setSessionError(null)
      const data = await sessionsApi.fetchSessions()
      setSessions(data)
      // Also update sessionMeta from session list
      for (const s of data) {
        if (!sessionMetaRef.current.has(s.sessionId)) {
          sessionMetaRef.current.set(s.sessionId, {
            id: s.sessionId,
            title: s.title,
          })
        }
      }
      // Rebuild child session mapping after refreshing session list
      setTimeout(() => rebuildTaskCallToChildMapping(), 0)
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载会话列表失败'
      setSessionError(msg)
      return []
    } finally {
      setSessionsLoading(false)
    }
  }, [rebuildTaskCallToChildMapping])

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
    // Reset navigation when explicitly loading a session from sidebar
    navigationStackRef.current = []
    setNavigationStack([])
    setMessagesLoading(true)
    setChatError(null)
    try {
      const data = await sessionsApi.fetchMessages(sessionId)
      setSessionMessages(sessionId, data)
      syncMessages(data)
      // Rebuild child session mapping after loading history
      setTimeout(() => rebuildTaskCallToChildMapping(), 0)
    } catch (e) {
      setSessionMessages(sessionId, [])
      syncMessages([])
      setChatError(e instanceof Error ? e.message : '加载消息历史失败')
    } finally {
      setMessagesLoading(false)
    }
  }, [setSessionMessages, syncMessages, rebuildTaskCallToChildMapping])

  // === Event handlers — route by sessionID (like opencode web's applyDirectoryEvent) ===

  const { connectionStatus } = useEvents({
    onReconnected: useCallback(() => {
      const sid = currentSessionRef.current
      if (!sid) return
      sessionsApi.fetchMessages(sid).then(data => {
        setSessionMessages(sid, data)
        flushAllMessages()
      }).catch(() => {
        // 静默失败，等下一次 SSE 事件填补
      })
    }, [setSessionMessages, flushAllMessages]),

    // message.updated → store message in the correct session
    onMessageUpdated(messageInfo) {
      const sid = messageInfo.sessionID as string
      if (!sid) return
      const id = messageInfo.id as string
      const msgs = getSessionMessages(sid)
      const idx = msgs.findIndex((m) => getMsgInfo(m)?.id === id)

      if (idx === -1) {
        const role = (messageInfo.role as 'user' | 'assistant') || 'assistant'
        if (role === 'user') {
          const lastUserIdx = msgs.findLastIndex((m) => m.role === 'user' && !getMsgInfo(m)?.id)
          if (lastUserIdx !== -1) {
            msgs[lastUserIdx] = setMsgInfo(msgs[lastUserIdx], messageInfo)
            setSessionMessages(sid, msgs)
            if (sid === currentSessionRef.current) flushAllMessages()
            return
          }
        }
        const newMsg: ChatMessage = {
          role,
          parts: [],
          time: messageInfo.time ? (messageInfo.time as { start: number }).start : Date.now(),
        }
        msgs.push(setMsgInfo(newMsg, messageInfo))
        setSessionMessages(sid, msgs)
      } else {
        msgs[idx] = setMsgInfo(msgs[idx], messageInfo)
        setSessionMessages(sid, msgs)
      }

      flushSession(sid)
    },

    onMessageRemoved(sessionID, messageID) {
      if (!sessionID) return
      const msgs = getSessionMessages(sessionID).filter((m) => getMsgInfo(m)?.id !== messageID)
      setSessionMessages(sessionID, msgs)
      flushSession(sessionID)
    },

    // message.part.updated → store part in the correct session's message
    onPartUpdated(part, messageID, sessionID) {
      if (!sessionID) return
      if (part.type === 'compaction' || part.type === 'retry') return

      const msgs = getSessionMessages(sessionID)
      let msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)

      if (msgIdx === -1) {
        // New message
        const newMsg: ChatMessage = { role: 'assistant', parts: [part], time: Date.now() }
        msgs.push(setMsgInfo(newMsg, { id: messageID, sessionID }))
        setSessionMessages(sessionID, msgs)
        if (sessionID === currentSessionRef.current) scheduleFlush()
        else scheduleBackgroundFlush()
        return
      }

      const msg = { ...msgs[msgIdx] }
      const parts = [...msg.parts]
      const partIdx = parts.findIndex((p) => p.id === part.id)

      if (partIdx === -1) {
        const existingTextIdx = msg.parts.findIndex((p) => p.type === 'text')
        if (msg.role === 'user' && part.type === 'text' && existingTextIdx !== -1) {
          const updatedPart: Record<string, unknown> = { ...parts[existingTextIdx], id: part.id, messageID: part.messageID }
          updatedPart.text = 'text' in part ? (part as TextPart).text : undefined
          parts[existingTextIdx] = updatedPart as unknown as ChatPart
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
      msgs[msgIdx] = msg
      setSessionMessages(sessionID, msgs)
      flushSession(sessionID)
    },

    // message.part.delta → apply delta to part in the correct session
    onPartDelta(partID, messageID, sessionID, delta) {
      if (!sessionID) return

      const msgs = getSessionMessages(sessionID)
      const msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)
      if (msgIdx === -1) return

      const msg = { ...msgs[msgIdx] }
      const parts = [...msg.parts]
      const partIdx = parts.findIndex((p) => p.id === partID)
      if (partIdx === -1) return

      const part = { ...parts[partIdx] }
      if (part.type === 'text' || part.type === 'reasoning') {
        setPartText(part, (getPartText(part) || '') + delta)
      }
      parts[partIdx] = part
      msg.parts = parts
      msgs[msgIdx] = msg
      setSessionMessages(sessionID, msgs)
      flushSession(sessionID)
    },

    onPartRemoved(sessionID, messageID, partID) {
      if (!sessionID) return
      const msgs = getSessionMessages(sessionID)
      const msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)
      if (msgIdx === -1) return
      const msg = { ...msgs[msgIdx] }
      msg.parts = msg.parts.filter((p) => p.id !== partID)
      msgs[msgIdx] = msg
      setSessionMessages(sessionID, msgs)
      if (sessionID === currentSessionRef.current) flushAllMessages()
    },

    // session.status → only affect isStreaming for the currently viewed session
    onSessionStatus(sessionID, status) {
      if (sessionID !== currentSessionRef.current) return
      const s = typeof status === 'string' ? status : (status as Record<string, unknown>).status as string
      if (s === 'completed' || s === 'idle') setIsStreaming(false)
      else if (s === 'running') setIsStreaming(true)
    },

    onSessionIdle(sessionID) {
      if (sessionID === currentSessionRef.current) setIsStreaming(false)
    },

    onSessionError(sessionID, err) {
      if (sessionID !== currentSessionRef.current) return
      setChatError(err.message as string || '未知错误')
      setIsStreaming(false)
    },

    // session.created / session.updated → record session metadata (parentID, title)
    onSessionUpdated(info) {
      const sid = info.id as string | undefined
      if (!sid) return
      const parentID = info.parentID as string | undefined
      const title = info.title as string | undefined
      const existing = sessionMetaRef.current.get(sid)
      sessionMetaRef.current.set(sid, {
        id: sid,
        parentID: parentID ?? existing?.parentID,
        title: title ?? existing?.title,
      })
      flushSessionMeta()

      // Map child session to its parent's task tool call.
      // Removed `!existing` check: now also handles sessions that were created
      // before page load or while the user was viewing a different session.
      if (parentID && parentID === currentSessionRef.current) {
        const parentMsgs = getSessionMessages(parentID)
        for (let i = parentMsgs.length - 1; i >= 0; i--) {
          const msg = parentMsgs[i]
          if (msg.role !== 'assistant') continue
          for (let j = msg.parts.length - 1; j >= 0; j--) {
            const p = msg.parts[j]
            if (isTaskToolPart(p)) {
              const tp = p as ToolPart
              if ((tp.state?.status === 'running' || tp.state?.status === 'completed') && tp.callID && !taskCallToChildRef.current.has(tp.callID)) {
                taskCallToChildRef.current.set(tp.callID, sid)
                setTaskCallToChild(new Map(taskCallToChildRef.current))
                break
              }
            }
          }
        }
      }

      // Also run rebuild for other parent sessions that may have pending mappings
      setTimeout(() => rebuildTaskCallToChildMapping(), 0)

      // Refresh session list when new sessions appear
      refreshSessions()
    },

    // session.next.* events — real-time tool/reasoning display for parent session
    onToolCalled(sessionID, callID, tool, input) {
      if (!sessionID) return
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool,
        state: { status: 'running', input, title: tool, time: { start: Date.now() } },
      })
    },
    onToolSuccess(sessionID, callID, output, title, time) {
      if (!sessionID) return
      // Only include defined fields so the deep-merge preserves existing state values
      const state: Record<string, unknown> = { status: 'completed' as const }
      if (output !== undefined) state.output = output
      if (title !== undefined) state.title = title
      if (time !== undefined) state.time = time
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool: title || '',
        state,
      })
    },
    onToolFailed(sessionID, callID, error) {
      if (!sessionID) return
      const state: Record<string, unknown> = { status: 'error' as const }
      if (error !== undefined) state.error = error
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool: '',
        state,
      })
    },

    onReasoningDelta(sessionID, reasoningID, delta) {
      if (!sessionID) return
      const msgs = getSessionMessages(sessionID)
      let targetIdx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') { targetIdx = i; break }
      }
      if (targetIdx === -1) return
      const existing = msgs[targetIdx].parts.find((p) => p.id === reasoningID)
      const prevText = existing && 'text' in existing ? (existing as ReasoningPart).text : ''
      injectPartToSession(sessionID, {
        id: reasoningID, messageID: '', sessionID, type: 'reasoning', text: prevText + delta,
      })
    },
    onReasoningEnded(sessionID, reasoningID, text) {
      if (!sessionID) return
      injectPartToSession(sessionID, {
        id: reasoningID, messageID: '', sessionID, type: 'reasoning', text,
      })
    },

    onShellStarted(sessionID, callID, command) {
      if (!sessionID) return
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool: 'shell',
        state: { status: 'running', input: { command }, title: command, time: { start: Date.now() } },
      })
    },
    onShellEnded(sessionID, callID, output) {
      if (!sessionID) return
      const state: Record<string, unknown> = { status: 'completed' as const, title: 'shell' }
      if (output !== undefined) state.output = output
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool: 'shell',
        state,
      })
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

  // === Message sending ===

  const sendMessage = useCallback(async (text: string, sessionId: string) => {
    setChatError(null)
    setIsStreaming(true)

    const userMsg: ChatMessage = {
      role: 'user',
      parts: [{ id: `local-${Date.now()}`, type: 'text', text, messageID: '', sessionID: sessionId }],
      time: Date.now(),
    }

    const msgs = getSessionMessages(sessionId)
    msgs.push(userMsg)
    setSessionMessages(sessionId, msgs)
    flushAllMessages()

    const session = sessions.find((s) => s.sessionId === sessionId)
    const agent = session?.agent || selectedAgent || undefined

    try {
      await chatApi.sendMessageAsync(sessionId, text, agent)
    } catch (e) {
      setChatError(e instanceof Error ? e.message : '发送失败')
      setIsStreaming(false)
    }
  }, [getSessionMessages, setSessionMessages, flushAllMessages, sessions, selectedAgent])

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
    if (currentSessionRef.current) {
      setSessionMessages(currentSessionRef.current, [])
    }
    loadedSessionRef.current = null
    setChatError(null)
    setIsStreaming(false)
    navigationStackRef.current = []
    setNavigationStack([])
    flushAllMessages()
  }, [setSessionMessages, flushAllMessages])

  useEffect(() => {
    agentsApi.fetchAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false))
  }, [])

  const loadSessionsRef = useRef(loadSessions)
  loadSessionsRef.current = loadSessions
  useEffect(() => { loadSessionsRef.current() }, [])

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
    // Multi-session
    allMessages, sessionMeta, taskCallToChild, navigationStack, parentSessionId,
    navigateToSession, navigateBack, navigateToParent,
    // Rest
    feedbackStates, submitFeedback,
    inputValue, setInputValue,
    sidebarOpen, setSidebarOpen, globalError, setGlobalError,
    abortMessage,
    agents, agentsLoading, selectedAgent, setSelectedAgent,
    connectionStatus,
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
