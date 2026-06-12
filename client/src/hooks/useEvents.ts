import { useEffect, useRef, useCallback, useState } from 'react'
import type { ChatPart } from '../types/message'

/** SSE 连接状态 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

/** SSE 事件结构 */
export interface OpenCodeEvent {
  /** 事件 ID */
  id: string
  /** 事件类型 */
  type: string
  /** 事件属性 */
  properties: Record<string, unknown>
}

interface EventHandlerMap {
  onReconnected?: () => void
  onMessageUpdated?: (messageInfo: Record<string, unknown>) => void
  onMessageRemoved?: (sessionID: string, messageID: string) => void
  onPartUpdated?: (part: ChatPart, messageID: string, sessionID: string) => void
  onPartDelta?: (partID: string, messageID: string, sessionID: string, delta: string) => void
  onPartRemoved?: (sessionID: string, messageID: string, partID: string) => void
  onSessionUpdated?: (sessionInfo: Record<string, unknown>) => void
  onSessionDeleted?: (sessionInfo: Record<string, unknown>) => void
  onSessionStatus?: (sessionID: string, status: unknown) => void
  onSessionIdle?: (sessionID: string) => void
  onSessionError?: (sessionID: string, error: Record<string, unknown>) => void
  onPermissionAsked?: (permission: Record<string, unknown>) => void
  // session.next.* events
  onToolCalled?: (sessionID: string, callID: string, tool: string, input: Record<string, unknown>) => void
  onToolProgress?: (sessionID: string, callID: string, structured: Record<string, unknown>, content: Array<Record<string, unknown>>) => void
  onToolSuccess?: (sessionID: string, callID: string, output: string, title: string, time: { start: number; end: number }) => void
  onToolFailed?: (sessionID: string, callID: string, error: string) => void
  onReasoningDelta?: (sessionID: string, reasoningID: string, delta: string) => void
  onReasoningEnded?: (sessionID: string, reasoningID: string, text: string) => void
  onShellStarted?: (sessionID: string, callID: string, command: string) => void
  onShellEnded?: (sessionID: string, callID: string, output: string) => void
  onStepEnded?: (sessionID: string, finish: string, cost: number, tokens: Record<string, unknown>) => void
}

/**
 * SSE 事件流 Hook，监听服务端推送的实时事件
 * @param handlers - 事件处理器映射
 * @returns 连接状态
 */
export function useEvents(handlers: EventHandlerMap): { connectionStatus: ConnectionStatus } {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(1000)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectingRef = useRef(false)
  const connectionAttemptRef = useRef(0)
  const lastSeqRef = useRef(0)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const handleEvent = useCallback((event: OpenCodeEvent) => {
    const h = handlersRef.current
    const props = (event.properties || {}) as Record<string, unknown>

    // Debug: set window.__DEBUG_EVENTS__ = true in browser console to trace child session event flow
    if (import.meta.env.DEV && typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__DEBUG_EVENTS__) {
      const pi = props as Record<string, unknown>
      const sid = (pi.sessionID || (pi.info as Record<string, unknown> | undefined)?.sessionID || (pi.info as Record<string, unknown> | undefined)?.id || '?') as string
      const detail = event.type?.startsWith('session.next.')
        ? `${event.type} tool=${pi.tool || pi.callID || ''}`
        : event.type?.startsWith('message.part')
          ? `${event.type} part=${(pi.part as Record<string, unknown>)?.type || ''}`
          : event.type
      console.debug(`[SSE] ${detail} session=${sid}`)
    }

    switch (event.type) {
      case 'message.updated':
        if (props.info) h.onMessageUpdated?.(props.info as Record<string, unknown>)
        break
      case 'message.removed':
        h.onMessageRemoved?.(props.sessionID as string, props.messageID as string)
        break
      case 'message.part.updated': {
        const part = props.part as ChatPart | undefined
        if (part) h.onPartUpdated?.(part, part.messageID, part.sessionID)
        break
      }
      case 'message.part.delta':
        if (props.sessionID && props.partID) {
          h.onPartDelta?.(props.partID as string, props.messageID as string, props.sessionID as string, props.delta as string)
        }
        break
      case 'message.part.removed':
        h.onPartRemoved?.(props.sessionID as string, props.messageID as string, props.partID as string)
        break
      case 'session.updated':
      case 'session.created':
        if (props.info) h.onSessionUpdated?.(props.info as Record<string, unknown>)
        break
      case 'session.deleted':
        if (props.info) h.onSessionDeleted?.(props.info as Record<string, unknown>)
        break
      case 'session.status':
        h.onSessionStatus?.(props.sessionID as string, props.status)
        break
      case 'session.idle':
        h.onSessionIdle?.(props.sessionID as string)
        break
      case 'session.error':
        h.onSessionError?.(props.sessionID as string, (props.error || props) as Record<string, unknown>)
        break
      case 'permission.asked':
        h.onPermissionAsked?.(props as Record<string, unknown>)
        break
      case 'question.asked':
        h.onPermissionAsked?.({
          id: (props as Record<string, unknown>).id as string,
          sessionID: (props as Record<string, unknown>).sessionID as string,
          permission: 'question',
          patterns: [],
          metadata: { questions: (props as Record<string, unknown>).questions },
          always: [],
          tool: (props as Record<string, unknown>).tool
            ? { messageID: ((props as Record<string, unknown>).tool as Record<string, unknown>).messageID as string, callID: ((props as Record<string, unknown>).tool as Record<string, unknown>).callID as string }
            : undefined,
        })
        break
      case 'permission.updated':
        h.onPermissionAsked?.({
          id: (props as Record<string, unknown>).id as string,
          sessionID: (props as Record<string, unknown>).sessionID as string,
          permission: (props as Record<string, unknown>).type as string,
          patterns: (() => {
            const p = (props as Record<string, unknown>).pattern
            return Array.isArray(p) ? p : p ? [p] : []
          })(),
          metadata: (props as Record<string, unknown>).metadata as Record<string, unknown>,
          always: [],
          tool: (props as Record<string, unknown>).callID
            ? { messageID: (props as Record<string, unknown>).messageID as string, callID: (props as Record<string, unknown>).callID as string }
            : undefined,
        })
        break

      // session.next.* events — convert to parts
      case 'session.next.tool.called':
        h.onToolCalled?.(props.sessionID as string, props.callID as string, props.tool as string, props.input as Record<string, unknown>)
        break
      case 'session.next.tool.progress':
        h.onToolProgress?.(props.sessionID as string, props.callID as string, props.structured as Record<string, unknown>, props.content as Array<Record<string, unknown>>)
        break
      case 'session.next.tool.success':
        h.onToolSuccess?.(props.sessionID as string, props.callID as string, props.output as string, props.title as string, props.time as { start: number; end: number })
        break
      case 'session.next.tool.failed':
        h.onToolFailed?.(props.sessionID as string, props.callID as string, props.error as string)
        break
      case 'session.next.reasoning.delta':
        h.onReasoningDelta?.(props.sessionID as string, props.reasoningID as string, props.delta as string)
        break
      case 'session.next.reasoning.ended':
        h.onReasoningEnded?.(props.sessionID as string, props.reasoningID as string, props.text as string)
        break
      case 'session.next.shell.started':
        h.onShellStarted?.(props.sessionID as string, props.callID as string, props.command as string)
        break
      case 'session.next.shell.ended':
        h.onShellEnded?.(props.sessionID as string, props.callID as string, props.output as string)
        break
      case 'session.next.step.ended':
        h.onStepEnded?.(props.sessionID as string, props.finish as string, props.cost as number, props.tokens as Record<string, unknown>)
        break
    }
  }, [])

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped || connectingRef.current) return
      connectingRef.current = true
      connectionAttemptRef.current++
      const isReconnect = connectionAttemptRef.current > 1

      if (esRef.current) esRef.current.close()

      const es = new EventSource(`/api/events${lastSeqRef.current > 0 ? `?since=${lastSeqRef.current}` : ''}`)
      esRef.current = es

      es.onmessage = (e) => {
        retryRef.current = 1000
        try {
          const event = JSON.parse(e.data) as OpenCodeEvent
          handleEvent(event)
          // 跟踪最新序列号用于重连增量回放
          if (e.lastEventId) {
            const seq = parseInt(e.lastEventId, 10)
            if (!isNaN(seq)) lastSeqRef.current = Math.max(lastSeqRef.current, seq)
          } else {
            lastSeqRef.current++
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[SSE] 事件解析失败:', err, e.data)
        }
      }

      es.onerror = () => {
        connectingRef.current = false
        setConnectionStatus('disconnected')
        if (stopped) return
        es.close()
        const delay = retryRef.current
        retryRef.current = Math.min(delay * 2, 30000)
        retryTimerRef.current = setTimeout(() => connect(), delay)
      }

      es.onopen = () => {
        connectingRef.current = false
        setConnectionStatus('connected')
        if (isReconnect) {
          handlersRef.current.onReconnected?.()
        }
      }
    }

    connect()
    return () => {
      stopped = true
      connectingRef.current = false
      esRef.current?.close()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [handleEvent])

  return { connectionStatus }
}
