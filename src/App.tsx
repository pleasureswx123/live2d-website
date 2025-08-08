import { useState, useRef } from 'react'
import LoginPage from '@/components/pages/LoginPage'
import ChatPage from '@/components/pages/ChatPage'
import HistoryPage from '@/components/pages/HistoryPage'
import Live2DStage from '@/components/Live2DStage'
import ChatOverlay from '@/components/ChatOverlay'

export type PageType = 'login' | 'chat' | 'history'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login')
  const [anchor, setAnchor] = useState<{x: number, y: number} | null>(null)

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLoginSuccess={() => setCurrentPage('chat')} />
      case 'chat':
        return (
          <ChatPage
            onNavigateToHistory={() => setCurrentPage('history')}
          />
        )
      case 'history':
        return <HistoryPage onBack={() => setCurrentPage('chat')} />
      default:
        return <LoginPage onLoginSuccess={() => setCurrentPage('chat')} />
    }
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* 背景视频 - 只在chat页面显示 */}
      {currentPage === 'chat' && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video/live2d_bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Live2D Stage - 只在chat页面显示 */}
      {currentPage === 'chat' && (
        <Live2DStage
          modelUrl="/models/youyou/youyou.model3.json"
          onAnchor={(pt) => setAnchor(pt)}
        />
      )}

      {/* Chat Overlay - 只在chat页面显示 */}
      {currentPage === 'chat' && <ChatOverlay anchor={anchor} />}

      {renderPage()}
    </div>
  )
}

export default App
