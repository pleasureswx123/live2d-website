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
  const [input, setInput] = useState('')
  const [typingId, setTypingId] = useState<string | null>(null)

  // 把最后一条 assistant 贴在锚点处（也可展示全部；这里示例展示最新一条）
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  async function handleSend() {
    const t = input.trim()
    if (!t) return
    setInput('')
    const u: Message = { id: uid(), role: 'user', text: t }
    setMessages(m => [...m, u])

    const a: Message = { id: uid(), role: 'assistant', text: '' }
    setMessages(m => [...m, a])
    setTypingId(a.id)

    const full = await fakeLLM(t)
    // 逐字流式效果
    for (let i = 1; i <= full.length; i++) {
      const slice = full.slice(0, i)
      setMessages(m => m.map(x => x.id === a.id ? { ...x, text: slice } : x))
      await new Promise(r => setTimeout(r, 12)) // 打字速度
    }
    setTypingId(null)
  }

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

      {/* 输入框 */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-3 flex w-full justify-center">
        <div className="flex w-[min(720px,92vw)] items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow ring-1 ring-black/10">
          <input
            className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
            placeholder="和角色聊天…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => (e.key === 'Enter' ? handleSend() : null)}
          />
          <button
            className="rounded-xl bg-black px-3 py-1.5 text-white disabled:opacity-50"
            onClick={handleSend}
            disabled={!input.trim()}
          >发送</button>
        </div>
      </div>
    </div>
  )
}
