import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LoginPageProps {
  onLoginSuccess: () => void
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'connecting' | 'online' | 'complete'>('connecting')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟加载进度
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStatus('online')
          setTimeout(() => {
            setStatus('complete')
            setIsLoading(false)
          }, 1000)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  const handleEnter = () => {
    onLoginSuccess()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* 背景网格 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" 
             style={{
               backgroundImage: `
                 linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
               `,
               backgroundSize: '50px 50px'
             }}
        />
      </div>

      {/* 四角装饰 */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyan-400 opacity-60" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyan-400 opacity-60" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyan-400 opacity-60" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyan-400 opacity-60" />

      {/* 主要内容 */}
      <div className="text-center z-10 max-w-md w-full px-8">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
            LIVE2D
          </h1>
          <div className="w-8 h-1 bg-cyan-400 mx-auto mb-6" />
          <p className="text-cyan-300 text-lg tracking-wide">
            连接平行世界
          </p>
        </motion.div>

        {/* 加载进度 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="mb-4">
              <div className="text-cyan-400 text-sm mb-2 tracking-wide">
                LOADING PROGRESS
              </div>
              <div className="text-cyan-300 text-2xl font-mono">
                {Math.round(progress).toString().padStart(3, '0')}%
              </div>
            </div>

            {/* 进度条 */}
            <div className="relative w-full h-2 bg-gray-800 border border-cyan-400/30">
              <motion.div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
              {/* 进度条刻度 */}
              <div className="absolute inset-0 flex">
                {[25, 50, 75].map(mark => (
                  <div
                    key={mark}
                    className="absolute top-0 w-px h-full bg-cyan-400/50"
                    style={{ left: `${mark}%` }}
                  />
                ))}
              </div>
            </div>

            {/* 进度数字标记 */}
            <div className="flex justify-between text-xs text-cyan-400/70 mt-1">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </motion.div>
        )}

        {/* 连接状态 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                status === 'online' ? 'bg-green-400' : 'bg-cyan-400'
              }`} />
              <span className="text-cyan-300 text-sm tracking-wide">
                {status === 'connecting' ? 'CONNECTING' :
                 status === 'online' ? 'ONLINE' : 'SECURE'}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <div>SYSTEM STATUS</div>
            <div>CONNECTION</div>
          </div>
        </motion.div>

        {/* 进入按钮 */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleEnter}
              className="group relative px-8 py-3 border border-cyan-400 text-cyan-400 bg-transparent hover:bg-cyan-400/10 transition-all duration-300 tracking-wider"
            >
              <span className="relative z-10">ENTER SYSTEM</span>
              <div className="absolute inset-0 border border-cyan-400 transform group-hover:scale-105 transition-transform duration-300" />
            </button>
          </motion.div>
        )}

        {/* 底部信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center"
        >
          <div className="text-xs text-gray-500 space-y-1">
            <div>LIVE2D SYSTEM</div>
            <div>www.live2d.com</div>
          </div>
        </motion.div>
      </div>

      {/* 扫描线效果 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ y: '-100%' }}
        animate={{ y: '100vh' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      </motion.div>
    </div>
  )
}

export default LoginPage
