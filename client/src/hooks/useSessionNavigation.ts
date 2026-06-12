import { useReducer, useRef, useCallback, useMemo } from 'react'
import type { SessionMeta } from './useMessageStore'

interface NavigationState {
  stack: string[]
}

type NavigationAction =
  | { type: 'SET_STACK'; payload: string[] }
  | { type: 'RESET' }

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_STACK':
      return { stack: [...action.payload] }
    case 'RESET':
      return { stack: [] }
    default:
      return state
  }
}

/**
 * 子会话导航栈 Hook
 * 管理多会话之间的导航栈（前进/后退/返回父会话）
 * @param currentSessionId - 当前会话 ID（用于计算 parentSessionId）
 * @param currentSessionRef - 当前会话 ID 引用（mutable）
 * @param getSessionMeta - 从 ref 读取会话元数据（保证即时性）
 * @param onNavigate - 切换会话时的回调
 */
export function useSessionNavigation(
  currentSessionId: string | null,
  currentSessionRef: React.MutableRefObject<string | null>,
  getSessionMeta: (id: string) => SessionMeta | undefined,
  onNavigate: (sessionId: string) => void,
) {
  const navigationStackRef = useRef<string[]>([])
  const [navState, dispatch] = useReducer(navigationReducer, { stack: [] })

  const parentSessionId = useMemo(() => {
    if (!currentSessionId) return null
    return getSessionMeta(currentSessionId)?.parentID ?? null
  }, [currentSessionId, getSessionMeta])

  const navigateToSession = useCallback((sessionId: string) => {
    if (!currentSessionRef.current) return
    navigationStackRef.current = [...navigationStackRef.current, currentSessionRef.current]
    dispatch({ type: 'SET_STACK', payload: navigationStackRef.current })
    currentSessionRef.current = sessionId
    onNavigate(sessionId)
  }, [currentSessionRef, onNavigate])

  const navigateBack = useCallback(() => {
    const stack = navigationStackRef.current
    if (stack.length === 0) return
    const prevSession = stack[stack.length - 1]
    navigationStackRef.current = stack.slice(0, -1)
    dispatch({ type: 'SET_STACK', payload: navigationStackRef.current })
    currentSessionRef.current = prevSession
    onNavigate(prevSession)
  }, [currentSessionRef, onNavigate])

  const navigateToParent = useCallback(() => {
    if (!currentSessionRef.current) return
    const meta = getSessionMeta(currentSessionRef.current)
    if (meta?.parentID) {
      navigateToSession(meta.parentID)
    }
  }, [currentSessionRef, getSessionMeta, navigateToSession])

  const resetNavigationStack = useCallback(() => {
    navigationStackRef.current = []
    dispatch({ type: 'RESET' })
  }, [])

  return {
    navigationStack: navState.stack,
    parentSessionId,
    navigateToSession,
    navigateBack,
    navigateToParent,
    resetNavigationStack,
  }
}
