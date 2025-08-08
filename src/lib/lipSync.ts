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
