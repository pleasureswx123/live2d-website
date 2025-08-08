# 参考资料
下面是一套可直接拷贝的最小模板。特点：

Pixi v6 + pixi-live2d-display@0.4.0（匹配 v6）

DPR（devicePixelRatio）正确处理：autoDensity + resolution 限幅

ResizeObserver + requestAnimationFrame 合并更新，避免 resize 卡顿

纯命令式更新（ref 持有 Pixi 对象），避免 React 反复重渲染

## 安装与创建
```bash
# 1) 查看 Node 版本（建议 Node >= 18）
node -v

# 2) 用 Vite 创建 React + TS 项目（当前目录）
npm create vite@latest . -- --template react-ts

# 3) 安装依赖（锁定关键版本）
npm i pixi.js@^6.5.0 pixi-live2d-display@^0.4.0
npm i react-intersection-observer framer-motion lucide-react zustand vaul
npm i -D tailwindcss@^3.4.0 postcss autoprefixer

# 4) 初始化 Tailwind（如需）
npx tailwindcss init -p
```

> 说明：pixi-live2d-display@0.4.0 对应 Pixi v6；你已有 .model3.json/.moc3 等 Cubism 4 资源。

## 放置 Live2D Cubism Core
把 live2dcubismcore.min.js 复制到 public/lib/：
```bash
public/
  lib/
    live2dcubismcore.min.js
  models/
    YourModel/
      YourModel.model3.json
      ... 其余 .moc3 / .motion3.json / .exp3.json / 纹理 等
```

## 文件结构（关键文件）
```bash
index.html
src/
  main.tsx
  App.tsx
  components/
    Live2DStage.tsx
```

### index.html
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Live2D + Pixi v6</title>
    <script src="/lib/live2dcubismcore.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### src/main.tsx
```tsx
import Live2DStage from './components/Live2DStage'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Live2DStage modelUrl="/models/YourModel/YourModel.model3.json" />
    </div>
  )
}
```

### src/components/Live2DStage.tsx
```tsx
import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

type Props = { modelUrl: string }

function clampDPR(max: number) {
  const dpr = window.devicePixelRatio || 1
  return Math.min(dpr, max)
}

function layout(model: Live2DModel, w: number, h: number) {
  const baseW = 1920
  const baseH = 1080
  const s = Math.min(w / baseW, h / baseH)
  model.anchor.set(0.5, 1)
  model.scale.set(s)
  model.position.set(w / 2, h)
}

export default function Live2DStage({ modelUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const rafRef = useRef<number | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const app = new PIXI.Application({
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundAlpha: 0,
      antialias: false,
      resolution: clampDPR(2),
      autoDensity: true,
      powerPreference: 'high-performance',
    })
    el.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    Live2DModel.from(modelUrl).then((m) => {
      modelRef.current = m
      app.stage.addChild(m)
      const w = app.renderer.width / app.renderer.resolution
      const h = app.renderer.height / app.renderer.resolution
      layout(m, w, h)
    })

    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const w = el.clientWidth
        const h = el.clientHeight
        app.renderer.resolution = clampDPR(2)
        app.renderer.resize(w, h)
        if (modelRef.current) layout(modelRef.current, w, h)
      })
    })

    ro.observe(el)
    roRef.current = ro

    return () => {
      if (roRef.current) roRef.current.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      app.destroy(true)
      appRef.current = null
      modelRef.current = null
    }
  }, [modelUrl])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
}
```

## 说明
DPR 通过 autoDensity:true + resolution 控制，限制到 2 以平衡清晰度与性能。

Resize 用 ResizeObserver 捕获容器变化，并用 rAF 将多次变化合并到一帧，避免卡顿。

只在 rAF 内做轻量的 renderer.resize + transform，不重建模型与纹理。

如需进一步优化，可在低 FPS 时下调 resolution，或在超大窗口下减小 baseW/baseH。

## 口型（LipSync）实现：Web Audio + ParamMouthOpenY
目标：以极低延迟把音频能量映射到 Live2D 的 ParamMouthOpenY，同时避免窗口缩放/重排时卡顿。

### 快速原理
Web Audio AnalyserNode 读取当前播放音频的时域数据 → 计算 RMS（音量）。

压缩（阈值 + 增益）+ 平滑（Attack/Release）→ 稳定的 0~1 开口值。

每帧（Pixi ticker）写入 ParamMouthOpenY；如模型支持，可选写入 ParamMouthForm（形状）。

说明：Web 端 没有官方内置 lipsync 管线，通常采用上述方法；相较麦克风输入，驱动 TTS/音频元素同理。

### 代码：src/lib/lipSync.ts
```ts
import * as PIXI from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display/cubism4'

export type LipSyncHandle = {
  fromMediaElement(el: HTMLAudioElement): Promise<() => void> // 返回解绑函数
  fromStream(stream: MediaStream): Promise<() => void>
  stop(): void
}

export function createLipSync(app: PIXI.Application, model: Live2DModel, opts?: {
  maxDPR?: number
  fftSize?: 256 | 512 | 1024
  threshold?: number
  gain?: number
  attackMs?: number
  releaseMs?: number
  mode?: 'override' | 'additive'
}): LipSyncHandle {
  const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' })
  const analyser = ac.createAnalyser()
  analyser.fftSize = opts?.fftSize ?? 512 // 512 较低延迟；1024 更稳
  analyser.smoothingTimeConstant = 0.05
  const data = new Float32Array(analyser.fftSize)

  const TH = opts?.threshold ?? 0.02 // 噪声门限
  const GAIN = opts?.gain ?? 14
  const ATT = opts?.attackMs ?? 70
  const REL = opts?.releaseMs ?? 120
  const MODE = opts?.mode ?? 'override'

  const mouthOpenId = 'ParamMouthOpenY'
  const mouthFormId = 'ParamMouthForm' // 可选，未必存在

  let level = 0
  let running = false

  function setParam(id: string, v: number) {
    const anyModel: any = model as any
    if (typeof anyModel.setParameterValueById === 'function') anyModel.setParameterValueById(id, v)
    else anyModel.internalModel?.coreModel?.setParameterValueById?.(id, v)
  }
  function addParam(id: string, v: number, weight = 1) {
    const anyModel: any = model as any
    if (typeof anyModel.addParameterValueById === 'function') anyModel.addParameterValueById(id, v, weight)
    else anyModel.internalModel?.coreModel?.addParameterValueById?.(id, v, weight)
  }

  const tick = () => {
    analyser.getFloatTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) { const x = data[i]; sum += x * x }
    const rms = Math.sqrt(sum / data.length)

    // 噪声门限 + 压缩
    let target = Math.max(0, rms * GAIN - TH)
    target = Math.min(1, target / (1 - TH)) // 归一化

    // Attack/Release 平滑（指数趋近）
    const dt = app.ticker.deltaMS
    const tau = target > level ? ATT : REL
    const k = 1 - Math.exp(-dt / Math.max(1, tau))
    level += (target - level) * k

    // 写回：覆盖或叠加
    if (MODE === 'override') {
      setParam(mouthOpenId, level)
    } else {
      // additive 模式会在原有动画基础上叠加，注意不要超 1
      addParam(mouthOpenId, Math.min(1, level), 1)
    }

    // 可选：根据频谱粗略调节 MouthForm（示意；如无该参数可忽略）
    // const freq = new Float32Array(analyser.frequencyBinCount)
    // analyser.getFloatFrequencyData(freq)
    // const centroid = spectralCentroid(freq)
    // const form = Math.max(0, Math.min(1, (centroid - 300) / 2500))
    // setParam(mouthFormId, form)
  }

  function connect(source: AudioNode) {
    source.connect(analyser)
    analyser.connect(ac.destination) // 需要静音可改为：不连接 destination
  }

  return {
    async fromMediaElement(el: HTMLAudioElement) {
      await ac.resume() // 需用户手势环境触发
      const src = ac.createMediaElementSource(el)
      connect(src)
      if (!running) { app.ticker.add(tick); running = true }
      return () => { try { src.disconnect() } catch {} }
    },
    async fromStream(stream: MediaStream) {
      await ac.resume()
      const src = ac.createMediaStreamSource(stream)
      connect(src)
      if (!running) { app.ticker.add(tick); running = true }
      return () => { try { src.disconnect() } catch {} }
    },
    stop() {
      if (running) { app.ticker.remove(tick); running = false }
      try { analyser.disconnect() } catch {}
      try { ac.close() } catch {}
    },
  }
}
```

### 在 Live2DStage.tsx 中启用
> 放在模型加载完成后：
```tsx
import { createLipSync } from '../lib/lipSync'

// ... Live2DModel.from(modelUrl).then((m) => {
    modelRef.current = m
    app.stage.addChild(m)
    const w = app.renderer.width / app.renderer.resolution
    const h = app.renderer.height / app.renderer.resolution
    layout(m, w, h)
    
    // === 口型：驱动一个 <audio> ===
    const audio = new Audio('/audio/demo.mp3') // 你的 TTS/语音文件或流
    audio.preload = 'auto'
    const lip = createLipSync(app, m, { fftSize: 512, threshold: 0.02, gain: 14, attackMs: 60, releaseMs: 120, mode: 'override' })
    lip.fromMediaElement(audio)
    audio.play()
    
    // 清理
    cleanupFns.push(() => { audio.pause(); audio.src = ''; lip.stop() })
    // ...
// })
```

### 常见问题与建议
延迟：latencyHint: 'interactive'、fftSize=512，并确保在 app.ticker 中驱动（不要 setInterval）。

被动画覆盖：某些 motion/表情会写口型；需要完全控制就用 mode: 'override'，或在写口型之前先重置该参数到 0。

Safari 无声/不启动：需在用户手势（点击）后 audio.play() 与 AudioContext.resume()。

想要更自然：给 ParamMouthForm 做粗略元音映射（基于频谱质心），或直接使用 TTS 的音素/时间戳驱动（若你的 TTS 提供 viseme/phoneme 时间轴，则比能量法更自然）。

麦克风驱动：navigator.mediaDevices.getUserMedia({audio:true}) 获取流，调用 fromStream(stream) 即可。


## 对话气泡 UI（DOM 叠加在 Live2D 之上）

思路：Pixi 只负责 Live2D 渲染，气泡用 DOM + Tailwind + Framer Motion 叠加（绝对定位）在同一个容器上。这样不会干扰 GPU 管线，也避免了 React 频繁重绘 Pixi 对象引起的卡顿。

### 结构改造
```bash
src/
  App.tsx                // 容器：相对定位，承载 Pixi Canvas + Overlay
  components/
    Live2DStage.tsx      // 渲染 Live2D 暴露锚点（head/face）位置
    ChatOverlay.tsx      // 消息气泡 + 输入框
  lib/
    lipSync.ts           // 口型实现
```

### 修改 src/App.tsx
```tsx
import { useRef, useState } from 'react'
import Live2DStage from './components/Live2DStage'
import ChatOverlay from './components/ChatOverlay'

export default function App() {
  const [anchor, setAnchor] = useState<{x:number, y:number} | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Live2DStage
        modelUrl="/models/YourModel/YourModel.model3.json"
        onAnchor={(pt) => setAnchor(pt)}
      />
      <ChatOverlay anchor={anchor} />
    </div>
  )
}
```

### 更新 src/components/Live2DStage.tsx（新增 onAnchor 回调）
```tsx
import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

type Props = { modelUrl: string; onAnchor?: (pt:{x:number,y:number}) => void }

function clampDPR(max: number) { const dpr = window.devicePixelRatio || 1; return Math.min(dpr, max) }
function layout(model: Live2DModel, w: number, h: number) {
  const baseW = 1920, baseH = 1080
  const s = Math.min(w / baseW, h / baseH)
  model.anchor.set(0.5, 1)
  model.scale.set(s)
  model.position.set(w/2, h)
}

export default function Live2DStage({ modelUrl, onAnchor }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const rafRef = useRef<number | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const lastAnchor = useRef<{x:number,y:number}|null>(null)
  const anchorTimer = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const app = new PIXI.Application({
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundAlpha: 0,
      antialias: false,
      resolution: clampDPR(2),
      autoDensity: true,
      powerPreference: 'high-performance',
    })
    el.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    Live2DModel.from(modelUrl).then((m) => {
      modelRef.current = m
      app.stage.addChild(m)
      const w = app.renderer.width / app.renderer.resolution
      const h = app.renderer.height / app.renderer.resolution
      layout(m, w, h)
      // 初次锚点
      sendAnchor()
    })

    function sendAnchor() {
      if (!onAnchor || !modelRef.current) return
      const b = modelRef.current.getBounds()
      // 选择“头部附近”的一个点：边界框上方 20% 处的中点（经验值）
      const pt = { x: b.x + b.width/2, y: b.y + b.height*0.2 }
      // 仅在变化明显时通知，避免频繁 setState
      const prev = lastAnchor.current
      if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 1) {
        lastAnchor.current = pt
        onAnchor(pt)
      }
    }

    // 低频（~10Hz）刷新一次锚点，防止模型轻微动作导致偏移
    app.ticker.add(() => {
      anchorTimer.current += app.ticker.deltaMS
      if (anchorTimer.current >= 100) { // 100ms
        anchorTimer.current = 0
        sendAnchor()
      }
    })

    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const w = el.clientWidth
        const h = el.clientHeight
        app.renderer.resolution = clampDPR(2)
        app.renderer.resize(w, h)
        if (modelRef.current) {
          layout(modelRef.current, w, h)
          sendAnchor()
        }
      })
    })
    ro.observe(el)
    roRef.current = ro

    return () => {
      roRef.current?.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      app.destroy(true)
      appRef.current = null
      modelRef.current = null
    }
  }, [modelUrl, onAnchor])

  return <div ref={containerRef} style={{ width:'100%', height:'100%', position:'absolute', inset:0 }} />
}
```

### 新增 src/components/ChatOverlay.tsx
anchor：来自 App（像素坐标），我们把气泡定位到该点上方。

输入框：底部固定，不阻挡 canvas；发送后模拟调用 LLM，并支持“逐字打字”效果。

性能：DOM 气泡与 Pixi 解耦，不会拖慢渲染；Framer Motion 做入场过渡。

```tsx
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
```

### 使用说明与可选增强

锚点更精准：如果你的模型有明显的“头部/嘴部”网格，可在 Live2DModel 的本地坐标中挑一个点（如 (localX, localY)），用 model.toGlobal(new PIXI.Point(localX, localY)) 得到像素坐标替代 getBounds() 估算。

多条气泡：把 messages 中最近 N 条 assistant 都渲染出来，使用不同的 y 偏移堆叠即可；记得 pointer-events 策略分层。

避免频繁 setState：当前锚点 10Hz 更新已足够。如果你的模型会大幅摆动，可把频率调到 20–30Hz；也可以在 ChatOverlay 里用 useRef 直接 style.transform = translate(...)，不经过 React 状态。

可点击关闭：给气泡加一个关闭按钮（注意把按钮容器设为 pointer-events-auto）。

适配移动端：输入框在 iOS 上可能被软键盘顶起，建议配合 env(safe-area-inset-bottom) 和 100dvh 高度处理。


## 自动表情与动作系统（说话/停顿/心情 联动）
目标：当角色开始说话时自动播放“说话/手势”类动作并切换合适的表情；结束说话回到 Idle；同时支持手动覆盖，并根据 LLM 的“情绪标签”动态调整。

### 新建 src/lib/animDirector.ts
```ts
import * as PIXI from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display/cubism4'

type Mood = 'neutral'|'happy'|'angry'|'sad'|'surprised'|'thinking'

export type AnimDirector = {
  setMood(m: Mood): void
  speakStart(opts?: { mood?: Mood }): void
  speakStop(): void
  setExpression(id: string): Promise<void>
  playMotion(group: string, opts?: { index?: number; priority?: number; loop?: boolean }): Promise<void>
  dispose(): void
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function createAnimDirector(
  app: PIXI.Application,
  model: Live2DModel,
  opts: { baseDir: string; talkGroupHints?: string[]; idleGroupHints?: string[] },
): AnimDirector {
  const anyModel: any = model as any
  const settings = anyModel.internalModel?.settings
  const motionDefs: Record<string, Array<{ File: string }>> = settings?.motions ?? {}
  const exprDefs: Array<{ Name: string; File: string }> = settings?.expressions ?? []

  // 根据名称猜测分组（不同模型命名差异很大）
  const TALK_HINTS = (opts.talkGroupHints ?? ['talk','speak','motion_talk','m01','gesture','tap']).map(s=>s.toLowerCase())
  const IDLE_HINTS = (opts.idleGroupHints ?? ['idle','loop','stand']).map(s=>s.toLowerCase())

  const groups = Object.keys(motionDefs)
  const talkGroups = groups.filter(g => TALK_HINTS.some(h => g.toLowerCase().includes(h)))
  const idleGroups = groups.filter(g => IDLE_HINTS.some(h => g.toLowerCase().includes(h)))
  const fallbackIdle = idleGroups[0] ?? groups.find(g=>/idle|loop/i.test(g)) ?? groups[0]

  let mood: Mood = 'neutral'
  let speaking = false
  let loopToken = 0 // 用于打断 loop

  function pickExpressionForMood(m: Mood): string | null {
    // 简单规则：按名字包含关系选；找不到就 null
    const name = (
      m === 'happy' ? ['happy','smile','joy'] :
      m === 'angry' ? ['angry','mad'] :
      m === 'sad' ? ['sad','sorrow'] :
      m === 'surprised' ? ['surprise','wow'] :
      m === 'thinking' ? ['serious','blinkless','think'] :
      ['neutral','default']
    )
    const hit = exprDefs.find(e => name.some(n => e.Name?.toLowerCase().includes(n)))
    return hit?.Name ?? null
  }

  async function setExpressionById(id: string) {
    // 优先使用 expressionManager
    const em = anyModel.internalModel?.expressionManager
    if (em?.setExpression) { em.setExpression(id); return }

    // 手动加载表达式文件并套用（渐变进入）
    const rec = exprDefs.find(e => e.Name === id)
    if (!rec) return
    const url = new URL(rec.File, opts.baseDir).toString()
    const json = await fetch(url).then(r => r.json()).catch(()=>null)
    if (!json?.Parameters) return

    const fadeIn = Math.max(0, Math.floor((json.FadeInTime ?? 0.2) * 1000))
    const start: Record<string, number> = {}
    const target: Record<string, {v:number; blend?: string}> = {}
    for (const p of json.Parameters) {
      const id = p.Id
      start[id] = anyModel.getParameterValueById ? anyModel.getParameterValueById(id) : (anyModel.internalModel?.coreModel?.getParameterValueById?.(id) ?? 0)
      target[id] = { v: p.Value, blend: p.Blend }
    }

    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      const k = fadeIn ? Math.min(1, t / fadeIn) : 1
      for (const id of Object.keys(target)) {
        const tg = target[id]
        const v = tg.blend === 'Add' ? start[id] + k * tg.v : start[id] + (tg.v - start[id]) * k
        if (anyModel.setParameterValueById) anyModel.setParameterValueById(id, v)
        else anyModel.internalModel?.coreModel?.setParameterValueById?.(id, v)
      }
      if (k >= 1) app.ticker.remove(tick)
    }
    app.ticker.add(tick)
  }

  async function play(group: string, index = 0, priority = 3) {
    const mm = anyModel.internalModel?.motionManager
    if (!mm) return
    if (mm.startMotion) {
      mm.startMotion(group, index, priority)
      // 某些实现会返回 promise；为兼容性这里不 await
    } else if (anyModel.motion) {
      // 非标准兜底
      try { await anyModel.motion(group, index, priority) } catch {}
    }
  }

  async function loopGroup(group: string, prio = 1) {
    const myToken = ++loopToken
    const list = motionDefs[group] ?? []
    let i = 0
    while (myToken === loopToken && speaking) {
      await play(group, i % list.length, prio)
      // 简单估算：一次动作 2~3.2s；真实时长不易取，做轻微随机以免机械感
      await sleep(2000 + Math.random()*1200)
      i++
    }
  }

  return {
    setMood(m: Mood) {
      mood = m
      const id = pickExpressionForMood(m)
      if (id) void setExpressionById(id)
    },
    async setExpression(id: string) { await setExpressionById(id) },
    async playMotion(group: string, opts) { await play(group, opts?.index ?? 0, opts?.priority ?? 3) },
    speakStart(opts) {
      if (opts?.mood) this.setMood(opts.mood)
      speaking = true
      // 先确保有说话组，没有则退回 idle 的轻摆
      const g = talkGroups[0] ?? fallbackIdle
      void loopGroup(g, 2)
    },
    speakStop() {
      speaking = false
      loopToken++ // 打断循环
      // 回到 Idle
      if (fallbackIdle) void play(fallbackIdle, 0, 1)
      // 情绪回到中性（可按需保留上一表情）
      // this.setMood('neutral')
    },
    dispose() { loopToken++; speaking = false },
  }
}
```

### 在 Live2DStage.tsx 中接入 Director
在模型加载完成后创建 Director，并暴露到外部（方便 Chat/音频模块调 speakStart/Stop 与 setMood）。
```tsx
// Live2DStage.tsx 片段
import { createAnimDirector } from '../lib/animDirector'

// ... inside Live2DModel.from(...).then((m) => {
  modelRef.current = m
  app.stage.addChild(m)
  const w = app.renderer.width / app.renderer.resolution
  const h = app.renderer.height / app.renderer.resolution
  layout(m, w, h)

  // 供外部访问（可用 props.onReady 传给父组件）
  const baseDir = new URL(modelUrl, window.location.href)
  const director = createAnimDirector(app, m, { baseDir: baseDir })
  ;(m as any).__director = director
})

// 组件销毁时
return () => {
  // ...
  const d = (modelRef.current as any)?.__director
  d?.dispose?.()
}
```

### 与音频/口型联动（开始播音 → 进入说话动作；结束 → Idle）
在你之前的口型示例基础上，加上：
```ts
// 在创建 audio 后：
const director = (modelRef.current as any)?.__director

audio.addEventListener('play', () => director?.speakStart?.({ mood: 'happy' }))
audio.addEventListener('pause', () => director?.speakStop?.())
audio.addEventListener('ended', () => director?.speakStop?.())
```
若你用的是流式 TTS（WebSocket/SSE），在收到首个音频块播放前调用 speakStart，当末尾播放完成时调用 speakStop。

### 根据 LLM 情绪标签自动换表情
在你的对话管线里让 LLM 返回一个 mood 字段（如 happy/angry/sad/...），然后：
```ts
const director = (modelRef.current as any)?.__director

director?.setMood(moodFromLLM) // 在播音前或中途都可以
```
若你用的是流式 TTS（WebSocket/SSE），在收到首个音频块播放前调用 speakStart，当末尾播放完成时调用 speakStop。

### 根据 LLM 情绪标签自动换表情
在你的对话管线里让 LLM 返回一个 mood 字段（如 happy/angry/sad/...），然后：
```ts
const director = (modelRef.current as any)?.__director

director?.setMood(moodFromLLM) // 在播音前或中途都可以
```

### 手动覆盖（按钮/调试）
```ts
await director.setExpression('smile')
await director.playMotion('TapBody', { index: 0, priority: 3, loop: false })
```

### 注意事项

命名差异：不同模型的 Motion 组与 Expression 名称不统一，animDirector 用了模糊匹配（talk/gesture/idle 等）。必要时传入 talkGroupHints/idleGroupHints 精确指定。

优先级：startMotion(group, index, priority) 的 priority 大会压过 Idle，小于口型无关。把说话循环设为中等优先级（2），手动动作设为 3。具体值可按库实现调整。

冲突：某些表情会写口型参数；建议你维持口型的 override 模式（第 5 节），确保 ParamMouthOpenY 以音频为准。

性能：表达式切换采用淡入，避免突跳；循环动作用简单的定时重启，不依赖库的事件回调，稳定性更好。






