import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { createLipSync } from '../lib/lipSync'
import { createAnimDirector } from '../lib/animDirector'

type Props = {
  modelUrl: string
  onAnchor?: (pt: {x: number, y: number}) => void
  onReady?: (model: Live2DModel, app: PIXI.Application) => void
}

function clampDPR(max: number) {
  const dpr = window.devicePixelRatio || 1
  return Math.min(dpr, max)
}

function layout(model: Live2DModel, w: number, h: number) {
  // 获取模型的原始尺寸
  const modelWidth = model.width
  const modelHeight = model.height

  // 计算适合的缩放比例，确保模型完全显示在画布内
  const scaleX = (w * 0.8) / modelWidth  // 留出20%的边距
  const scaleY = (h * 0.9) / modelHeight // 留出10%的边距
  const scale = Math.min(scaleX, scaleY, 1.0) // 不超过原始大小

  // 设置锚点为模型底部中心
  model.anchor.set(0.5, 1)
  model.scale.set(scale)

  // 居中显示，稍微向下偏移一点
  model.position.set(w / 2, h * 0.95)

  console.log(`模型布局: scale=${scale.toFixed(3)}, position=(${model.position.x}, ${model.position.y}), modelSize=(${modelWidth}, ${modelHeight})`)
}

export default function Live2DStage({ modelUrl, onAnchor, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const rafRef = useRef<number | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const lastAnchor = useRef<{x: number, y: number} | null>(null)
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

      // 注册 Ticker 以解决警告
      ;(m as any).registerTicker?.(app.ticker)

      app.stage.addChild(m)
      const w = app.renderer.width / app.renderer.resolution
      const h = app.renderer.height / app.renderer.resolution
      layout(m, w, h)

      // 创建动画导演和口型同步
      const baseDir = new URL(modelUrl, window.location.href).href
      const director = createAnimDirector(app, m, { baseDir })
      const lipSync = createLipSync(app, m, {
        fftSize: 512,
        threshold: 0.02,
        gain: 14,
        attackMs: 60,
        releaseMs: 120,
        mode: 'override'
      })

      // 将实例挂载到模型上，方便外部访问
      ;(m as any).__director = director
      ;(m as any).__lipSync = lipSync

      // 将实例挂载到全局，方便其他组件访问
      ;(window as any).__live2d = {
        model: m,
        app: app
      }

      // 初次锚点
      sendAnchor()

      // 通知外部模型已准备就绪
      onReady?.(m, app)
    }).catch((error) => {
      console.error('Live2D模型加载失败:', error)
    })

    function sendAnchor() {
      if (!onAnchor || !modelRef.current) return
      const b = modelRef.current.getBounds()
      // 选择"头部附近"的一个点：边界框上方 20% 处的中点（经验值）
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

      // 清理动画导演和口型同步
      if (modelRef.current) {
        const director = (modelRef.current as any).__director
        const lipSync = (modelRef.current as any).__lipSync
        director?.dispose?.()
        lipSync?.stop?.()
      }

      app.destroy(true)
      appRef.current = null
      modelRef.current = null
    }
  }, [modelUrl, onAnchor])



  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
}
