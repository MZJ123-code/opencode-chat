import { useEffect, useRef, useCallback } from 'react'
import type { ChatPart } from '../types/message'

export interface OpenCodeEvent {
  id: string
  type: string
  properties: Record<string, unknown>
}

interface EventHandlerMap {
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

export function useEvents(handlers: EventHandlerMap) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(1000)

  const handleEvent = useCallback((event: OpenCodeEvent) => {
    const h = handlersRef.current
    const props = (event.properties || {}) as Record<string, unknown>

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
    function connect() {
      if (esRef.current) esRef.current.close()
      const es = new EventSource('/api/events')
      esRef.current = es

      es.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data) as OpenCodeEvent)
        } catch { /* skip */ }
      }

      es.onerror = () => {
        es.close()
        retryRef.current = Math.min(retryRef.current * 1.5, 30000)
        setTimeout(() => connect(), retryRef.current)
      }

      es.onopen = () => { retryRef.current = 1000 }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [handleEvent])
}
