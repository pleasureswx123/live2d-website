import { useState, useCallback, useRef } from 'react'

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  type?: 'text' | 'voice'
}

export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  isListening: boolean
  currentInput: string
}

export interface ChatControls {
  sendMessage: (content: string) => Promise<void>
  startVoiceInput: () => void
  stopVoiceInput: () => void
  clearChat: () => void
  setCurrentInput: (input: string) => void
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    isListening: false,
    currentInput: ''
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    // 添加用户消息
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentInput: '',
      isTyping: true
    }))

    try {
      // 模拟AI回复（这里可以接入真实的AI API）
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      const responses = [
        '你好！我是悠悠，很高兴和你聊天！',
        '这是一个很有趣的话题呢～',
        '我明白你的意思，让我想想...',
        '哇，你说得很对！',
        '这让我想起了一些有趣的事情...',
        '你想听我唱首歌吗？',
        '今天天气真不错呢！',
        '我们来聊聊别的话题吧～'
      ]

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text'
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isTyping: false
      }))

      // 保存聊天记录到本地存储
      saveChatHistory([...state.messages, userMessage, assistantMessage])

    } catch (error) {
      console.error('发送消息失败:', error)
      setState(prev => ({ ...prev, isTyping: false }))
    }
  }, [state.messages])

  // 开始语音输入
  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能')
      return
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'zh-CN'

      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true }))
        console.log('开始语音识别')
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setState(prev => ({ 
          ...prev, 
          currentInput: transcript,
          isListening: false 
        }))
        console.log('语音识别结果:', transcript)
      }

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        setState(prev => ({ ...prev, isListening: false }))
      }

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }))
        console.log('语音识别结束')
      }

      recognitionRef.current = recognition
      recognition.start()

    } catch (error) {
      console.error('启动语音识别失败:', error)
      setState(prev => ({ ...prev, isListening: false }))
    }
  }, [])

  // 停止语音输入
  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setState(prev => ({ ...prev, isListening: false }))
  }, [])

  // 清空聊天记录
  const clearChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      currentInput: ''
    }))
    localStorage.removeItem('chat_history')
  }, [])

  // 设置当前输入
  const setCurrentInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, currentInput: input }))
  }, [])

  // 保存聊天记录到本地存储
  const saveChatHistory = useCallback((messages: ChatMessage[]) => {
    try {
      const history = {
        messages,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      }
      
      // 获取现有历史记录
      const existingHistory = JSON.parse(localStorage.getItem('chat_history') || '[]')
      
      // 添加新的聊天记录
      existingHistory.push(history)
      
      // 只保留最近的50条聊天记录
      if (existingHistory.length > 50) {
        existingHistory.splice(0, existingHistory.length - 50)
      }
      
      localStorage.setItem('chat_history', JSON.stringify(existingHistory))
    } catch (error) {
      console.error('保存聊天记录失败:', error)
    }
  }, [])

  const controls: ChatControls = {
    sendMessage,
    startVoiceInput,
    stopVoiceInput,
    clearChat,
    setCurrentInput
  }

  return {
    state,
    controls
  }
}

// 获取聊天历史记录
export function getChatHistory(): Array<{
  id: string
  messages: ChatMessage[]
  timestamp: string
}> {
  try {
    const history = localStorage.getItem('chat_history')
    return history ? JSON.parse(history) : []
  } catch (error) {
    console.error('获取聊天历史失败:', error)
    return []
  }
}

// 删除特定的聊天记录
export function deleteChatHistory(id: string): void {
  try {
    const history = getChatHistory()
    const filteredHistory = history.filter(item => item.id !== id)
    localStorage.setItem('chat_history', JSON.stringify(filteredHistory))
  } catch (error) {
    console.error('删除聊天记录失败:', error)
  }
}

// 清空所有聊天历史
export function clearAllChatHistory(): void {
  try {
    localStorage.removeItem('chat_history')
  } catch (error) {
    console.error('清空聊天历史失败:', error)
  }
}
