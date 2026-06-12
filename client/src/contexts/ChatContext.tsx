import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { createCtx } from '../lib/utils'
import type { ChatMessage, ChatPart, TextPart } from '../types/message'
import type { SessionListItem } from '../types/api-responses'
import type { FeedbackState } from '../hooks/useFeedback'
import * as sessionsApi from '../api/sessions'
import * as chatApi from '../api/chat'
import * as agentsApi from '../api/agents'
import type { AgentOption } from '../types/api-responses'
import { useEvents, type ConnectionStatus } from '../hooks/useEvents'
import { useFeedback } from '../hooks/useFeedback'
import {
  useMessageStore,
  isTaskToolPart,
  getMsgInfo,
  setMsgInfo,
  getPartText,
  setPartText,
} from '../hooks/useMessageStore'
import type { SessionMeta } from '../hooks/useMessageStore'
import { useSessionNavigation } from '../hooks/useSessionNavigation'
import { PermissionDialog } from '../components/common/PermissionDialog'
import type { PermissionRequest } from '../api/permission'

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

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const sessionsLoadedRef = useRef(false)

  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const loadedSessionRef = useRef<string | null>(null)

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const currentSessionRef = useRef<string | null>(null)

  const [inputValue, setInputValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { feedbackStates, submitFeedback } = useFeedback()

  // === 多会话消息存储 ===
  const {
    allMessages, sessionMeta, taskCallToChild,
    getSessionMessages, setSessionMessages,
    flushAllMessages, flushSessionMeta,
    getSessionMeta, setSessionMetaEntry, ensureSessionMeta,
    hasSessionMessages, hasTaskCallToChild, addTaskCallToChild,
    scheduleFlush, scheduleBackgroundFlush,
    flushSession, injectPartToSession, syncMessages,
    rebuildTaskCallToChildMapping,
  } = useMessageStore(currentSessionRef)

  // === 导航 ===
  const onNavigate = useCallback((sessionId: string) => {
    loadedSessionRef.current = sessionId
    setCurrentSessionId(sessionId)
    if (!hasSessionMessages(sessionId)) {
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
  }, [hasSessionMessages, setSessionMessages, flushAllMessages])

  const {
    navigationStack, parentSessionId,
    navigateToSession, navigateBack, navigateToParent,
    resetNavigationStack,
  } = useSessionNavigation(
    currentSessionId,
    currentSessionRef,
    getSessionMeta,
    onNavigate,
  )

  const messages = useMemo(() => {
    if (!currentSessionId) return [] as ChatMessage[]
    return allMessages.get(currentSessionId) ?? []
  }, [currentSessionId, allMessages])

  // === 会话列表管理 ===

  const refreshSessions = useCallback(async () => {
    try {
      setSessionError(null)
      const data = await sessionsApi.fetchSessions()
      setSessions(data)
      for (const s of data) {
        ensureSessionMeta(s.sessionId, { title: s.title })
      }
      setTimeout(() => rebuildTaskCallToChildMapping(), 0)
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载会话列表失败'
      setSessionError(msg)
      return []
    } finally {
      setSessionsLoading(false)
    }
  }, [ensureSessionMeta, rebuildTaskCallToChildMapping])

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
    resetNavigationStack()
    setMessagesLoading(true)
    setChatError(null)
    try {
      const data = await sessionsApi.fetchMessages(sessionId)
      setSessionMessages(sessionId, data)
      syncMessages(data)
      setTimeout(() => rebuildTaskCallToChildMapping(), 0)
    } catch (e) {
      setSessionMessages(sessionId, [])
      syncMessages([])
      setChatError(e instanceof Error ? e.message : '加载消息历史失败')
    } finally {
      setMessagesLoading(false)
    }
  }, [resetNavigationStack, setSessionMessages, syncMessages, rebuildTaskCallToChildMapping])

  // === SSE 事件处理 ===

  const { connectionStatus } = useEvents({
    onReconnected: useCallback(() => {
      const sid = currentSessionRef.current
      if (!sid) return
      sessionsApi.fetchMessages(sid).then(data => {
        setSessionMessages(sid, data)
        flushAllMessages()
      }).catch(() => {})
    }, [setSessionMessages, flushAllMessages]),

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

    onPartUpdated(part, messageID, sessionID) {
      if (!sessionID) return
      if (part.type === 'compaction' || part.type === 'retry') return

      const msgs = getSessionMessages(sessionID)
      let msgIdx = msgs.findIndex((m) => getMsgInfo(m)?.id === messageID)

      if (msgIdx === -1) {
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

    onSessionUpdated(info) {
      const sid = info.id as string | undefined
      if (!sid) return
      const parentID = info.parentID as string | undefined
      const title = info.title as string | undefined
      const existing = getSessionMeta(sid)
      setSessionMetaEntry(sid, { id: sid, parentID: parentID ?? existing?.parentID, title: title ?? existing?.title })
      flushSessionMeta()

      if (parentID && parentID === currentSessionRef.current) {
        const parentMsgs = getSessionMessages(parentID)
        for (let i = parentMsgs.length - 1; i >= 0; i--) {
          const msg = parentMsgs[i]
          if (msg.role !== 'assistant') continue
          for (let j = msg.parts.length - 1; j >= 0; j--) {
            const p = msg.parts[j]
            if (isTaskToolPart(p)) {
              const tp = p as unknown as Record<string, unknown>
              const callID = tp.callID as string | undefined
              const tpState = tp.state as Record<string, unknown> | undefined
              const status = tpState?.status as string | undefined
              if ((status === 'running' || status === 'completed') && callID && !hasTaskCallToChild(callID)) {
                addTaskCallToChild(callID, sid)
                break
              }
            }
          }
        }
      }

      setTimeout(() => rebuildTaskCallToChildMapping(), 0)
      refreshSessions()
    },

    onToolCalled(sessionID, callID, tool, input) {
      if (!sessionID) return
      injectPartToSession(sessionID, {
        id: callID, messageID: '', sessionID, type: 'tool', callID, tool,
        state: { status: 'running', input, title: tool, time: { start: Date.now() } },
      })
    },

    onToolSuccess(sessionID, callID, output, title, time) {
      if (!sessionID) return
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
      const prevText = existing && 'text' in existing ? (existing as unknown as Record<string, unknown>).text as string : ''
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

  // === 消息发送 ===

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
    } catch {}
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    if (currentSessionRef.current) {
      setSessionMessages(currentSessionRef.current, [])
    }
    loadedSessionRef.current = null
    setChatError(null)
    setIsStreaming(false)
    resetNavigationStack()
    flushAllMessages()
  }, [setSessionMessages, resetNavigationStack, flushAllMessages])

  // === 副作用 ===

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
    allMessages, sessionMeta, taskCallToChild, navigationStack, parentSessionId,
    navigateToSession, navigateBack, navigateToParent,
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
