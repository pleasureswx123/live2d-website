import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Send, Mic, MicOff, History } from 'lucide-react'
import { Drawer } from 'vaul'
import { useChat } from '@/hooks/useChat'
import { getDefaultModelConfig } from '@/config/modelsConfig'
import ControlPanel from '@/components/ControlPanel'
import type { Live2DState, Live2DControls } from '@/hooks/useLive2D'

interface ChatPageProps {
  onNavigateToHistory: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  live2dState: Live2DState
  live2dControls: Live2DControls
}

const ChatPage: React.FC<ChatPageProps> = ({
  onNavigateToHistory,
  live2dState,
  live2dControls
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)

  const { state: chatState, controls: chatControls } = useChat()

  // 加载默认模型
  useEffect(() => {
    const defaultModel = getDefaultModelConfig()
    if (defaultModel && !live2dState.isLoaded && !live2dState.isLoading && !live2dState.error) {
      // 延迟加载，确保PIXI应用已经初始化
      const timer = setTimeout(() => {
        live2dControls.loadModel(defaultModel)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [live2dState.isLoaded, live2dState.isLoading, live2dState.error])

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!chatState.currentInput.trim()) return

    await chatControls.sendMessage(chatState.currentInput)

    // 播放随机表情和动作
    if (live2dState.isLoaded) {
      const expressions = ['wenroudexiao', 'haixiu', 'jingxi', 'hahadadxiao']
      const randomExpression = expressions[Math.floor(Math.random() * expressions.length)]
      live2dControls.playExpression(randomExpression)

      setTimeout(() => {
        live2dControls.playMotion('TapBody', Math.floor(Math.random() * 3))
      }, 500)
    }
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 处理语音输入
  const handleVoiceToggle = () => {
    if (chatState.isListening) {
      chatControls.stopVoiceInput()
    } else {
      chatControls.startVoiceInput()
    }
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 临时占位符 */}
      {!live2dState.isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-cyan-400/30 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-cyan-400 mb-2">悠悠</h3>
            <p className="text-gray-400">
              {live2dState.isLoading ? 'Live2D 模型加载中...' : 'Live2D 模型待加载'}
            </p>
            {live2dState.error && (
              <p className="text-red-400 text-sm mt-2">错误: {live2dState.error}</p>
            )}
            {!live2dState.isLoading && (
              <button
                onClick={() => {
                  const defaultModel = getDefaultModelConfig()
                  if (defaultModel) {
                    live2dControls.loadModel(defaultModel)
                  }
                }}
                className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                加载模型
              </button>
            )}
          </div>
        </div>
      )}

      {/* 加载状态覆盖层 */}
      <AnimatePresence>
        {live2dState.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 text-lg">加载模型中...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {live2dState.error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg z-20"
          >
            {live2dState.error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右上角控制按钮 */}
      <div className="absolute top-6 right-6 flex space-x-3 z-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNavigateToHistory}
          className="p-3 bg-black/50 backdrop-blur-sm border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"
        >
          <History size={20} />
        </motion.button>

        <Drawer.Root direction="right" open={isControlPanelOpen} onOpenChange={setIsControlPanelOpen}>
          <Drawer.Trigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-black/50 backdrop-blur-sm border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"
            >
              <Settings size={20} />
            </motion.button>
          </Drawer.Trigger>

          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Drawer.Content className="bg-gray-900 flex flex-col rounded-l-[10px] h-full fixed top-0 right-0 w-96 z-50">
              <div className="p-4 bg-gray-900 rounded-l-[10px] flex-1 overflow-y-auto">
                <div className="w-1.5 h-12 flex-shrink-0 rounded-full bg-gray-600 mb-8 mx-auto" />
                <ControlPanel
                  live2dState={live2dState}
                  live2dControls={live2dControls}
                />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* 底部对话输入区域 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30">
        <div className="max-w-2xl mx-auto">
          {/* 聊天消息显示 */}
          <AnimatePresence>
            {chatState.messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-4 max-h-40 overflow-y-auto bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/20"
              >
                {chatState.messages.slice(-3).map((message) => (
                  <div
                    key={message.id}
                    className={`mb-2 ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-sm ${
                        message.sender === 'user'
                          ? 'bg-cyan-400/20 text-cyan-300'
                          : 'bg-gray-700/50 text-gray-300'
                      }`}
                    >
                      {message.content}
                    </span>
                  </div>
                ))}

                {/* 打字指示器 */}
                {chatState.isTyping && (
                  <div className="text-left">
                    <span className="inline-block px-3 py-1 rounded-lg text-sm bg-gray-700/50 text-gray-300">
                      <span className="animate-pulse">悠悠正在思考...</span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 输入框 */}
          <div className="relative">
            <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3">
              <input
                ref={inputRef}
                type="text"
                value={chatState.currentInput}
                onChange={(e) => chatControls.setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="与悠悠对话..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
                disabled={chatState.isTyping}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceToggle}
                className={`p-2 rounded-lg transition-colors ${
                  chatState.isListening
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30'
                }`}
              >
                {chatState.isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!chatState.currentInput.trim() || chatState.isTyping}
                className="p-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </motion.button>
            </div>

            {/* 语音识别状态指示 */}
            <AnimatePresence>
              {chatState.isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm"
                >
                  正在听取语音...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage
