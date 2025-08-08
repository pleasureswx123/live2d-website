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
    if (!settings) return {}
    return settings.Motions || settings.motions || {}
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
    
    // 检查模型是否准备好
    if (!anyModel.internalModel) {
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
    
    console.log(`[AnimDirector] 准备播放动作文件: ${motionDefs[group][index].File}`)

    // 方法1: 使用正确的 Live2D API
    console.log(`[AnimDirector] 尝试 Live2D 官方 API`)
    
    // 检查模型是否有 internalModel
    if (!anyModel.internalModel) {
      console.error(`[AnimDirector] internalModel 不存在`)
      return false
    }
    
    // 方法1a: 尝试使用 Live2D 的官方 startMotion API
    try {
      console.log(`[AnimDirector] 尝试官方 startMotion API`)
      
      // Live2D Cubism 4 的正确调用方式是直接在 internalModel 上调用
      const internalModel = anyModel.internalModel
      if (internalModel && typeof internalModel.startMotion === 'function') {
        console.log(`[AnimDirector] 使用 internalModel.startMotion`)
        let result = await internalModel.startMotion(group, index, 3) // FORCE priority
        console.log(`[AnimDirector] internalModel.startMotion 结果:`, result)
        if (result && result !== false) return result
        
        // 尝试不同优先级
        result = await internalModel.startMotion(group, index, 2) // NORMAL priority
        console.log(`[AnimDirector] internalModel.startMotion(NORMAL) 结果:`, result)
        if (result && result !== false) return result
      }
    } catch (e) {
      console.warn(`[AnimDirector] internalModel.startMotion 失败:`, e)
    }
    
    // 方法1b: 尝试高级 model.motion API
    if (typeof anyModel.motion === 'function') {
      console.log(`[AnimDirector] 尝试 model.motion API`)
      try {
        let result = await anyModel.motion(group, index)
        console.log(`[AnimDirector] model.motion(${group}, ${index}) 结果:`, result)
        if (result && result !== false) return result
        
        // 尝试随机播放
        result = await anyModel.motion(group)
        console.log(`[AnimDirector] model.motion(${group}) 随机结果:`, result)
        if (result && result !== false) return result
      } catch (e) {
        console.warn(`[AnimDirector] model.motion API 失败:`, e)
      }
    }

    // 方法2: 获取 motionManager 并尝试播放
    const motionManager = anyModel.internalModel.motionManager
    if (motionManager) {
      console.log(`[AnimDirector] motionManager 详细状态:`, {
        hasStartMotion: typeof motionManager.startMotion === 'function',
        hasStartRandomMotion: typeof motionManager.startRandomMotion === 'function',
        hasStartMotionByPriority: typeof motionManager.startMotionByPriority === 'function',
        motionManagerKeys: Object.keys(motionManager),
        allMethods: Object.keys(motionManager).filter(k => typeof motionManager[k] === 'function'),
        definitions: motionManager.definitions ? 'exists' : 'missing',
        _definitions: motionManager._definitions ? 'exists' : 'missing',
        queueManager: motionManager.queueManager ? 'exists' : 'missing',
        state: motionManager.state || 'unknown',
        isInitialized: motionManager.isInitialized || false,
        motionQueueManager: motionManager.motionQueueManager ? 'exists' : 'missing'
      })
      
      // 检查 motionManager 是否已经初始化
      if (motionManager.state === 'uninitialized' || !motionManager.isInitialized) {
        console.warn(`[AnimDirector] motionManager 未初始化，尝试初始化...`)
        try {
          if (typeof motionManager.initialize === 'function') {
            motionManager.initialize()
          }
        } catch (e) {
          console.warn(`[AnimDirector] motionManager 初始化失败:`, e)
        }
      }

      // 尝试不同的 startMotion 方法
      if (typeof motionManager.startMotion === 'function') {
        console.log(`[AnimDirector] 使用 motionManager.startMotion`)
        try {
          // Live2D Cubism 4 的 startMotion 通常需要文件路径而不是索引
          const motionFile = motionDefs[group][index].File
          debugger
          const motionPath = `${opts.baseDir}${motionFile}`
          
          console.log(`[AnimDirector] 尝试使用文件路径: ${motionPath}`)
          let result = motionManager.startMotion(group, index, priority)
          console.log(`[AnimDirector] startMotion(${group}, ${index}, ${priority}) 结果:`, result)
          
          // 等待Promise完成（如果是Promise）
          if (result && typeof result.then === 'function') {
            result = await result
            console.log(`[AnimDirector] startMotion Promise 结果:`, result)
          }
          
          if (result && result !== false) return result

          // 尝试不同的优先级
          console.log(`[AnimDirector] 尝试优先级 2 (NORMAL)`)
          result = motionManager.startMotion(group, index, 2)
          console.log(`[AnimDirector] startMotion 优先级2 结果:`, result)
          
          if (result && typeof result.then === 'function') {
            result = await result
          }
          if (result && result !== false) return result

          // 尝试优先级 1 (IDLE)
          console.log(`[AnimDirector] 尝试优先级 1 (IDLE)`)
          result = motionManager.startMotion(group, index, 1)
          console.log(`[AnimDirector] startMotion 优先级1 结果:`, result)
          
          if (result && typeof result.then === 'function') {
            result = await result
          }
          if (result && result !== false) return result
          
        } catch (e) {
          console.warn(`[AnimDirector] motionManager.startMotion 失败:`, e)
        }
      }

      // 尝试使用 startMotionByPriority
      if (typeof motionManager.startMotionByPriority === 'function') {
        console.log(`[AnimDirector] 使用 motionManager.startMotionByPriority`)
        try {
          const result = motionManager.startMotionByPriority(group, index, priority)
          console.log(`[AnimDirector] startMotionByPriority 结果:`, result)
          if (result) return result
        } catch (e) {
          console.warn(`[AnimDirector] motionManager.startMotionByPriority 失败:`, e)
        }
      }
      
      // 尝试随机播放该组动作
      if (typeof motionManager.startRandomMotion === 'function') {
        console.log(`[AnimDirector] 使用 motionManager.startRandomMotion`)
        try {
          const result = motionManager.startRandomMotion(group, priority)
          console.log(`[AnimDirector] startRandomMotion 结果:`, result)
          if (result) return result
        } catch (e) {
          console.warn(`[AnimDirector] motionManager.startRandomMotion 失败:`, e)
        }
      }
    }

    // 方法4: 尝试直接文件路径方法
    if (motionManager) {
      console.log(`[AnimDirector] 尝试直接文件路径方法`)
      try {
        const motionFile = motionDefs[group][index].File
        const fullPath = `${opts.baseDir}${motionFile}`
        
        console.log(`[AnimDirector] 动作文件完整路径: ${fullPath}`)
        
        // 方法4a: 尝试用文件路径直接调用
        if (typeof motionManager.startMotion === 'function') {
          console.log(`[AnimDirector] 尝试 startMotion 使用文件路径`)
          let result = motionManager.startMotion(fullPath, priority)
          console.log(`[AnimDirector] startMotion(文件路径) 结果:`, result)
          if (result && result !== false) return result
        }
        
        // 方法4b: 检查是否存在 Cubism 4 的其他方法
        const cubismMethods = [
          'startMotionPriority',
          'reserveMotion', 
          'setMotion',
          'playMotion',
          'loadMotion'
        ]
        
        for (const methodName of cubismMethods) {
          if (typeof motionManager[methodName] === 'function') {
            console.log(`[AnimDirector] 尝试使用 ${methodName}`)
            try {
              let result = motionManager[methodName](group, index, priority)
              console.log(`[AnimDirector] ${methodName}(${group}, ${index}, ${priority}) 结果:`, result)
              if (result && typeof result.then === 'function') {
                result = await result
              }
              if (result && result !== false) return result
              
              // 也尝试文件路径
              result = motionManager[methodName](fullPath, priority)
              console.log(`[AnimDirector] ${methodName}(文件路径) 结果:`, result)
              if (result && typeof result.then === 'function') {
                result = await result
              }
              if (result && result !== false) return result
            } catch (e) {
              console.warn(`[AnimDirector] ${methodName} 调用失败:`, e)
            }
          }
        }
        
        // 方法5: 使用 motionQueueManager (关键!)
        const motionQueueManager = anyModel.internalModel.motionQueueManager
        if (motionQueueManager) {
          console.log(`[AnimDirector] 找到 motionQueueManager，尝试直接调用`)
          try {
            // 这是 Live2D Cubism 4 的正确方式
            if (typeof motionQueueManager.startMotion === 'function') {
              console.log(`[AnimDirector] 使用 motionQueueManager.startMotion`)
              let result = motionQueueManager.startMotion(group, index, 3) // FORCE
              console.log(`[AnimDirector] motionQueueManager.startMotion 结果:`, result)
              if (result && result !== false) return result
              
              // 尝试其他优先级
              result = motionQueueManager.startMotion(group, index, 2) // NORMAL
              console.log(`[AnimDirector] motionQueueManager.startMotion(NORMAL) 结果:`, result)
              if (result && result !== false) return result
            }
            
            // 尝试其他可能的方法
            const queueMethods = ['startMotionByPriority', 'reserveMotion', 'setMotion']
            for (const method of queueMethods) {
              if (typeof motionQueueManager[method] === 'function') {
                console.log(`[AnimDirector] 尝试 motionQueueManager.${method}`)
                let result = motionQueueManager[method](group, index, 3)
                console.log(`[AnimDirector] motionQueueManager.${method} 结果:`, result)
                if (result && result !== false) return result
              }
            }
          } catch (e) {
            console.warn(`[AnimDirector] motionQueueManager 调用失败:`, e)
          }
        }
        
        // 尝试直接使用内部API
        if (motionManager._definitions || motionManager.definitions) {
          const definitions = motionManager._definitions || motionManager.definitions
          const motionGroup = definitions.motions?.[group] || definitions[group]
          if (motionGroup && motionGroup[index]) {
            console.log(`[AnimDirector] 找到动作定义:`, motionGroup[index])
            
            // 尝试直接调用内部方法
            if (typeof motionManager._startMotion === 'function') {
              const result = motionManager._startMotion(group, index, priority)
              console.log(`[AnimDirector] _startMotion 结果:`, result)
              if (result) return result
            }
            
            // 尝试使用队列管理器
            if (motionManager.queueManager && typeof motionManager.queueManager.startMotion === 'function') {
              const result = motionManager.queueManager.startMotion(group, index, priority)
              console.log(`[AnimDirector] queueManager.startMotion 结果:`, result)
              if (result) return result
            }
          }
        }
      } catch (e) {
        console.warn(`[AnimDirector] Cubism 4 方法调用失败:`, e)
      }
    }

    // 最后的回退方法: 尝试 Live2D SDK 的原始方式
    console.log(`[AnimDirector] 尝试最后的回退方法`)
    try {
      // 检查是否有 Live2D 的全局对象
      const Live2D = (window as any).Live2D
      if (Live2D) {
        console.log(`[AnimDirector] 找到 Live2D 全局对象`)
        // 这里可以尝试使用 Live2D SDK 的原始 API
      }
      
      // 尝试直接操作模型的核心组件
      const coreModel = anyModel.internalModel?.coreModel
      if (coreModel) {
        console.log(`[AnimDirector] 尝试使用 coreModel`)
        // 这是最底层的方法，直接操作模型参数
        // 但这需要手动解析动作文件并应用参数变化
      }
      
      // 最后尝试：强制触发模型更新
      console.log(`[AnimDirector] 尝试强制模型更新`)
      if (typeof anyModel.update === 'function') {
        anyModel.update(16) // 强制更新一帧
      }
      
    } catch (e) {
      console.warn(`[AnimDirector] 最后回退方法失败:`, e)
    }

    console.error(`[AnimDirector] 所有动作播放方法都失败了`)
    console.error(`[AnimDirector] 请检查:`)
    console.error(`1. 动作文件是否存在: ${motionDefs[group][index].File}`)
    console.error(`2. 模型是否完全加载`)
    console.error(`3. motionManager 是否正确初始化`)
    console.error(`4. Live2D 版本是否兼容`)
    
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
