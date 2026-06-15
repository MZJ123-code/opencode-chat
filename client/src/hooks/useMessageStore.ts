import { useReducer, useRef, useCallback } from 'react'
import type { ChatMessage, ChatPart, TextPart, ReasoningPart, ToolPart } from '../types/message'

/**
 * 会话元数据
 */
export interface SessionMeta {
  id: string
  parentID?: string
  title?: string
}

interface MessageStoreState {
  allMessages: Map<string, ChatMessage[]>
  sessionMeta: Map<string, SessionMeta>
  taskCallToChild: Map<string, string>
}

type MessageStoreAction =
  | { type: 'FLUSH_MESSAGES'; payload: Map<string, ChatMessage[]> }
  | { type: 'FLUSH_META'; payload: Map<string, SessionMeta> }
  | { type: 'SET_TASK_MAP'; payload: Map<string, string> }

function storeReducer(state: MessageStoreState, action: MessageStoreAction): MessageStoreState {
  switch (action.type) {
    case 'FLUSH_MESSAGES':
      return { ...state, allMessages: new Map(action.payload) }
    case 'FLUSH_META':
      return { ...state, sessionMeta: new Map(action.payload) }
    case 'SET_TASK_MAP':
      return { ...state, taskCallToChild: new Map(action.payload) }
    default:
      return state
  }
}

export function isTaskToolPart(part: ChatPart): part is ToolPart {
  return part.type === 'tool' && (part as ToolPart).tool === 'task'
}

export function getMsgInfo(msg: ChatMessage): Record<string, unknown> | undefined {
  return msg.info as Record<string, unknown> | undefined
}

export function setMsgInfo(msg: ChatMessage, info: Record<string, unknown>): ChatMessage {
  ;(msg as unknown as { info: Record<string, unknown> }).info = info
  return msg
}

export function getPartText(part: ChatPart): string | undefined {
  return 'text' in part ? (part as TextPart | ReasoningPart).text : undefined
}

export function setPartText(part: ChatPart, text: string): void {
  if ('text' in part) (part as TextPart | ReasoningPart).text = text
}

/**
 * 多会话消息存储 Hook
 * 管理跨会话的消息数据、元数据、task→child 映射
 * @param currentSessionRef - 当前会话 ID 引用
 */
export function useMessageStore(currentSessionRef: React.MutableRefObject<string | null>) {
  const allMessagesRef = useRef(new Map<string, ChatMessage[]>())
  const sessionMetaRef = useRef(new Map<string, SessionMeta>())
  const taskCallToChildRef = useRef(new Map<string, string>())

  const [state, dispatch] = useReducer(storeReducer, {
    allMessages: new Map(),
    sessionMeta: new Map(),
    taskCallToChild: new Map(),
  })

  const renderPendingRef = useRef(false)
  const bgFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getSessionMessages = useCallback((sessionID: string): ChatMessage[] => {
    let msgs = allMessagesRef.current.get(sessionID)
    if (!msgs) {
      msgs = []
      allMessagesRef.current.set(sessionID, msgs)
    }
    return msgs
  }, [])

  const setSessionMessages = useCallback((sessionID: string, msgs: ChatMessage[]) => {
    allMessagesRef.current.set(sessionID, msgs)
  }, [])

  const flushAllMessages = useCallback(() => {
    dispatch({ type: 'FLUSH_MESSAGES', payload: allMessagesRef.current })
  }, [])

  /** 检查会话是否有已加载的消息（不创建空数组） */
  const hasSessionMessages = useCallback((sessionID: string): boolean => {
    const msgs = allMessagesRef.current.get(sessionID)
    return msgs !== undefined && msgs.length > 0
  }, [])

  const flushSessionMeta = useCallback(() => {
    dispatch({ type: 'FLUSH_META', payload: sessionMetaRef.current })
  }, [])

  const getSessionMeta = useCallback((id: string): SessionMeta | undefined => {
    return sessionMetaRef.current.get(id)
  }, [])

  const setSessionMetaEntry = useCallback((id: string, meta: SessionMeta) => {
    sessionMetaRef.current.set(id, meta)
  }, [])

  const ensureSessionMeta = useCallback((id: string, defaults: Partial<SessionMeta>) => {
    if (!sessionMetaRef.current.has(id)) {
      sessionMetaRef.current.set(id, { id, ...defaults })
    }
  }, [])

  const hasTaskCallToChild = useCallback((callID: string): boolean => {
    return taskCallToChildRef.current.has(callID)
  }, [])

  const addTaskCallToChild = useCallback((callID: string, childID: string) => {
    taskCallToChildRef.current.set(callID, childID)
    dispatch({ type: 'SET_TASK_MAP', payload: new Map(taskCallToChildRef.current) })
  }, [])

  const scheduleFlush = useCallback(() => {
    if (renderPendingRef.current) return
    renderPendingRef.current = true
    requestAnimationFrame(() => {
      renderPendingRef.current = false
      dispatch({ type: 'FLUSH_MESSAGES', payload: allMessagesRef.current })
    })
  }, [])

  const scheduleBackgroundFlush = useCallback(() => {
    if (bgFlushTimerRef.current) return
    bgFlushTimerRef.current = setTimeout(() => {
      bgFlushTimerRef.current = null
      dispatch({ type: 'FLUSH_MESSAGES', payload: allMessagesRef.current })
    }, 500)
  }, [])

  const flushSession = useCallback((sessionID: string) => {
    if (sessionID === currentSessionRef.current) scheduleFlush()
    else scheduleBackgroundFlush()
  }, [currentSessionRef, scheduleFlush, scheduleBackgroundFlush])

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
    dispatch({ type: 'FLUSH_MESSAGES', payload: allMessagesRef.current })
  }, [currentSessionRef, setSessionMessages])

  const rebuildTaskCallToChildMapping = useCallback(() => {
    const parentID = currentSessionRef.current
    if (!parentID) return
    const parentMsgs = getSessionMessages(parentID)
    if (parentMsgs.length === 0) return

    const mapped = new Map(taskCallToChildRef.current)
    let changed = false

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
      dispatch({ type: 'SET_TASK_MAP', payload: mapped })
    }
  }, [currentSessionRef, getSessionMessages])

  return {
    allMessages: state.allMessages,
    sessionMeta: state.sessionMeta,
    taskCallToChild: state.taskCallToChild,

    getSessionMessages,
    setSessionMessages,
    hasSessionMessages,
    flushAllMessages,
    flushSessionMeta,
    getSessionMeta,
    setSessionMetaEntry,
    ensureSessionMeta,
    hasTaskCallToChild,
    addTaskCallToChild,
    scheduleFlush,
    scheduleBackgroundFlush,
    flushSession,
    injectPartToSession,
    syncMessages,
    rebuildTaskCallToChildMapping,
  }
}
