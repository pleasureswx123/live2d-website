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

  // 可用的表情列表 - 使用模型文件中的实际名称
  const expressions = [
    { id: 'aojiao', name: '傲娇' },
    { id: 'chayao', name: '叉腰' },
    { id: 'hahadadxiao', name: '哈哈大笑' },
    { id: 'weiqu', name: '委屈' },
    { id: 'haixiu', name: '害羞' },
    { id: 'jingxi', name: '惊喜' },
    { id: 'jingya', name: '惊讶' },
    { id: 'tuosai', name: '托腮' },
    { id: 'baoxiong', name: '抱胸' },
    { id: 'huishou', name: '挥手（表情）' }, // 注意：这是表情不是动作
    { id: 'wenroudexiao', name: '温柔的笑' },
    { id: 'shengqi', name: '生气' },
    { id: 'diannao', name: '电脑' },
    { id: 'diannaofaguang', name: '电脑发光' },
    { id: 'mimiyan', name: '眯眯眼' },
    { id: 'yanlei', name: '眼泪' },
    { id: 'lianhong', name: '脸红' },
    { id: 'luolei', name: '落泪' },
    { id: 'jianpantaiqi', name: '键盘抬起' },
    { id: 'guilian', name: '鬼脸' }
  ]

  // 可用的动作列表 - 使用模型文件中的实际组名和动作
  const motions = [
    { id: 'huishou_motion', name: '挥手', group: 'TapBody', index: 0 },
    { id: 'diantou', name: '点头', group: 'TapBody', index: 1 },
    { id: 'yaotou', name: '摇头', group: 'TapBody', index: 2 },
    { id: 'yanzhuzi', name: '眼珠子', group: 'TapHead', index: 0 },
    { id: 'shuijiao', name: '睡觉', group: 'TapHead', index: 1 },
    { id: 'sleep', name: '睡眠', group: 'Idle', index: 0 },
    { id: 'jichudonghua', name: '基础动画', group: 'Idle', index: 1 }
  ]

  // 播放表情
  const handlePlayExpression = () => {
    debugger
    if (!selectedExpression) return
    console.log(`[ControlPanel] 请求播放表情: ${selectedExpression}`)
    
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      console.error('[ControlPanel] Live2D 模型未加载')
      return
    }
    
    const director = live2d.model.__director
    if (!director) {
      console.error('[ControlPanel] 动画导演未初始化')
      return
    }
    
    console.log('[ControlPanel] 调用 director.setExpression')
    director.setExpression(selectedExpression)
  }

  // 播放动作
  const handlePlayMotion = () => {
    debugger
    if (!selectedMotion) return
    console.log(`[ControlPanel] 请求播放动作: ${selectedMotion}`)
    
    const live2d = (window as any).__live2d
    if (!live2d?.model) {
      console.error('[ControlPanel] Live2D 模型未加载')
      return
    }
    
    const director = live2d.model.__director
    if (!director) {
      console.error('[ControlPanel] 动画导演未初始化')
      return
    }
    
    const motion = motions.find(m => m.id === selectedMotion)
    if (!motion) {
      console.error(`[ControlPanel] 找不到动作定义: ${selectedMotion}`)
      return
    }
    
    console.log(`[ControlPanel] 调用 director.playMotion: ${motion.group}[${motion.index}]`)
    director.playMotion(motion.group, { index: motion.index })
  }

  // 重置表情
  const handleResetExpression = () => {
    const live2d = (window as any).__live2d
    if (live2d?.model) {
      const director = live2d.model.__director
      if (director) {
        // 设置为中性表情
        director.setMood('neutral')
        setSelectedExpression('')
        console.log('重置表情')
      }
    }
  }

  // 测试口型同步
  const handleTestLipSync = async () => {
    const live2d = (window as any).__live2d
    if (live2d?.model) {
      const director = live2d.model.__director
      const lipSync = live2d.model.__lipSync
      
      if (director && lipSync) {
        if (!isTestingLipSync) {
          // 开始说话测试
          director.speakStart({ mood: 'happy' })
          // 请求麦克风并启动口型同步
          try {
            console.log('[ControlPanel] 请求麦克风权限...')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            console.log('[ControlPanel] 麦克风权限获取成功，启动麦克风口型同步')
            await lipSync.fromStream(stream)
          } catch (e) {
            console.warn('[ControlPanel] 无法访问麦克风，改用测试音频。', e)
            const el = new Audio(testAudio)
            el.loop = true
            el.volume = volume / 100
            console.log('[ControlPanel] 启动测试音频口型同步')
            el.play().catch(()=>{})
            ;(window as any).__live2dTestAudio = el
            await lipSync.fromMediaElement(el)
          }
          setIsTestingLipSync(true)
          console.log('开始口型测试')
          
          // 5秒后自动停止
          setTimeout(() => {
            director.speakStop()
            try { lipSync.stop() } catch {}
            try { (window as any).__live2dTestAudio = null } catch {}
            setIsTestingLipSync(false)
            console.log('口型测试结束')
          }, 5000)
        } else {
          // 手动停止
          director.speakStop()
          try { lipSync.stop() } catch {}
          try { (window as any).__live2dTestAudio = null } catch {}
          setIsTestingLipSync(false)
          console.log('手动停止口型测试')
        }
      }
    }
  }

  // 设置音量
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    // 调整测试音频音量（麦克风路径不直接回放音量控制，避免回声）
    const el: HTMLAudioElement | undefined = (window as any).__live2dTestAudio
    if (el) el.volume = Math.max(0, Math.min(1, newVolume / 100))
    console.log(`设置音量: ${newVolume}%`)
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
            {expressions.map((exp) => (
              <option key={exp.id} value={exp.id}>
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
            {motions.map((motion) => (
              <option key={motion.id} value={motion.id}>
                {motion.name} ({motion.group})
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

        {/* 口型测试 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">口型测试</h3>
          <button
            onClick={handleTestLipSync}
            className={`w-full flex items-center justify-center space-x-2 p-2 rounded transition-colors ${
              isTestingLipSync
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isTestingLipSync ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{isTestingLipSync ? '停止测试' : '开始口型测试'}</span>
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {isTestingLipSync ? '正在测试口型同步...' : '点击开始5秒口型测试'}
          </p>
        </div>

        {/* 音量控制 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">音量控制</h3>
          <div className="flex items-center space-x-3">
            <Volume2 size={16} className="text-cyan-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-cyan-400 text-sm w-12">{volume}%</span>
          </div>
        </div>

        {/* 模型信息 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">模型信息</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>模型: youyou</p>
            <p>版本: Cubism 4.0</p>
            <p>表情数量: {expressions.length}</p>
            <p>动作数量: {motions.length}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ControlPanel
