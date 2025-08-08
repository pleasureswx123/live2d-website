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
  opts: { baseDir: string; talkGroupHints?: string[]; idleGroupHints?: string[]; modelSettings?: any },
): AnimDirector {
  const anyModel: any = model as any
  
  // 优先使用传入的模型设置，然后尝试其他路径
  function getSettings() {
    // 方法1: 使用传入的模型设置（最可靠）
    if (opts.modelSettings) {
      console.log('[AnimDirector] 使用传入的模型设置:', opts.modelSettings)
      return opts.modelSettings
    }
    
    // 方法2: 从挂载的设置获取
    if (anyModel.__modelSettings) {
      console.log('[AnimDirector] 使用挂载的模型设置:', anyModel.__modelSettings)
      return anyModel.__modelSettings
    }
    
    // 方法3: 尝试其他路径（调试用）
    console.log('[AnimDirector] 模型结构调试:', {
      model: Object.keys(anyModel),
      internalModel: anyModel.internalModel ? Object.keys(anyModel.internalModel) : null,
      settings: anyModel.internalModel?.settings,
      motionManager: anyModel.internalModel?.motionManager ? Object.keys(anyModel.internalModel.motionManager) : null,
      coreModel: anyModel.internalModel?.coreModel ? Object.keys(anyModel.internalModel.coreModel) : null
    })
    
    const paths = [
      anyModel.internalModel?.settings,
      anyModel.settings,
      anyModel._settings,
      anyModel.internalModel?._settings,
      anyModel.internalModel?.motionManager?.settings,
      anyModel.internalModel?.coreModel?.settings
    ]
    
    for (let i = 0; i < paths.length; i++) {
      const settings = paths[i]
      if (settings && (settings.Motions || settings.motions || settings.Expressions || settings.expressions)) {
        console.log(`[AnimDirector] 在路径${i}找到设置:`, settings)
        return settings
      }
    }
    
    console.warn('[AnimDirector] 无法获取模型设置')
    return null
  }
  
  function getMotionDefs() {
    const settings = getSettings()
    if (settings && (settings.Motions || settings.motions)) {
      return settings.Motions || settings.motions || {}
    }

    // 如果无法获取设置，使用硬编码的动作定义（基于youyou.model3.json）
    // 注意：使用与模型配置文件完全一致的大写组名
    console.log('[AnimDirector] 使用硬编码的动作定义')
    return {
      "Idle": [
        { "File": "sleep.motion3.json" },
        { "File": "jichudonghua.motion3.json" }
      ],
      "TapBody": [
        { "File": "huishou.motion3.json" },
        { "File": "diantou.motion3.json" },
        { "File": "yaotou.motion3.json" }
      ],
      "TapHead": [
        { "File": "yanzhuzi.motion3.json" },
        { "File": "shuijiao.motion3.json" }
      ]
    }
  }
  
  function getExprDefs() {
    const settings = getSettings()
    if (!settings) return []
    return settings.Expressions || settings.expressions || []
  }
  
  // 立即检查模型设置
  console.log('[AnimDirector] 初始化 - 获取模型设置')
  const settings = getSettings()
  const motions = getMotionDefs()
  const expressions = getExprDefs()
  
  console.log('[AnimDirector] 最终结果:', {
    hasSettings: !!settings,
    motionCount: Object.keys(motions).length,
    expressionCount: expressions.length,
    motionGroups: Object.keys(motions),
    expressions: expressions.map((e: any) => e.Name || e.name || e),
    settingsPreview: settings ? {
      hasMotions: !!settings.Motions,
      hasExpressions: !!settings.Expressions,
      motionKeys: settings.Motions ? Object.keys(settings.Motions) : [],
      expressionCount: settings.Expressions ? settings.Expressions.length : 0
    } : null
  })
  
  if (!settings) {
    console.error('[AnimDirector] 无法获取模型设置，AnimDirector 功能将受限')
  }

  // 根据名称猜测分组（不同模型命名差异很大）
  const TALK_HINTS = (opts.talkGroupHints ?? ['talk','speak','motion_talk','m01','gesture','tap']).map(s=>s.toLowerCase())
  const IDLE_HINTS = (opts.idleGroupHints ?? ['idle','loop','stand']).map(s=>s.toLowerCase())

  function getTalkGroups() {
    const motionDefs = getMotionDefs()
    const groups = Object.keys(motionDefs)
    return groups.filter(g => TALK_HINTS.some(h => g.toLowerCase().includes(h)))
  }
  
  function getIdleGroups() {
    const motionDefs = getMotionDefs()
    const groups = Object.keys(motionDefs)
    return groups.filter(g => IDLE_HINTS.some(h => g.toLowerCase().includes(h)))
  }
  
  function getFallbackIdle() {
    const motionDefs = getMotionDefs()
    const groups = Object.keys(motionDefs)
    const idleGroups = getIdleGroups()
    return idleGroups[0] ?? groups.find(g=>/idle|loop/i.test(g)) ?? groups[0]
  }

  let mood: Mood = 'neutral' // Used in setMood method
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
    const exprDefs = getExprDefs()
    const hit = exprDefs.find((e: any) => name.some(n => (e.Name || e.name)?.toLowerCase().includes(n)))
    return (hit?.Name || hit?.name) ?? null
  }

  // 重置所有表情参数到默认值
  async function resetAllExpressions() {
    console.log(`[AnimDirector] 重置所有表情参数`)
    
    // 方法1: 使用 expressionManager 重置
    const em = anyModel.internalModel?.motionManager?.expressionManager
    if (em) {
      try {
        // 尝试重置表情
        if (typeof em.setExpression === 'function') {
          em.setExpression(-1) // 使用 -1 重置
        }
        if (typeof em.resetExpression === 'function') {
          em.resetExpression()
        }
        if (typeof em.clearExpression === 'function') {
          em.clearExpression()
        }
      } catch (e) {
        console.warn(`[AnimDirector] expressionManager 重置失败:`, e)
      }
    }
    
    // 方法2: 手动重置所有表情相关参数
    const expressions = getExprDefs()
    for (const expr of expressions) {
      try {
        const url = new URL(expr.File, opts.baseDir).toString()
        const json = await fetch(url).then(r => r.json()).catch(() => null)
        if (json?.Parameters) {
          // 将所有表情参数重置为 0
          for (const param of json.Parameters) {
            const pid = param.Id
            try {
              if (anyModel.setParameterValueById) {
                anyModel.setParameterValueById(pid, 0)
              } else if (anyModel.internalModel?.coreModel?.setParameterValueById) {
                anyModel.internalModel.coreModel.setParameterValueById(pid, 0)
              }
            } catch (e) {
              // 忽略个别参数设置失败
            }
          }
        }
      } catch (e) {
        // 忽略个别表情文件加载失败
      }
    }
    
    console.log(`[AnimDirector] 表情重置完成`)
  }

  async function setExpressionById(id: string) {
    debugger
    console.log(`[AnimDirector] 设置表情: ${id}`)
    
    // 首先重置所有表情（避免重叠）
    await resetAllExpressions()
    
    // 找到表情的索引
    const expressions = getExprDefs()
    const exprIndex = expressions.findIndex((e: any) => (e.Name || e.name) === id)
    
    if (exprIndex === -1) {
      console.error(`[AnimDirector] 找不到表情: ${id}, 可用表情:`, expressions.map((e: any) => e.Name || e.name))
      return
    }
    
    console.log(`[AnimDirector] 找到表情索引: ${exprIndex} (${id})`)
    
    // 方法1: 使用 expressionManager 的索引方式
    const em = anyModel.internalModel?.motionManager?.expressionManager
    if (em && typeof em.setExpression === 'function') {
      console.log(`[AnimDirector] 使用 expressionManager.setExpression(${exprIndex})`)
      try {
        const result = em.setExpression(exprIndex)
        console.log(`[AnimDirector] expressionManager 结果:`, result)
        return
      } catch (e) {
        console.warn(`[AnimDirector] expressionManager.setExpression 失败:`, e)
      }
    }

    // 方法2: 使用高级 API（尝试索引）
    if (typeof anyModel.expression === 'function') {
      console.log(`[AnimDirector] 使用 model.expression(${exprIndex})`)
      try {
        const result = await anyModel.expression(exprIndex)
        console.log(`[AnimDirector] model.expression 结果:`, result)
        if (result) return
      } catch (e) {
        console.warn(`[AnimDirector] model.expression(索引) 失败:`, e)
      }
      
      // 尝试名称方式
      console.log(`[AnimDirector] 尝试 model.expression("${id}")`)
      try {
        const result = await anyModel.expression(id)
        console.log(`[AnimDirector] model.expression(名称) 结果:`, result)
        if (result) return
      } catch (e) {
        console.warn(`[AnimDirector] model.expression(名称) 失败:`, e)
      }
    }

    console.log(`[AnimDirector] 回退到手动表情加载`)
    // 回退：手动加载表达式并淡入
    const rec = expressions.find((e: any) => (e.Name || e.name) === id)
    if (!rec) {
      console.error(`[AnimDirector] 找不到表情: ${id}, 可用表情:`, expressions.map((e: any) => e.Name || e.name))
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

  async function play(group: string, index = 0, priority = 2) {
    console.log(`[AnimDirector] 播放动作: ${group}[${index}] 优先级=${priority}`)

    // 使用与直接测试相同的全局模型引用
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      console.error(`[AnimDirector] 无法获取全局模型引用`)
      return false
    }

    const globalModel = live2d.model
    console.log(`[AnimDirector] 使用全局模型引用进行动作播放`)

    // 检查模型是否准备好
    if (!globalModel.internalModel) {
      console.error(`[AnimDirector] 模型内部结构未准备好`)
      return false
    }

    // 获取动作定义
    const motionDefs = getMotionDefs()
    console.log(`[AnimDirector] 可用动作组:`, Object.keys(motionDefs))

    if (!motionDefs[group] || motionDefs[group].length === 0) {
      console.error(`[AnimDirector] 动作组不存在: ${group}, 可用组:`, Object.keys(motionDefs))
      return false
    }

    if (index >= motionDefs[group].length) {
      console.error(`[AnimDirector] 动作索引超出范围: ${group}[${index}], 最大索引: ${motionDefs[group].length - 1}`)
      return false
    }

    // 方法1: 使用模型内置的motionManager（最可靠的方法）
    if (globalModel.motionManager && typeof globalModel.motionManager.startMotion === 'function') {
      console.log(`[AnimDirector] 使用 motionManager.startMotion API`)

      try {
        // 使用motionManager的startMotion方法
        // 参数：(group, index, priority)
        const result = globalModel.motionManager.startMotion(group, index, priority)
        console.log(`[AnimDirector] motionManager.startMotion('${group}', ${index}, ${priority}) 结果:`, result)

        if (result !== null && result !== false) {
          console.log(`[AnimDirector] 动作播放成功 - 使用motionManager`)
          return true
        }

        // 如果指定索引失败，尝试索引0
        if (index > 0) {
          const backupResult = globalModel.motionManager.startMotion(group, 0, priority)
          console.log(`[AnimDirector] motionManager.startMotion('${group}', 0, ${priority}) 备用结果:`, backupResult)

          if (backupResult !== null && backupResult !== false) {
            console.log(`[AnimDirector] 动作播放成功 - 使用motionManager备用索引`)
            return true
          }
        }

      } catch (error) {
        console.warn(`[AnimDirector] motionManager.startMotion 失败:`, error)
      }
    }

    // 方法2: 使用标准的 model.motion API
    if (typeof globalModel.motion === 'function') {
      console.log(`[AnimDirector] 使用 model.motion API`)
      try {
        // 根据官方文档，model.motion() 调用后立即开始播放动作
        // 不需要检查Promise返回值，API调用成功即表示动作开始播放
        const result = globalModel.motion(group, index)
        console.log(`[AnimDirector] model.motion('${group}', ${index}) 调用成功`)

        // API调用成功，动作应该已经开始播放
        console.log(`[AnimDirector] 动作播放成功 - API调用完成`)
        return true

      } catch (error) {
        console.warn(`[AnimDirector] model.motion API 调用失败:`, error)

        // 如果指定索引失败，尝试索引0（第一个动作）
        if (index > 0) {
          try {
            const result = globalModel.motion(group, 0)
            console.log(`[AnimDirector] model.motion('${group}', 0) 备用调用成功`)
            console.log(`[AnimDirector] 动作播放成功 - 使用备用索引`)
            return true
          } catch (backupError) {
            console.warn(`[AnimDirector] 备用索引也失败:`, backupError)
          }
        }

        // 尝试随机播放该组（不指定索引）
        try {
          const result = globalModel.motion(group)
          console.log(`[AnimDirector] model.motion('${group}') 随机播放调用成功`)
          console.log(`[AnimDirector] 动作播放成功 - 随机播放`)
          return true
        } catch (randomError) {
          console.warn(`[AnimDirector] 随机播放也失败:`, randomError)
        }
      }
    }
    
    console.log(`[AnimDirector] 准备播放动作文件: ${motionDefs[group][index].File}`)

    // 方法2: 尝试使用 internalModel.startMotion API（备用方法）
    const internalModel = anyModel.internalModel
    if (internalModel && typeof internalModel.startMotion === 'function') {
      console.log(`[AnimDirector] 使用 internalModel.startMotion`)
      try {
        let result = await internalModel.startMotion(group, index, priority)
        console.log(`[AnimDirector] internalModel.startMotion 结果:`, result)
        if (result !== false && result !== null && result !== undefined) {
          console.log(`[AnimDirector] 动作播放成功`)
          return true
        }
      } catch (error) {
        console.warn(`[AnimDirector] internalModel.startMotion 失败:`, error)
      }
    }

    // 如果所有方法都失败，记录错误信息
    console.error(`[AnimDirector] 所有动作播放方法都失败了`)
    console.error(`[AnimDirector] 请检查:`)
    console.error(`1. 动作文件是否存在: ${motionDefs[group][index].File}`)
    console.error(`2. 模型是否完全加载`)
    console.error(`3. Live2D 版本是否兼容`)

    return false
  }

  async function loopGroup(group: string, prio = 1) {
    const myToken = ++loopToken
    const motionDefs = getMotionDefs()
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
      const talkGroups = getTalkGroups()
      const fallbackIdle = getFallbackIdle()
      const g = talkGroups[0] ?? fallbackIdle
      void loopGroup(g, 2)
    },
    speakStop() {
      speaking = false
      loopToken++ // 打断循环
      // 回到 Idle
      const fallbackIdle = getFallbackIdle()
      if (fallbackIdle) void play(fallbackIdle, 0, 1)
      // 情绪回到中性（可按需保留上一表情）
      // this.setMood('neutral')
    },
    dispose() { loopToken++; speaking = false },
  }
}
