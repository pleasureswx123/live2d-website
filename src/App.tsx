import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Star, Zap } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import { create } from 'zustand'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Zustand store
const useStore = create<{ count: number; increment: () => void }>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

function App() {
  const { count, increment } = useStore()
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Live2D Website 项目
          </h1>
          <p className="text-lg text-gray-600">
            包含所有指定依赖的 React + TypeScript 项目
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Framer Motion
              </CardTitle>
              <CardDescription>动画库测试</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 bg-red-100 rounded-lg text-center"
              >
                悬停我看动画效果
              </motion.div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Zustand
              </CardTitle>
              <CardDescription>状态管理测试</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-2xl font-bold">{count}</p>
                <Button onClick={increment}>增加计数</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                UI 组件
              </CardTitle>
              <CardDescription>shadcn/ui 测试</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停提示</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>这是一个 Tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog>
                <DialogTrigger asChild>
                  <Button>打开对话框</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>测试对话框</DialogTitle>
                    <DialogDescription>
                      这是一个使用 Radix UI 和 shadcn/ui 的对话框组件。
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-lg p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-4">已安装的依赖包</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-600">动画 & 交互</h3>
              <ul className="space-y-1 text-gray-600">
                <li>✅ framer-motion</li>
                <li>✅ react-intersection-observer</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600">UI 组件</h3>
              <ul className="space-y-1 text-gray-600">
                <li>✅ lucide-react</li>
                <li>✅ @radix-ui/*</li>
                <li>✅ shadcn/ui</li>
                <li>✅ vaul</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">Live2D & 其他</h3>
              <ul className="space-y-1 text-gray-600">
                <li>✅ pixi.js@^6.5.0</li>
                <li>✅ pixi-live2d-display@^0.4.0</li>
                <li>✅ zustand</li>
                <li>✅ tailwindcss@^3.4.0</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default App
