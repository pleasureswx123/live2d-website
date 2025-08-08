import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, Volume2, Mic, MicOff } from 'lucide-react'
import testAudio from '@/assets/test.wav'

interface ControlPanelProps {
  isOpen: boolean
  onClose: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({ isOpen, onClose }) => {
  const [selectedExpression, setSelectedExpression] = useState('')
  const [selectedMotion, setSelectedMotion] = useState('')
  const [volume, setVolume] = useState(70)
  const [isTestingLipSync, setIsTestingLipSync] = useState(false)

  // 基于实际文件的模型配置 - 完全匹配 youyou.model3.json 中的结构
  const modelConfig = {
    name: '悠悠',
    path: '/models/youyou/youyou.model3.json',
    motions: [
      // Idle 组
      { name: '睡眠', file: 'sleep.motion3.json', group: 'Idle', index: 0 },
      { name: '基础动画', file: 'jichudonghua.motion3.json', group: 'Idle', index: 1 },

      // TapBody 组
      { name: '挥手', file: 'huishou.motion3.json', group: 'TapBody', index: 0 },
      { name: '点头', file: 'diantou.motion3.json', group: 'TapBody', index: 1 },
      { name: '摇头', file: 'yaotou.motion3.json', group: 'TapBody', index: 2 },

      // TapHead 组
      { name: '眨珠子', file: 'yanzhuzi.motion3.json', group: 'TapHead', index: 0 },
      { name: '睡觉', file: 'shuijiao.motion3.json', group: 'TapHead', index: 1 }
    ],
    expressions: [
      { name: '傲娇', file: 'aojiao.exp3.json', index: 0 },
      { name: '抱胸', file: 'baoxiong.exp3.json', index: 1 },
      { name: '叉腰', file: 'chayao.exp3.json', index: 2 },
      { name: '点脑', file: 'diannao.exp3.json', index: 3 },
      { name: '电脑发光', file: 'diannaofaguang.exp3.json', index: 4 },
      { name: '鬼脸', file: 'guilian.exp3.json', index: 5 },
      { name: '哈哈大笑', file: 'hahadadxiao.exp3.json', index: 6 },
      { name: '害羞', file: 'haixiu.exp3.json', index: 7 },
      { name: '挥手表情', file: 'huishou.exp3.json', index: 8 },
      { name: '键盘太气', file: 'jianpantaiqi.exp3.json', index: 9 },
      { name: '惊喜', file: 'jingxi.exp3.json', index: 10 },
      { name: '惊讶', file: 'jingya.exp3.json', index: 11 },
      { name: '脸红', file: 'lianhong.exp3.json', index: 12 },
      { name: '泪流', file: 'luolei.exp3.json', index: 13 },
      { name: '眯眯眼', file: 'mimiyan.exp3.json', index: 14 },
      { name: '生气', file: 'shengqi.exp3.json', index: 15 },
      { name: '吐塞', file: 'tuosai.exp3.json', index: 16 },
      { name: '委屈', file: 'weiqu.exp3.json', index: 17 },
      { name: '温柔的笑', file: 'wenroudexiao.exp3.json', index: 18 },
      { name: '眼泪', file: 'yanlei.exp3.json', index: 19 }
    ],
    sounds: []
  }

  // 基于 App.vue 的播放表情函数
  const handlePlayExpression = async () => {
    if (!selectedExpression) {
      console.warn('未选择表情')
      return
    }

    const live2d = (window as any).__live2d
    const model = live2d?.model
    if (!model) {
      console.warn('模型未加载')
      return
    }

    try {
      console.log(`播放表情: ${selectedExpression}`)

      // 查找选中的表情配置
      const selectedExp = modelConfig.expressions.find(exp => exp.file === selectedExpression)
      if (!selectedExp) {
        console.warn('未找到选中的表情')
        return
      }

      // 检查模型是否有预定义的表情
      const hasPreDefinedExpressions = model.internalModel.settings.expressions &&
                                     model.internalModel.settings.expressions.length > 0

      if (hasPreDefinedExpressions) {
        // 对于有预定义表情的模型，使用索引
        if (selectedExp.index !== undefined) {
          console.log(`使用预定义表情索引: ${selectedExp.index}`)
          await model.expression(selectedExp.index)
        }
      } else {
        // 对于只有独立表情文件的模型，加载表情文件
        console.log('使用独立表情文件')
        await applyExpressionFromFile(selectedExpression)
      }

      console.log('表情播放成功')
    } catch (error) {
      console.error('表情播放失败:', error)
    }
  }

  // 从文件应用表情 - 参考 App.vue 的实现
  const applyExpressionFromFile = async (expressionFile: string) => {
    try {
      const expressionPath = `/models/youyou/${expressionFile}`
      console.log(`加载表情文件: ${expressionPath}`)

      const response = await fetch(expressionPath)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const expressionData = await response.json()

      if (expressionData.Type !== 'Live2D Expression' || !expressionData.Parameters) {
        throw new Error('无效的表情文件格式')
      }

      const live2d = (window as any).__live2d
      const model = live2d?.model
      if (!model) return

      // 应用表情参数
      const coreModel = model.internalModel.coreModel

      for (const param of expressionData.Parameters) {
        try {
          let newValue = param.Value

          // 处理不同的混合模式
          if (param.Blend === 'Add') {
            const currentValue = coreModel.getParameterValueById(param.Id)
            newValue = currentValue + param.Value
          } else if (param.Blend === 'Multiply') {
            const currentValue = coreModel.getParameterValueById(param.Id)
            newValue = currentValue * param.Value
          }
          // 默认是 'Overwrite' 模式，直接设置值

          coreModel.setParameterValueById(param.Id, newValue)
          console.log(`设置参数 ${param.Id} = ${newValue} (模式: ${param.Blend || 'Overwrite'})`)
        } catch (error) {
          console.warn(`设置参数失败 ${param.Id}:`, error)
        }
      }

      console.log('表情文件应用成功')
    } catch (error) {
      console.error('应用表情文件失败:', error)
      throw error
    }
  }

  // 基于 App.vue 的播放动作函数
  const handlePlayMotion = async () => {
    if (!selectedMotion) {
      console.warn('未选择动作')
      return
    }

    const live2d = (window as any).__live2d
    const model = live2d?.model
    if (!model) {
      console.warn('模型未加载')
      return
    }

    try {
      console.log(`播放动作: ${selectedMotion}`)

      // 停止当前所有动作
      model.internalModel.motionManager.stopAllMotions()

      // 查找选中的动作配置
      const selectedMotionData = modelConfig.motions.find(motion => motion.file === selectedMotion)
      if (!selectedMotionData) {
        console.warn('未找到选中的动作配置')
        return
      }

      console.log(`动作配置:`, selectedMotionData)

      // 方法1: 使用模型配置中的组名和索引（最准确的方法）
      if (selectedMotionData.group && selectedMotionData.index !== undefined) {
        console.log(`使用配置的组名和索引: ${selectedMotionData.group}[${selectedMotionData.index}]`)

        try {
          const result = await model.motion(selectedMotionData.group, selectedMotionData.index, 3)
          console.log(`动作播放结果:`, result)
          console.log('动作播放成功 - 使用配置的组名和索引')
          return
        } catch (error) {
          console.warn('使用配置的组名和索引失败:', error)
        }
      }

      // 方法2: 使用 motionManager 直接播放（备用方法）
      if (model.internalModel && model.internalModel.motionManager) {
        console.log('尝试使用 motionManager 直接播放')

        try {
          const result = await model.internalModel.motionManager.startMotion(
            selectedMotionData.group || 'TapBody', // 使用配置的组名或默认组名
            selectedMotionData.index || 0, // 使用配置的索引或默认索引
            3 // MotionPriority.NORMAL
          )
          console.log(`motionManager 播放结果:`, result)

          if (result !== null && result !== false) {
            console.log('动作播放成功 - 使用 motionManager')
            return
          }
        } catch (error) {
          console.warn('motionManager 播放失败:', error)
        }
      }

      console.log('动作播放成功')
    } catch (error) {
      console.error('播放动作失败:', error)
    }
  }

  // 重置表情 - 基于 App.vue 的实现
  const handleResetExpression = async () => {
    const live2d = (window as any).__live2d
    const model = live2d?.model
    if (!model) {
      console.warn('模型还未加载完成')
      return
    }

    try {
      console.log('重置表情到默认状态')

      // 检查模型是否有预定义的表情
      const hasPreDefinedExpressions = model.internalModel.settings.expressions &&
                                     model.internalModel.settings.expressions.length > 0

      if (hasPreDefinedExpressions) {
        // 对于有预定义表情的模型，使用表情管理器重置
        try {
          model.internalModel.motionManager.expressionManager.setExpression(null)
          console.log('使用表情管理器重置成功')
        } catch (error) {
          // 备用方法：设置第一个表情
          model.expression(0)
          console.log('使用备用方法重置表情')
        }
      } else {
        // 对于只有独立表情文件的模型，重置所有参数到默认值
        await resetAllExpressionParameters()
        console.log('重置独立表情参数成功')
      }

      // 清除选中的表情
      setSelectedExpression('')
      console.log('表情重置成功')
    } catch (error) {
      console.error('表情重置失败:', error)
    }
  }

  // 重置所有表情参数到默认值 - 参考 App.vue
  const resetAllExpressionParameters = async () => {
    const live2d = (window as any).__live2d
    const model = live2d?.model
    if (!model) return

    try {
      const coreModel = model.internalModel.coreModel

      // 获取所有表情文件中涉及的参数ID
      const allExpressionParams = new Set()

      // 遍历当前模型的所有表情文件
      const expressionList = modelConfig.expressions
      for (const exp of expressionList) {
        if (exp.file) {
          try {
            const expressionPath = `/models/youyou/${exp.file}`
            const response = await fetch(expressionPath)
            if (response.ok) {
              const data = await response.json()
              if (data.Parameters) {
                data.Parameters.forEach((param: any) => allExpressionParams.add(param.Id))
              }
            }
          } catch (error) {
            console.warn(`加载表情文件 ${exp.file} 失败:`, error)
          }
        }
      }

      console.log(`找到 ${allExpressionParams.size} 个表情参数需要重置`)

      // 将所有表情参数重置为默认值
      allExpressionParams.forEach((paramId: any) => {
        try {
          coreModel.setParameterValueById(paramId, 0)
          console.log(`重置参数 ${paramId} = 0`)
        } catch (error) {
          console.warn(`重置参数 ${paramId} 失败:`, error)
        }
      })

      console.log('表情参数已重置到默认值')
    } catch (error) {
      console.error('重置表情参数失败:', error)
    }
  }

  // 口型同步相关状态
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lipSyncSensitivity, setLipSyncSensitivity] = useState(80)
  let currentAudioContext: AudioContext | null = null
  let currentAudioSource: AudioBufferSourceNode | null = null
  let lipSyncAnimationId: number | null = null

  // 获取当前Live2D模型支持的嘴部参数列表 - 参考 App.vue
  const getMouthParameters = () => {
    const live2d = (window as any).__live2d
    const model = live2d?.model
    if (!model || !model.internalModel) {
      console.warn('模型未加载，无法获取嘴部参数')
      return []
    }

    const supportedParams: string[] = []
    const coreModel = model.internalModel.coreModel

    // 定义所有可能的嘴部参数名称
    const commonMouthParams = [
      'ParamMouthOpenY',     // 嘴部垂直开合 (主要参数)
      'ParamMouthForm',      // 嘴部形状变化 (辅助参数)
      'PARAM_MOUTH_OPEN_Y',  // 嘴部垂直开合 (旧版本)
      'PARAM_MOUTH_FORM',    // 嘴部形状变化 (旧版本)
      'ParamA',  // 元音A
      'ParamI',  // 元音I
      'ParamU',  // 元音U
      'ParamE',  // 元音E
      'ParamO'   // 元音O
    ]

    // 逐个检查参数是否存在于当前模型中
    for (const paramName of commonMouthParams) {
      try {
        const value = coreModel.getParameterValueById(paramName)
        if (value !== undefined && value !== null) {
          supportedParams.push(paramName)
        }
      } catch (error) {
        // 参数不存在于当前模型中，静默忽略
      }
    }

    console.log(`模型支持的嘴部参数 (${supportedParams.length}个):`, supportedParams)
    return supportedParams
  }

  // 口型同步核心功能 - 参考 App.vue 的 speaking 函数
  const speaking = async () => {
    try {
      const live2d = (window as any).__live2d
      const model = live2d?.model
      if (!model) {
        throw new Error('模型未加载')
      }

      const mouthParams = getMouthParameters()
      if (mouthParams.length === 0) {
        throw new Error('当前模型不支持嘴部参数控制')
      }

      console.log(`开始口型同步，支持的参数: ${mouthParams.join(', ')}`)

      // 获取音频文件
      const response = await fetch(testAudio)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`)
      }

      // 处理音频数据
      const audioData = await response.arrayBuffer()
      const audioBuffer = await currentAudioContext!.decodeAudioData(audioData)

      // 创建音频源节点
      const source = currentAudioContext!.createBufferSource()
      currentAudioSource = source

      // 创建分析器节点
      const analyser = currentAudioContext!.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      // 连接音频节点
      source.buffer = audioBuffer
      source.connect(analyser)
      analyser.connect(currentAudioContext!.destination)

      // 播放状态管理
      let isPlaying = true

      // 监听音频播放结束事件
      source.onended = () => {
        isPlaying = false
        setIsSpeaking(false)

        // 重置Live2D模型的嘴部参数到默认状态
        if (model && model.internalModel && model.internalModel.coreModel) {
          try {
            for (const paramName of mouthParams) {
              model.internalModel.coreModel.setParameterValueById(paramName, 0)
            }
            console.log('嘴部参数已重置到默认状态')
          } catch (paramError) {
            console.warn('重置嘴部参数失败:', paramError)
          }
        }
      }

      // 开始播放音频
      source.start()

      // 嘴部动画更新函数
      const updateMouth = () => {
        if (!isPlaying || currentAudioContext!.state !== 'running' || !model || !isSpeaking) {
          return
        }

        try {
          // 实时音频分析
          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(dataArray)

          // 计算整体音量强度
          const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

          // 音量到口型的智能映射
          const sensitivityFactor = lipSyncSensitivity
          const mouthOpen = Math.min(1, volume / sensitivityFactor)

          // Live2D参数更新 - 增强调试和错误处理
          for (const paramName of mouthParams) {
            try {
              let targetValue = 0

              if (paramName.includes('MouthOpen') || paramName.includes('MOUTH_OPEN')) {
                // 主要的嘴部垂直开合控制
                targetValue = mouthOpen
              } else if (paramName.includes('MouthForm') || paramName.includes('MOUTH_FORM')) {
                // 嘴部形状和轮廓控制
                targetValue = mouthOpen * 0.5
              } else if (paramName === 'ParamA') {
                // 元音"A" - 大开口音
                targetValue = mouthOpen * 0.8
              } else if (['ParamI', 'ParamE'].includes(paramName)) {
                // 元音"I"和"E" - 中高位音
                targetValue = mouthOpen * 0.6
              } else if (['ParamU', 'ParamO'].includes(paramName)) {
                // 元音"U"和"O" - 圆唇音
                targetValue = mouthOpen * 0.4
              } else {
                // 默认使用主要开合值
                targetValue = mouthOpen
              }

              // 设置参数值
              model.internalModel.coreModel.setParameterValueById(paramName, targetValue)

              // 验证参数是否设置成功
              const actualValue = model.internalModel.coreModel.getParameterValueById(paramName)

              // 只在值有显著变化时输出日志，避免日志过多
              if (Math.abs(targetValue - actualValue) > 0.01 || targetValue > 0.1) {
                console.log(`[LipSync] 参数 ${paramName} 设置为 ${targetValue.toFixed(3)}, 实际值: ${actualValue.toFixed(3)}`)
              }

            } catch (paramError) {
              console.warn(`设置参数 ${paramName} 失败:`, paramError)
            }
          }

          // 请求下一帧动画更新
          lipSyncAnimationId = requestAnimationFrame(updateMouth)
        } catch (error) {
          console.error('更新嘴部动画失败:', error)
          isPlaying = false
        }
      }

      // 启动嘴部动画
      updateMouth()

    } catch (error) {
      console.error('音频播放和嘴部同步失败:', error)
      setIsSpeaking(false)
    }
  }

  // 开始说话 - 参考 App.vue 的 startSpeaking 函数
  const startSpeaking = async () => {
    if (isSpeaking) {
      console.warn('已经在说话中，请先停止当前的口型同步')
      return
    }

    try {
      console.log('开始口型同步...')
      setIsSpeaking(true)

      // 创建新的音频上下文
      if (!currentAudioContext || currentAudioContext.state === 'closed') {
        currentAudioContext = new AudioContext()
        console.log('创建新的AudioContext')
      }

      // 处理浏览器音频策略限制
      if (currentAudioContext.state === 'suspended') {
        await currentAudioContext.resume()
        console.log('恢复被暂停的AudioContext')
      }

      // 启动口型同步
      await speaking()

    } catch (error) {
      console.error('启动口型同步失败:', error)
      setIsSpeaking(false)
    }
  }

  // 停止说话 - 参考 App.vue 的 stopSpeaking 函数
  const stopSpeaking = () => {
    try {
      console.log('停止口型同步...')

      // 停止音频播放
      if (currentAudioSource) {
        try {
          currentAudioSource.stop()
          console.log('音频播放已停止')
        } catch (audioError) {
          console.warn('停止音频时出现错误:', audioError)
        }
        currentAudioSource = null
      }

      // 取消动画循环
      if (lipSyncAnimationId) {
        cancelAnimationFrame(lipSyncAnimationId)
        lipSyncAnimationId = null
        console.log('动画循环已取消')
      }

      // 重置嘴部参数
      const live2d = (window as any).__live2d
      const model = live2d?.model
      if (model && model.internalModel && model.internalModel.coreModel) {
        const mouthParams = getMouthParameters()
        for (const paramName of mouthParams) {
          try {
            model.internalModel.coreModel.setParameterValueById(paramName, 0)
          } catch (paramError) {
            console.warn(`重置参数 ${paramName} 失败:`, paramError)
          }
        }
        console.log(`已重置 ${mouthParams.length} 个嘴部参数`)
      }

      // 更新UI状态
      setIsSpeaking(false)
      console.log('口型同步已完全停止')

    } catch (error) {
      console.error('停止口型同步失败:', error)
      setIsSpeaking(false)
    }
  }

  // 深度调试模型状态
  const handleDeepModelDebug = async () => {
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      alert('Live2D 模型未加载')
      return
    }

    const model = live2d.model
    console.log('[Deep Debug] 开始深度调试模型状态')

    try {
      // 检查模型的详细状态
      console.log('[Deep Debug] 模型对象:', model)
      console.log('[Deep Debug] 模型设置:', model.settings)
      console.log('[Deep Debug] 内部模型:', model.internalModel)
      console.log('[Deep Debug] 动作管理器:', model.motionManager)
      console.log('[Deep Debug] 表情管理器:', model.expressionManager)

      // 检查动作数据
      if (model.settings) {
        console.log('[Deep Debug] 设置中的动作:', model.settings.motions)
        console.log('[Deep Debug] 设置中的表情:', model.settings.expressions)
      }

      // 检查内部模型的动作数据
      if (model.internalModel) {
        console.log('[Deep Debug] 内部模型动作:', model.internalModel.motions)
        console.log('[Deep Debug] 内部模型表情:', model.internalModel.expressions)
      }

      // 尝试使用动作管理器
      if (model.motionManager) {
        console.log('[Deep Debug] 尝试使用动作管理器播放动作')
        const motionResult = model.motionManager.startMotion('TapBody', 1, 3)
        console.log('[Deep Debug] 动作管理器结果:', motionResult)
      }

      // 尝试使用表情管理器
      if (model.expressionManager) {
        console.log('[Deep Debug] 尝试使用表情管理器播放表情')
        const expressionResult = model.expressionManager.setExpression('chayao')
        console.log('[Deep Debug] 表情管理器结果:', expressionResult)
      }

      alert('深度调试完成！请查看控制台日志')

    } catch (error) {
      console.error('[Deep Debug] 调试失败:', error)
      alert(`深度调试失败: ${error.message}`)
    }
  }

  // 测试动作播放的专门函数
  const handleTestMotionDirect = async () => {
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      alert('Live2D 模型未加载')
      return
    }

    const model = live2d.model
    console.log('[Test] 开始直接测试动作播放')

    try {
      // 测试1: 使用正确的 pixi-live2d-display API
      if (typeof model.motion === 'function') {
        console.log('[Test] 测试 model.motion')
        const result = model.motion('TapBody', 1)
        console.log('[Test] model.motion 结果:', result)

        // 如果返回Promise，等待完成
        if (result && typeof result.then === 'function') {
          const promiseResult = await result
          console.log('[Test] model.motion Promise 完成，结果:', promiseResult)
          // 即使Promise结果是false，动作可能仍在播放
          // 我们检查动作是否真的开始播放了
          alert(`测试完成！Promise结果: ${promiseResult}，但动作可能正在播放`)
          return
        }

        if (result !== false && result !== null && result !== undefined) {
          alert('成功！使用 model.motion (非Promise)')
          return
        }
      }

      // 测试2: 直接调用 internalModel.startMotion
      const internalModel = model.internalModel
      if (internalModel && typeof internalModel.startMotion === 'function') {
        console.log('[Test] 测试 internalModel.startMotion')
        const result = await internalModel.startMotion('TapBody', 1, 3)
        console.log('[Test] internalModel.startMotion 结果:', result)
        if (result) {
          alert('成功！使用 internalModel.startMotion')
          return
        }
      }

      // 测试3: 尝试 motionQueueManager
      const motionQueueManager = internalModel?.motionQueueManager
      if (motionQueueManager && typeof motionQueueManager.startMotion === 'function') {
        console.log('[Test] 测试 motionQueueManager.startMotion')
        const result = motionQueueManager.startMotion('TapBody', 1, 3)
        console.log('[Test] motionQueueManager.startMotion 结果:', result)
        if (result) {
          alert('成功！使用 motionQueueManager.startMotion')
          return
        }
      }

      alert('所有测试都失败了，请查看控制台日志')

    } catch (error) {
      console.error('[Test] 测试过程中出错:', error)
      alert('测试出错: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // 调试助手 - 检查Live2D状态
  const handleDebugLive2D = () => {
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      console.error('[Debug] Live2D 模型未加载')
      alert('Live2D 模型未加载')
      return
    }

    const model = live2d.model
    const director = model.__director

    // 获取详细的调试信息
    const motionManager = model.internalModel?.motionManager
    const settings = director ? (typeof director.getSettings === 'function' ? director.getSettings() : null) : null
    const motionDefs = director ? (typeof director.getMotionDefs === 'function' ? director.getMotionDefs() : {}) : {}
    const exprDefs = director ? (typeof director.getExprDefs === 'function' ? director.getExprDefs() : []) : []

    console.log('[Debug] Live2D 完整状态检查:', {
      hasModel: !!model,
      hasDirector: !!director,
      modelKeys: Object.keys(model),
      internalModel: model.internalModel ? Object.keys(model.internalModel) : null,
      motionManager: motionManager ? {
        keys: Object.keys(motionManager),
        methods: Object.keys(motionManager).filter(k => typeof motionManager[k] === 'function'),
        hasStartMotion: typeof motionManager.startMotion === 'function',
        hasStartRandomMotion: typeof motionManager.startRandomMotion === 'function',
        hasStartMotionByPriority: typeof motionManager.startMotionByPriority === 'function',
        hasStartMotionPriority: typeof motionManager.startMotionPriority === 'function',
        hasReserveMotion: typeof motionManager.reserveMotion === 'function',
        hasSetMotion: typeof motionManager.setMotion === 'function',
        hasPlayMotion: typeof motionManager.playMotion === 'function',
        definitions: motionManager.definitions ? 'exists' : 'missing',
        _definitions: motionManager._definitions ? 'exists' : 'missing',
        queueManager: motionManager.queueManager ? 'exists' : 'missing'
      } : null,
      settings: settings,
      motionDefs: motionDefs,
      expressionDefs: exprDefs,
      availableMotions: Object.keys(motionDefs),
      availableExpressions: exprDefs.map((e: any) => e.Name || e.name || e)
    })

    // 显示简化的调试信息
    const debugInfo = `
Live2D 调试信息:
- 模型已加载: ${!!model}
- 动画导演: ${!!director}
- 动作管理器: ${!!motionManager}
- 可用动作组: ${Object.keys(motionDefs).join(', ') || '无'}
- 可用表情数: ${exprDefs.length}
- motionManager方法: ${motionManager ? Object.keys(motionManager).filter(k => typeof motionManager[k] === 'function').join(', ') : '无'}

详细信息请查看控制台日志。
    `

    alert(debugInfo.trim())
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-96 bg-gray-900/95 backdrop-blur-sm border-l border-cyan-400/30 z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-cyan-400">Live2D 控制面板</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 表情控制 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">表情控制</h3>
          <select
            value={selectedExpression}
            onChange={(e) => setSelectedExpression(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-3"
          >
            <option value="">选择表情</option>
            {modelConfig.expressions.map((exp) => (
              <option key={exp.file} value={exp.file}>
                {exp.name}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={handlePlayExpression}
              disabled={!selectedExpression}
              className="flex-1 flex items-center justify-center space-x-2 p-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} />
              <span>播放表情</span>
            </button>
            <button
              onClick={handleResetExpression}
              className="flex items-center justify-center p-2 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* 动作控制 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">动作控制</h3>
          <select
            value={selectedMotion}
            onChange={(e) => setSelectedMotion(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-3"
          >
            <option value="">选择动作</option>
            {modelConfig.motions.map((motion) => (
              <option key={motion.file} value={motion.file}>
                {motion.name} ({motion.group}[{motion.index}])
              </option>
            ))}
          </select>
          <button
            onClick={handlePlayMotion}
            disabled={!selectedMotion}
            className="w-full flex items-center justify-center space-x-2 p-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            <span>播放动作</span>
          </button>
        </div>

        {/* 口型同步测试 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">口型同步测试</h3>

          {/* 敏感度控制 */}
          <div className="mb-3">
            <label className="block text-sm text-gray-300 mb-2">
              敏感度: {lipSyncSensitivity}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={lipSyncSensitivity}
              onChange={(e) => setLipSyncSensitivity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>低敏感度</span>
              <span>高敏感度</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex space-x-2">
            <button
              onClick={startSpeaking}
              disabled={isSpeaking}
              className="flex-1 flex items-center justify-center space-x-2 p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic size={16} />
              <span>{isSpeaking ? '正在说话...' : '开始说话'}</span>
            </button>
            <button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="flex-1 flex items-center justify-center space-x-2 p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MicOff size={16} />
              <span>停止说话</span>
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            {isSpeaking ? '🎙️ 正在分析音频并同步口型' : '💤 口型同步待机中'}
          </p>
        </div>

        {/* 模型信息 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">模型信息</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>模型: {modelConfig.name}</p>
            <p>版本: Cubism 4.0</p>
            <p>表情数量: {modelConfig.expressions.length}</p>
            <p>动作数量: {modelConfig.motions.length}</p>
          </div>
        </div>

        {/* 调试工具 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">调试工具</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                const live2d = (window as any).__live2d
                if (live2d?.model) {
                  console.log('Live2D 模型状态:', live2d.model)
                  console.log('模型配置:', modelConfig)
                  alert('调试信息已输出到控制台')
                } else {
                  alert('Live2D 模型未加载')
                }
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors text-sm"
            >
              🔍 检查Live2D状态
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ControlPanel
