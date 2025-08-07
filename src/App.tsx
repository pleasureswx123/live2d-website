import { useState, useRef } from 'react'
import LoginPage from '@/components/pages/LoginPage'
import ChatPage from '@/components/pages/ChatPage'
import HistoryPage from '@/components/pages/HistoryPage'
import { useLive2D } from '@/hooks/useLive2D'

export type PageType = 'login' | 'chat' | 'history'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 在App级别管理Live2D状态，避免页面切换时丢失
  const { state: live2dState, controls: live2dControls } = useLive2D(canvasRef)

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLoginSuccess={() => setCurrentPage('chat')} />
      case 'chat':
        return (
          <ChatPage
            onNavigateToHistory={() => setCurrentPage('history')}
            canvasRef={canvasRef}
            live2dState={live2dState}
            live2dControls={live2dControls}
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
      {/* Live2D Canvas - 全局管理 */}
      {currentPage === 'chat' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ width: '100vw', height: '100vh' }}
        />
      )}
      {renderPage()}
    </div>
  )
}

export default App
