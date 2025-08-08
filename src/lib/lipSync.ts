import * as PIXI from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display/cubism4'

export type LipSyncHandle = {
  fromMediaElement(el: HTMLAudioElement): Promise<() => void> // 返回解绑函数
  fromStream(stream: MediaStream): Promise<() => void>
  fromTestTone(opts?: { frequency?: number; volume?: number }): Promise<() => void>
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

  const TH = opts?.threshold ?? 0.005 // 降低噪声门限，让更小的声音也能触发
  const GAIN = opts?.gain ?? 20 // 增加增益，让口型更明显
  const ATT = opts?.attackMs ?? 50 // 更快的攻击时间
  const REL = opts?.releaseMs ?? 200 // 更慢的释放时间，让嘴部动作更自然
  const MODE = opts?.mode ?? 'override'

  // 常见的口型参数名（按优先级尝试）
  const possibleMouthParams = [
    'ParamMouthOpenY',
    'PARAM_MOUTH_OPEN_Y', 
    'ParamMouthOpen',
    'PARAM_MOUTH_OPEN',
    'MouthOpenY',
    'MouthOpen'
  ]
  
  // 找到实际存在的口型参数
  let mouthOpenId = 'ParamMouthOpenY' // 默认值
  const anyModel: any = model as any
  
  // 检查哪个参数实际存在
  for (const paramName of possibleMouthParams) {
    try {
      if (anyModel.internalModel?.coreModel?.getParameterValueById) {
        anyModel.internalModel.coreModel.getParameterValueById(paramName)
        mouthOpenId = paramName
        console.log(`[LipSync] 找到口型参数: ${paramName}`)
        break
      }
    } catch (e) {
      // 参数不存在，继续尝试下一个
    }
  }
  
  const mouthFormId = 'ParamMouthForm' // 可选，未必存在

  let level = 0
  let running = false
  let nodeCleanup: (() => void) | null = null

  function setParam(id: string, v: number) {
    const anyModel: any = model as any
    const coreModel = anyModel.internalModel?.coreModel
    
    let success = false
    
    if (coreModel && typeof coreModel.setParameterValueById === 'function') {
      try {
        coreModel.setParameterValueById(id, v)
        success = true
      } catch (e) {
        console.warn(`[LipSync] coreModel.setParameterValueById 失败:`, e)
      }
    }
    
    if (!success && typeof anyModel.setParameterValueById === 'function') {
      try {
        anyModel.setParameterValueById(id, v)
        success = true
      } catch (e) {
        console.warn(`[LipSync] model.setParameterValueById 失败:`, e)
      }
    }
    
    if (!success) {
      console.warn(`[LipSync] 无法设置参数 ${id} = ${v}`)
    }
    
    // 调试：验证参数是否被正确设置
    if (success && Math.random() < 0.01) { // 1% 概率输出调试信息
      try {
        const currentValue = coreModel?.getParameterValueById?.(id) ?? anyModel.getParameterValueById?.(id)
        console.log(`[LipSync] 参数 ${id} 设置为 ${v.toFixed(3)}, 实际值: ${currentValue?.toFixed(3)}`)
      } catch (e) {
        // 忽略获取参数值的错误
      }
    }
  }
  
  function addParam(id: string, v: number, weight = 1) {
    const anyModel: any = model as any
    const coreModel = anyModel.internalModel?.coreModel
    
    if (coreModel && typeof coreModel.addParameterValueById === 'function') {
      coreModel.addParameterValueById(id, v, weight)
    } else if (typeof anyModel.addParameterValueById === 'function') {
      anyModel.addParameterValueById(id, v, weight)
    } else {
      console.warn(`[LipSync] 无法叠加参数 ${id} += ${v}`)
    }
  }

  const tick = () => {
    analyser.getFloatTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) { const x = data[i]; sum += x * x }
    const rms = Math.sqrt(sum / data.length)

    // 增强音频信号处理
    let target = rms * GAIN
    
    // 降低噪声门限，让更小的声音也能触发
    if (target > TH) {
      target = Math.min(1, (target - TH) / (1 - TH)) // 归一化
    } else {
      target = 0
    }
    
    // 添加基础起伏效果（即使没有音频输入也有轻微的嘴部运动）
    const time = performance.now() / 1000
    const breathingEffect = Math.sin(time * 2) * 0.05 + 0.05 // 0-0.1 的轻微起伏
    target = Math.max(target, breathingEffect)

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
    
    // 增加调试输出频率，帮助诊断问题
    if (Math.random() < 0.1) { // 10% 概率输出
      console.log(`[LipSync] RMS=${rms.toFixed(4)}, Target=${target.toFixed(3)}, Level=${level.toFixed(3)}, Param=${mouthOpenId}`)
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
      console.log(`[LipSync] 从音频元素创建音频源`)
      const src = ac.createMediaElementSource(el)
      connect(src)
      if (!running) { 
        app.ticker.add(tick); 
        running = true 
        console.log(`[LipSync] 开始音频分析`)
      }
      
      // 确保音频播放时有足够的音量
      el.volume = Math.max(el.volume, 0.5)
      console.log(`[LipSync] 音频音量设置为: ${el.volume}`)
      
      nodeCleanup = () => { try { src.disconnect() } catch {} }
      return () => nodeCleanup?.()
    },
    async fromStream(stream: MediaStream) {
      await ac.resume()
      const src = ac.createMediaStreamSource(stream)
      connect(src)
      if (!running) { app.ticker.add(tick); running = true }
      nodeCleanup = () => { try { src.disconnect() } catch {} }
      return () => nodeCleanup?.()
    },
    async fromTestTone(opts?: { frequency?: number; volume?: number }) {
      await ac.resume()
      console.log(`[LipSync] 创建测试音调`)
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.frequency.value = opts?.frequency ?? 220
      gain.gain.value = opts?.volume ?? 0.3 // 增加测试音调音量
      osc.connect(gain)
      connect(gain)
      osc.start()
      if (!running) { 
        app.ticker.add(tick); 
        running = true 
        console.log(`[LipSync] 开始测试音调分析`)
      }
      nodeCleanup = () => {
        try { osc.stop() } catch {}
        try { osc.disconnect() } catch {}
        try { gain.disconnect() } catch {}
        console.log(`[LipSync] 测试音调已停止`)
      }
      return () => nodeCleanup?.()
    },
    stop() {
      if (running) { app.ticker.remove(tick); running = false }
      try { analyser.disconnect() } catch {}
      try { nodeCleanup?.() } catch {}
      try { ac.close() } catch {}
    },
  }
}
