import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Send, Mic, MicOff, History } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import ControlPanel from '@/components/ControlPanel'

interface ChatPageProps {
  onNavigateToHistory: () => void
}

const ChatPage: React.FC<ChatPageProps> = ({
  onNavigateToHistory
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)

  const { state: chatState, controls: chatControls } = useChat()

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!chatState.currentInput.trim()) return

    const userMessage = chatState.currentInput
    await chatControls.sendMessage(userMessage)

    // 模拟 LLM 回复并添加到 ChatOverlay
    const assistantReply = `收到：${userMessage}`

    // 通过全局事件通知 ChatOverlay
    window.dispatchEvent(new CustomEvent('chatMessage', {
      detail: { role: 'assistant', text: assistantReply }
    }))

    // 播放随机表情和动作（通过全局Live2D实例）
    const live2d = (window as any).__live2d
    if (live2d?.model) {
      const director = live2d.model.__director
      if (director) {
        const expressions = ['wenroudexiao', 'haixiu', 'jingxi', 'hahadadxiao']
        const randomExpression = expressions[Math.floor(Math.random() * expressions.length)]
        director.setExpression(randomExpression)

        setTimeout(() => {
          director.playMotion('TapBody', { index: Math.floor(Math.random() * 3) })
        }, 500)
      }
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
    <div className="relative w-full h-screen overflow-hidden">


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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsControlPanelOpen(true)}
          className="p-3 bg-black/50 backdrop-blur-sm border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"
        >
          <Settings size={20} />
        </motion.button>
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

      {/* 控制面板 */}
      <ControlPanel
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
      />
    </div>
  )
}

export default ChatPage
