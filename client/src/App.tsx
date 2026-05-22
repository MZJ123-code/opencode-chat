import { useCallback } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { ChatArea } from './components/layout/ChatArea'
import { SidebarHeader } from './components/sidebar/SidebarHeader'
import { SessionList } from './components/sidebar/SessionList'
import { ChatHeader } from './components/chat/ChatHeader'
import { MessageList } from './components/chat/MessageList'
import { ChatInput } from './components/chat/ChatInput'
import { AgentSelector } from './components/chat/AgentSelector'
import { ErrorBanner } from './components/common/ErrorBanner'
import { useChatContext } from './contexts/ChatContext'

export default function App() {
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
    </>
  )
}
