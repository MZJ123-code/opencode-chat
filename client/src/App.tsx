import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './components/layout/Sidebar'
import { ChatArea } from './components/layout/ChatArea'
import { SidebarHeader } from './components/sidebar/SidebarHeader'
import { SessionList } from './components/sidebar/SessionList'
import { ChatHeader } from './components/chat/ChatHeader'
import { MessageList } from './components/chat/MessageList'
import { ChatInput } from './components/chat/ChatInput'
import { AgentSelector } from './components/chat/AgentSelector'
import { ErrorBanner } from './components/common/ErrorBanner'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { TaiyiAvatar } from './components/chat/TaiyiAvatar'
import type { TaiyiMood } from './components/chat/TaiyiAvatar'
import { useChatContext } from './contexts/ChatContext'
import { recordVisit } from './api/stats'

type View = 'chat' | 'dashboard'

/** 应用根组件 */
export default function App() {
  const [view, setView] = useState<View>(() =>
    window.location.hash === '#dashboard' ? 'dashboard' : 'chat'
  )
  const {
    currentSessionId, setCurrentSessionId, currentSession,
    sessions, sessionsLoading, isCreating,
    messages, messagesLoading, isStreaming,
    feedbackStates, submitFeedback,
    inputValue, setInputValue,
    sidebarOpen, setSidebarOpen,
    globalError, setGlobalError,
    createSession, loadHistory, clearMessages, sendMessage, abortMessage,
    agents, agentsLoading, setSelectedAgent,
  } = useChatContext()

  useEffect(() => {
    recordVisit()
  }, [])

  // 监听 hash 变化切换看板
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#dashboard') {
        setView('dashboard')
      } else {
        setView(v => v === 'dashboard' ? 'chat' : v)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleHideDashboard = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname)
    setView('chat')
  }, [])

  const handleCreateSession = useCallback(async (agent?: string) => {
    const id = await createSession(agent)
    if (id) {
      setCurrentSessionId(id)
      clearMessages()
      setInputValue('')
      await loadHistory(id)
    }
  }, [createSession, clearMessages, loadHistory, setCurrentSessionId])

  const handleCreateSessionNoAgent = useCallback(async () => {
    setCurrentSessionId(null)
    clearMessages()
  }, [setCurrentSessionId, clearMessages])

  const handleSelectAgent = useCallback(async (agent: string) => {
    setSelectedAgent(agent)
    await handleCreateSession(agent)
  }, [handleCreateSession, setSelectedAgent])

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    clearMessages()
    setInputValue('')
    await loadHistory(sessionId)
    setSidebarOpen(false)
  }, [loadHistory, clearMessages, setCurrentSessionId])

  const handleSendMessage = useCallback(() => {
    const text = inputValue.trim()
    if (!text || !currentSessionId || isStreaming) return
    setInputValue('')
    sendMessage(text, currentSessionId)
  }, [inputValue, currentSessionId, isStreaming, sendMessage])

  const handleSubmitFeedback = useCallback(async (sessionId: string, satisfied: boolean, msgIdx: number) => {
    await submitFeedback(sessionId, satisfied, msgIdx)
  }, [submitFeedback])

  // 根据聊天状态计算太乙真人表情
  const getTaiyiMood = useCallback((): TaiyiMood => {
    if (isStreaming) return 'thinking'
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant') return 'talking'
    }
    return 'idle'
  }, [isStreaming, messages])

  if (view === 'dashboard') {
    return <DashboardPage onBack={handleHideDashboard} />
  }

  return (
    <>
      <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />

      <Sidebar isOpen={sidebarOpen}>
        <SidebarHeader onCreateClick={handleCreateSessionNoAgent} isCreating={isCreating} />
        <SessionList
          sessions={sessions}
          activeId={currentSessionId}
          onSelect={handleSelectSession}
          isLoading={sessionsLoading}
        />
      </Sidebar>

      <ChatArea>
        <ChatHeader
          title={currentSession?.title || '选择或新建对话'}
          onMenuClick={() => setSidebarOpen((v) => !v)}
        />
        {currentSessionId ? (
          <>
            <MessageList
              messages={messages}
              isLoading={messagesLoading}
              isStreaming={isStreaming}
              sessionId={currentSessionId}
              feedbackStates={feedbackStates}
              onSubmitFeedback={handleSubmitFeedback}
              onStop={abortMessage}
            />
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              disabled={!currentSessionId}
            />
          </>
        ) : (
          <AgentSelector
            agents={agents}
            loading={agentsLoading}
            onSelect={handleSelectAgent}
            creating={isCreating}
          />
        )}
      </ChatArea>

      {/* 浮动太乙真人头像 — Sci-Fi 光环 */}
      {currentSessionId && (
        <motion.div
          className="fixed bottom-24 right-6 z-50"
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
        >
          {/* 外层光环 */}
          <div className="relative">
            <motion.div
              className="absolute -inset-2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.06) 0%, transparent 70%)',
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <TaiyiAvatar
              mood={getTaiyiMood()}
              size={80}
              interactive
            />
          </div>
        </motion.div>
      )}
    </>
  )
}
