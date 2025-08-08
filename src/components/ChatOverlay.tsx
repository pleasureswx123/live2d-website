import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type Message = { id: string; role: 'user'|'assistant'; text: string }

function uid() { return Math.random().toString(36).slice(2) }

async function fakeLLM(text: string): Promise<string> {
  // TODO: 替换为你的后端/科大讯飞/豆包调用
  return new Promise(res => setTimeout(() => res(`收到：${text}`), 400))
}

export default function ChatOverlay({ anchor }: { anchor: {x:number,y:number} | null }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [typingId, setTypingId] = useState<string | null>(null)

  // 监听来自 ChatPage 的消息
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const { role, text } = event.detail
      if (role === 'assistant') {
        const a: Message = { id: uid(), role: 'assistant', text: '' }
        setMessages(m => [...m, a])
        setTypingId(a.id)

        // 逐字流式效果
        let i = 0
        const typeInterval = setInterval(() => {
          i++
          const slice = text.slice(0, i)
          setMessages(m => m.map(x => x.id === a.id ? { ...x, text: slice } : x))

          if (i >= text.length) {
            clearInterval(typeInterval)
            setTypingId(null)
          }
        }, 12)
      }
    }

    window.addEventListener('chatMessage', handleChatMessage as EventListener)
    return () => {
      window.removeEventListener('chatMessage', handleChatMessage as EventListener)
    }
  }, [])

  // 把最后一条 assistant 贴在锚点处（也可展示全部；这里示例展示最新一条）
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* 气泡层 */}
      <AnimatePresence>
        {anchor && lastAssistant && (
          <motion.div
            key={lastAssistant.id}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="absolute max-w-[52vw]"
            style={{ left: anchor.x, top: anchor.y }}
          >
            <div className="relative -translate-x-1/2 -translate-y-full">
              <div className="pointer-events-auto rounded-2xl bg-white/85 backdrop-blur px-4 py-3 shadow-lg ring-1 ring-black/5 text-gray-900">
                <p className="whitespace-pre-wrap leading-relaxed">{lastAssistant.text}</p>
              </div>
              {/* 小三角 */}
              <div className="absolute left-1/2 top-[-6px] h-3 w-3 -translate-x-1/2 rotate-45 bg-white/85 shadow ring-1 ring-black/5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}
