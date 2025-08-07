import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, MessageCircle, Calendar, Search, Filter } from 'lucide-react'
import { getChatHistory, deleteChatHistory, clearAllChatHistory, type ChatMessage } from '@/hooks/useChat'

interface HistoryPageProps {
  onBack: () => void
}

interface ChatSession {
  id: string
  messages: ChatMessage[]
  timestamp: string
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // 加载聊天历史
  useEffect(() => {
    const history = getChatHistory()
    setChatSessions(history.reverse()) // 最新的在前面
  }, [])

  // 过滤聊天记录
  const filteredSessions = chatSessions.filter(session => {
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const hasMatchingMessage = session.messages.some(msg =>
        msg.content.toLowerCase().includes(searchLower)
      )
      if (!hasMatchingMessage) return false
    }

    // 时间过滤
    if (filterType !== 'all') {
      const sessionDate = new Date(session.timestamp)
      const now = new Date()
      const diffTime = now.getTime() - sessionDate.getTime()
      const diffDays = diffTime / (1000 * 3600 * 24)

      switch (filterType) {
        case 'today':
          if (diffDays > 1) return false
          break
        case 'week':
          if (diffDays > 7) return false
          break
        case 'month':
          if (diffDays > 30) return false
          break
      }
    }

    return true
  })

  // 删除单个聊天记录
  const handleDeleteSession = (sessionId: string) => {
    deleteChatHistory(sessionId)
    setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null)
    }
  }

  // 清空所有聊天记录
  const handleClearAll = () => {
    if (confirm('确定要清空所有聊天记录吗？此操作不可恢复。')) {
      clearAllChatHistory()
      setChatSessions([])
      setSelectedSession(null)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)

    if (diffDays < 1) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 获取会话预览文本
  const getSessionPreview = (messages: ChatMessage[]) => {
    const lastUserMessage = messages.filter(msg => msg.sender === 'user').pop()
    return lastUserMessage?.content || '无消息内容'
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 顶部导航栏 */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 bg-gray-800 rounded-lg text-cyan-400 hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </motion.button>
            <h1 className="text-xl font-bold text-cyan-400">聊天历史</h1>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearAll}
            className="p-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 size={20} />
          </motion.button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* 搜索和过滤栏 */}
        <div className="mb-6 space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索聊天内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none appearance-none"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* 聊天记录列表 */}
          <div className="lg:col-span-1 bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-cyan-300 flex items-center space-x-2">
                <MessageCircle size={18} />
                <span>聊天记录 ({filteredSessions.length})</span>
              </h2>
            </div>

            <div className="overflow-y-auto h-full">
              <AnimatePresence>
                {filteredSessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>暂无聊天记录</p>
                  </div>
                ) : (
                  filteredSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                        selectedSession?.id === session.id ? 'bg-cyan-400/10 border-cyan-400/30' : ''
                      }`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Calendar size={14} />
                          <span>{formatTime(session.timestamp)}</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session.id)
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2">
                        {getSessionPreview(session.messages)}
                      </p>

                      <div className="mt-2 text-xs text-gray-500">
                        {session.messages.length} 条消息
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 聊天详情 */}
          <div className="lg:col-span-2 bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
            {selectedSession ? (
              <>
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-semibold text-cyan-300">
                    聊天详情 - {formatTime(selectedSession.timestamp)}
                  </h3>
                </div>

                <div className="p-4 overflow-y-auto h-full space-y-4">
                  {selectedSession.messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, x: message.sender === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-cyan-400/20 text-cyan-300'
                            : 'bg-gray-700/50 text-gray-300'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">选择一个聊天记录查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
