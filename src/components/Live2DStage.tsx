import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { createLipSync } from '../lib/lipSync'
import { createAnimDirector } from '../lib/animDirector'

// 确保 PIXI 全局可用（关键！）
if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI
}

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
  // 使用原始逻辑尺寸（避免因上一次缩放导致测量漂移）
  const bounds = model.getBounds()
  const logicalW = bounds.width || 1
  const logicalH = bounds.height || 1

  // 留边，按短边适配
  const scaleX = (w * 0.82) / logicalW
  const scaleY = (h * 0.92) / logicalH
  const scale = Math.min(scaleX, scaleY)

  model.anchor.set(0.5, 1)
  model.scale.set(scale)
  model.position.set(w / 2, h)
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

    // 使用正确的模型加载方式
    const model = Live2DModel.fromSync(modelUrl, {
      autoUpdate: false, // 我们手动控制更新
      onError: (error: any) => console.error('Live2D模型加载错误:', error)
    })

    modelRef.current = model
    
    // 存储模型的原始 JSON 设置
    let modelSettings: any = null

    // 监听设置 JSON 加载完成事件（关键！）
    model.once('settingsJSONLoaded', (json: any) => {
      console.log('[Live2DStage] 模型设置 JSON 已加载:', json)
      modelSettings = json
      // 将设置挂载到模型上，供 AnimDirector 使用
      ;(model as any).__modelSettings = json
    })

    // 监听模型加载完成事件
    model.once('load', () => {
      console.log('[Live2DStage] 模型完全加载完成')
      
      // 检查 motionManager 状态
      const motionManager = model.internalModel?.motionManager
      console.log('[Live2DStage] motionManager 加载后状态:', {
        exists: !!motionManager,
        keys: motionManager ? Object.keys(motionManager) : [],
        hasStartMotion: motionManager ? typeof motionManager.startMotion === 'function' : false,
        hasStartRandomMotion: motionManager ? typeof motionManager.startRandomMotion === 'function' : false
      })
      
      // 添加到舞台
      app.stage.addChild(model)
      const w = app.renderer.width / app.renderer.resolution
      const h = app.renderer.height / app.renderer.resolution
      layout(model, w, h)

      // 手动更新循环
      const updateTicker = () => {
        if (modelRef.current) {
          modelRef.current.update(app.ticker.deltaMS)
        }
      }
      app.ticker.add(updateTicker)

      // 创建动画导演和口型同步（确保设置已加载）
      const baseDir = new URL(modelUrl, window.location.href).href
      const director = createAnimDirector(app, model, { baseDir, modelSettings })
      const lipSync = createLipSync(app, model, {
        fftSize: 512,
        threshold: 0.005, // 降低噪声门限
        gain: 20, // 增加增益
        attackMs: 50, // 更快的攻击时间
        releaseMs: 200, // 更慢的释放时间
        mode: 'override'
      })

      // 将实例挂载到模型上，方便外部访问
      ;(model as any).__director = director
      ;(model as any).__lipSync = lipSync

      // 将实例挂载到全局，方便其他组件访问
      ;(window as any).__live2d = {
        model: model,
        app: app
      }

      // 初次锚点
      sendAnchor()

      // 通知外部模型已准备就绪
      onReady?.(model, app)
    })

    // 监听就绪事件（基础资源加载完成）
    model.once('ready', () => {
      console.log('[Live2DStage] 模型基础资源就绪')
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
    const anchorTicker = () => {
      anchorTimer.current += app.ticker.deltaMS
      if (anchorTimer.current >= 100) { // 100ms
        anchorTimer.current = 0
        sendAnchor()
      }
    }
    app.ticker.add(anchorTicker)

    let resizeQueued = false
    const ro = new ResizeObserver(() => {
      // 合并高频 resize 回调，避免忽闪
      if (resizeQueued) return
      resizeQueued = true
      rafRef.current = requestAnimationFrame(() => {
        resizeQueued = false
        const w = el.clientWidth
        const h = el.clientHeight
        // 仅当尺寸变化时再触发 renderer.resize
        const canvas = app.view as HTMLCanvasElement
        const needResize = canvas.width !== Math.floor(w * app.renderer.resolution) || canvas.height !== Math.floor(h * app.renderer.resolution)
        if (needResize) {
          app.renderer.resolution = clampDPR(2)
          app.renderer.resize(w, h)
        }
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
