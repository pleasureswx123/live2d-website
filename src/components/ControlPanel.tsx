import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, Volume2 } from 'lucide-react'
import type { Live2DState, Live2DControls } from '@/hooks/useLive2D'
import { getDefaultModelConfig } from '@/config/modelsConfig'

interface ControlPanelProps {
  live2dState: Live2DState
  live2dControls: Live2DControls
}

const ControlPanel: React.FC<ControlPanelProps> = ({ live2dState, live2dControls }) => {
  const [selectedExpression, setSelectedExpression] = useState('')
  const [selectedMotion, setSelectedMotion] = useState('')
  const [volume, setVolume] = useState(70)

  const modelConfig = getDefaultModelConfig()

  if (!modelConfig) {
    return (
      <div className="text-center text-gray-400">
        <p>模型配置未找到</p>
      </div>
    )
  }

  // 播放表情
  const handlePlayExpression = async () => {
    if (!selectedExpression) return
    await live2dControls.playExpression(selectedExpression)
  }

  // 播放动作
  const handlePlayMotion = async () => {
    if (!selectedMotion) return
    const motion = modelConfig.motions.find(m => m.name === selectedMotion)
    if (motion) {
      await live2dControls.playMotion(motion.group, 0)
    }
  }

  // 重置表情
  const handleResetExpression = () => {
    live2dControls.resetExpression()
    setSelectedExpression('')
  }

  // 设置音量
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    live2dControls.setVolume(newVolume / 100)
  }

  return (
    <div className="space-y-6 text-white">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-cyan-400 mb-2">模型控制面板</h2>
        <p className="text-gray-400 text-sm">
          当前模型: {modelConfig.displayName}
        </p>
      </div>

      {/* 模型状态 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300">模型状态</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">加载状态:</span>
            <span className={live2dState.isLoaded ? 'text-green-400' : 'text-yellow-400'}>
              {live2dState.isLoaded ? '已加载' : live2dState.isLoading ? '加载中...' : '未加载'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">模型版本:</span>
            <span className="text-gray-300">Cubism {modelConfig.version}.x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">表情数量:</span>
            <span className="text-gray-300">{modelConfig.expressions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">动作数量:</span>
            <span className="text-gray-300">{modelConfig.motions.length}</span>
          </div>
        </div>
      </div>

      {/* 表情控制 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300">表情控制</h3>
        
        <div className="space-y-3">
          <select
            value={selectedExpression}
            onChange={(e) => setSelectedExpression(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
            disabled={!live2dState.isLoaded}
          >
            <option value="">选择表情</option>
            {modelConfig.expressions.map((exp) => (
              <option key={exp.name} value={exp.name}>
                {exp.displayName}
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlayExpression}
              disabled={!selectedExpression || !live2dState.isLoaded}
              className="flex-1 flex items-center justify-center space-x-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg py-2 px-3 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} />
              <span>播放表情</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResetExpression}
              disabled={!live2dState.isLoaded}
              className="flex items-center justify-center space-x-2 bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded-lg py-2 px-3 hover:bg-gray-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 动作控制 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300">动作控制</h3>
        
        <div className="space-y-3">
          <select
            value={selectedMotion}
            onChange={(e) => setSelectedMotion(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
            disabled={!live2dState.isLoaded}
          >
            <option value="">选择动作</option>
            {modelConfig.motions.map((motion) => (
              <option key={motion.name} value={motion.name}>
                {motion.displayName} ({motion.group})
              </option>
            ))}
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlayMotion}
            disabled={!selectedMotion || !live2dState.isLoaded}
            className="w-full flex items-center justify-center space-x-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg py-2 px-3 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            <span>播放动作</span>
          </motion.button>
        </div>
      </div>

      {/* 音量控制 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300 flex items-center space-x-2">
          <Volume2 size={18} />
          <span>音量控制</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400 w-8">0</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm text-gray-400 w-8">100</span>
          </div>
          <div className="text-center">
            <span className="text-cyan-400 font-mono">{volume}%</span>
          </div>
        </div>
      </div>

      {/* 快捷动作 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300">快捷动作</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {['挥手', '点头', '摇头', '睡觉'].map((action, index) => (
            <motion.button
              key={action}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (index < 3) {
                  live2dControls.playMotion('TapBody', index)
                } else {
                  live2dControls.playMotion('TapHead', 1)
                }
              }}
              disabled={!live2dState.isLoaded}
              className="bg-purple-500/20 text-purple-400 border border-purple-400/30 rounded-lg py-2 px-3 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {action}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 快捷表情 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-300">快捷表情</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'wenroudexiao', display: '微笑' },
            { name: 'haixiu', display: '害羞' },
            { name: 'jingxi', display: '惊喜' },
            { name: 'shengqi', display: '生气' }
          ].map((exp) => (
            <motion.button
              key={exp.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => live2dControls.playExpression(exp.name)}
              disabled={!live2dState.isLoaded}
              className="bg-pink-500/20 text-pink-400 border border-pink-400/30 rounded-lg py-2 px-3 hover:bg-pink-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {exp.display}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
