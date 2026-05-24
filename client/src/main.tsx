import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ChatProvider } from './contexts/ChatContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './styles/global.css'
import './styles/markdown-overrides.css'

/** 应用入口 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
