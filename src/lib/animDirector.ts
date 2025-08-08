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
  
  console.log('[AnimDirector] 初始化 - 可用表情:', exprDefs.map(e => e.Name))
  console.log('[AnimDirector] 初始化 - 可用动作组:', Object.keys(motionDefs))
  console.log('[AnimDirector] 模型内部状态:', {
    hasMotionManager: !!anyModel.internalModel?.motionManager,
    hasExpressionManager: !!anyModel.internalModel?.motionManager?.expressionManager,
    modelReady: !!anyModel.internalModel?.coreModel
  })

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
      m === 'happy' ? ['happy','smile','joy','wenroudexiao','hahadadxiao'] :
      m === 'angry' ? ['angry','mad','shengqi'] :
      m === 'sad' ? ['sad','sorrow','weiqu','luolei'] :
      m === 'surprised' ? ['surprise','wow','jingya','jingxi'] :
      m === 'thinking' ? ['serious','blinkless','think','tuosai'] :
      ['neutral','default']
    )
    const hit = exprDefs.find(e => name.some(n => e.Name?.toLowerCase().includes(n)))
    return hit?.Name ?? null
  }

  async function setExpressionById(id: string) {
    debugger
    console.log(`[AnimDirector] 设置表情: ${id}`)
    
    // 方法1: 使用 expressionManager（推荐）
    const em = anyModel.internalModel?.motionManager?.expressionManager
    if (em && typeof em.setExpression === 'function') {
      console.log(`[AnimDirector] 使用 expressionManager.setExpression`)
      try {
        em.setExpression(id)
        return
      } catch (e) {
        console.warn(`[AnimDirector] expressionManager.setExpression 失败:`, e)
      }
    }

    // 方法2: 使用高级 API
    if (typeof anyModel.expression === 'function') {
      console.log(`[AnimDirector] 使用 model.expression API`)
      try {
        const result = await anyModel.expression(id)
        console.log(`[AnimDirector] model.expression 结果:`, result)
        return
      } catch (e) {
        console.warn(`[AnimDirector] model.expression 失败:`, e)
      }
    }

    console.log(`[AnimDirector] 回退到手动表情加载`)
    // 回退：手动加载表达式并淡入
    const rec = exprDefs.find(e => e.Name === id)
    if (!rec) {
      console.error(`[AnimDirector] 找不到表情: ${id}, 可用表情:`, exprDefs.map(e => e.Name))
      return
    }
    console.log(`[AnimDirector] 手动加载表情文件: ${rec.File}`)
    const url = new URL(rec.File, opts.baseDir).toString()
    const json = await fetch(url).then(r => r.json()).catch(()=>null)
    if (!json?.Parameters) return

    const fadeIn = Math.max(0, Math.floor((json.FadeInTime ?? 0.2) * 1000))
    const start: Record<string, number> = {}
    const target: Record<string, {v:number; blend?: string}> = {}
    for (const p of json.Parameters) {
      const pid = p.Id
      start[pid] = anyModel.getParameterValueById ? anyModel.getParameterValueById(pid) : (anyModel.internalModel?.coreModel?.getParameterValueById?.(pid) ?? 0)
      target[pid] = { v: p.Value, blend: p.Blend }
    }

    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      const k = fadeIn ? Math.min(1, t / fadeIn) : 1
      for (const pid of Object.keys(target)) {
        const tg = target[pid]
        const v = tg.blend === 'Add' ? start[pid] + k * tg.v : start[pid] + (tg.v - start[pid]) * k
        if (anyModel.setParameterValueById) anyModel.setParameterValueById(pid, v)
        else anyModel.internalModel?.coreModel?.setParameterValueById?.(pid, v)
      }
      if (k >= 1) app.ticker.remove(tick)
    }
    app.ticker.add(tick)
  }

  async function play(group: string, index = 0, priority = 3) {
    debugger
    console.log(`[AnimDirector] 播放动作: ${group}[${index}] 优先级=${priority}`)
    
    // 检查动作组是否存在
    if (!motionDefs[group] || motionDefs[group].length === 0) {
      console.error(`[AnimDirector] 动作组不存在: ${group}, 可用组:`, Object.keys(motionDefs))
      return false
    }
    
    if (index >= motionDefs[group].length) {
      console.error(`[AnimDirector] 动作索引超出范围: ${group}[${index}], 最大索引: ${motionDefs[group].length - 1}`)
      return false
    }

    // 方法1: 使用 motionManager.startMotion（推荐）
    const mm = anyModel.internalModel?.motionManager
    if (mm && typeof mm.startMotion === 'function') {
      console.log(`[AnimDirector] 使用 motionManager.startMotion`)
      try {
        const result = mm.startMotion(group, index, priority)
        console.log(`[AnimDirector] startMotion 结果:`, result)
        return result
      } catch (e) {
        console.warn(`[AnimDirector] motionManager.startMotion 失败:`, e)
      }
    }

    // 方法2: 使用高级 API
    if (typeof anyModel.motion === 'function') {
      console.log(`[AnimDirector] 使用 model.motion API`)
      try {
        const result = await anyModel.motion(group, index, priority)
        console.log(`[AnimDirector] model.motion 结果:`, result)
        return result
      } catch (e) {
        console.warn(`[AnimDirector] model.motion 失败:`, e)
      }
    }

    console.warn(`[AnimDirector] 无可用的动作播放方法`)
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
