import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ChatProvider } from './contexts/ChatContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './styles/global.css'
import './styles/markdown-overrides.css'

/** 注册 Service Worker（PWA 离线支持） */
function registerSW() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
    })
  }
}

registerSW()

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
