import { useRef, useEffect, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// 确保 PIXI 在全局可用
if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI
}

// 禁用PIXI的一些可能导致问题的功能
PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false
PIXI.settings.STRICT_TEXTURE_CACHE = false

export interface Live2DState {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  currentModel: string | null
}

export interface Live2DControls {
  loadModel: (modelUrl: string) => Promise<void>
  playMotion: (group: string, index?: number) => Promise<void>
  playExpression: (expressionName: string) => Promise<void>
  resetExpression: () => void
  setVolume: (volume: number) => void
  destroy: () => void
}

export function useLive2D(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const initializingRef = useRef(false)
  const initializedRef = useRef(false) // 添加初始化标记
  const [state, setState] = useState<Live2DState>({
    isLoaded: false,
    isLoading: false,
    error: null,
    currentModel: null
  })

  // 初始化 PIXI 应用
  const initializeApp = useCallback(() => {
    // 防止重复初始化
    if (!canvasRef.current || appRef.current || initializingRef.current || initializedRef.current) {
      return
    }

    initializingRef.current = true

    try {
      console.log('开始初始化PIXI应用...')

      const app = new PIXI.Application({
        view: canvasRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundAlpha: 0, // 设置背景透明
        autoDensity: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      })

      appRef.current = app

      // 添加模型更新循环
      app.ticker.add(() => {
        if (modelRef.current) {
          modelRef.current.update(app.ticker.deltaMS)
        }
      })

  // 音量控制改由外层音频元素或业务侧管理

      // 标记为已初始化
      initializedRef.current = true

      console.log('PIXI 应用初始化成功')
    } catch (error) {
      console.error('PIXI 应用初始化失败:', error)
      setState(prev => ({ ...prev, error: '初始化失败' }))
    } finally {
      initializingRef.current = false
    }
  }, [])

  // 加载模型
  const loadModel = useCallback(async (modelUrl: string) => {
    if (!appRef.current || !appRef.current.stage) {
      console.error('PIXI 应用未初始化或stage不可用')
      // 延迟重试
      setTimeout(() => {
        if (appRef.current && appRef.current.stage) {
          loadModel(modelUrl)
        }
      }, 100)
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 移除旧模型
      if (modelRef.current && appRef.current.stage) {
        appRef.current.stage.removeChild(modelRef.current)
        modelRef.current.destroy()
        modelRef.current = null
      }

      console.log(`开始加载模型: ${modelUrl}`)

      const model = await Live2DModel.from(modelUrl)

      if (!model) {
        throw new Error('模型加载失败')
      }

      modelRef.current = model

      // 添加事件监听器
      if (model.internalModel && model.internalModel.motionManager) {
        model.internalModel.motionManager.on('motionStart', (group: string, index: number) => {
          console.log(`动作开始: 组=${group}, 索引=${index}`)
        })

        model.internalModel.motionManager.on('motionFinish', (group: string, index: number) => {
          console.log(`动作结束: 组=${group}, 索引=${index}`)
        })
      }

      // 确保stage仍然可用
      if (appRef.current && appRef.current.stage) {
        // 添加到舞台
        appRef.current.stage.addChild(model)

        // 等待一帧以确保模型完全渲染
        await new Promise(resolve => requestAnimationFrame(resolve))

        // 自动调整模型位置和大小
        autoFitModel(model, appRef.current.view.width, appRef.current.view.height)

        setState(prev => ({
          ...prev,
          isLoaded: true,
          isLoading: false,
          currentModel: modelUrl
        }))

        console.log(`模型加载成功: ${modelUrl}`)
      } else {
        throw new Error('PIXI stage不可用')
      }
    } catch (error) {
      console.error('模型加载失败:', error)
      setState(prev => ({
        ...prev,
        isLoaded: false,
        isLoading: false,
        error: error instanceof Error ? error.message : '模型加载失败'
      }))
    }
  }, [])

  // 播放动作
  const playMotion = useCallback(async (group: string, index: number = 0) => {
    if (!modelRef.current) {
      console.warn('模型未加载')
      return
    }

    try {
      console.log(`[useLive2D] 播放动作: 组=${group}, 索引=${index}`)
      
      // 检查是否有动画导演
      const director = (modelRef.current as any).__director
      if (director && typeof director.playMotion === 'function') {
        console.log(`[useLive2D] 使用动画导演播放动作`)
        await director.playMotion(group, { index, priority: 3 })
        return
      }
      
      // 回退到直接调用模型API
      console.log(`[useLive2D] 直接调用模型API播放动作`)
      const result = await modelRef.current.motion(group, index, 3)
      console.log(`[useLive2D] 模型API调用结果:`, result)
    } catch (error) {
      console.error('[useLive2D] 播放动作失败:', error)
    }
  }, [])

  // 播放表情
  const playExpression = useCallback(async (expressionName: string) => {
    if (!modelRef.current) {
      console.warn('模型未加载')
      return
    }

    try {
      console.log(`播放表情: ${expressionName}`)
      await modelRef.current.expression(expressionName)
    } catch (error) {
      console.error('播放表情失败:', error)
    }
  }, [])

  // 重置表情
  const resetExpression = useCallback(() => {
    if (!modelRef.current) {
      console.warn('模型未加载')
      return
    }

    try {
      console.log('重置表情')
      modelRef.current.expression(undefined)
    } catch (error) {
      console.error('重置表情失败:', error)
    }
  }, [])

  // 设置音量
  const setVolume = useCallback((_volume: number) => {
    // 占位：由上层音频实现负责
  }, [])

  // 自动调整模型位置和大小
  const autoFitModel = useCallback((model: Live2DModel, canvasWidth: number, canvasHeight: number) => {
    try {
      // 获取模型的原始尺寸
      const modelWidth = model.width
      const modelHeight = model.height

      // 计算适合的缩放比例，确保模型完全显示在画布内
      const scaleX = (canvasWidth * 0.6) / modelWidth  // 留出40%的边距
      const scaleY = (canvasHeight * 0.8) / modelHeight // 留出20%的边距
      const scale = Math.min(scaleX, scaleY, 1.0) // 不超过原始大小

      model.scale.set(scale)

      // 居中显示，稍微向下偏移一点
      model.position.set(canvasWidth / 2, canvasHeight * 0.6)
      model.anchor.set(0.5, 0.5)

      console.log(`模型自动调整: scale=${scale.toFixed(3)}, position=(${model.position.x}, ${model.position.y}), modelSize=(${modelWidth}, ${modelHeight})`)
    } catch (error) {
      console.error('自动调整模型失败:', error)
    }
  }, [])

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    if (!appRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const width = window.innerWidth
    const height = window.innerHeight

    // 更新画布大小
    canvas.width = width
    canvas.height = height
    appRef.current.renderer.resize(width, height)

    // 重新调整模型
    if (modelRef.current) {
      autoFitModel(modelRef.current, width, height)
    }
  }, [autoFitModel])

  // 销毁资源
  const destroy = useCallback(() => {
    console.log('清理Live2D资源...')

    if (modelRef.current) {
      modelRef.current.destroy()
      modelRef.current = null
    }

    if (appRef.current) {
      appRef.current.destroy(true)
      appRef.current = null
    }

    // 重置初始化标记
    initializedRef.current = false
    initializingRef.current = false

    setState({
      isLoaded: false,
      isLoading: false,
      error: null,
      currentModel: null
    })

    console.log('Live2D资源清理完成')
  }, [])

  // 初始化和清理
  useEffect(() => {
    // 使用MutationObserver监听canvas元素的添加
    const observer = new MutationObserver(() => {
      if (canvasRef.current && !initializedRef.current && !initializingRef.current) {
        console.log('检测到canvas元素，开始初始化PIXI应用')
        initializeApp()
      }
    })

    // 监听整个document的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 立即检查一次
    if (canvasRef.current && !initializedRef.current && !initializingRef.current) {
      console.log('立即检查canvas元素，开始初始化PIXI应用')
      initializeApp()
    }

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      // 注意：不在这里调用destroy，避免在页面切换时清理资源
    }
  }, []) // 空依赖数组，只在挂载时执行一次

  const controls: Live2DControls = {
    loadModel,
    playMotion,
    playExpression,
    resetExpression,
    setVolume,
    destroy
  }

  return {
    state,
    controls,
    model: modelRef.current,
    app: appRef.current
  }
}
