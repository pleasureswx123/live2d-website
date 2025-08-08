# Live2D 功能使用说明

## 已实现的功能

### 1. Live2D 核心渲染功能
- ✅ 基于 Pixi v6 + pixi-live2d-display@0.4.0 的高性能渲染
- ✅ DPR（devicePixelRatio）正确处理：autoDensity + resolution 限幅
- ✅ ResizeObserver + requestAnimationFrame 合并更新，避免 resize 卡顿
- ✅ 纯命令式更新，避免 React 反复重渲染
- ✅ 窗口变化自适应，支持高分屏和低分屏

### 2. 模型文件管理
- ✅ 新的 youyou 模型文件已重命名为中文拼音
- ✅ 完整的 .model3.json 文件，包含所有表情和动作定义
- ✅ 移除了 modelsConfig.ts，采用更简洁的直接路径方式

### 3. 口型同步功能
- ✅ Web Audio + ParamMouthOpenY 实现
- ✅ 极低延迟的音频能量映射
- ✅ 压缩（阈值 + 增益）+ 平滑（Attack/Release）
- ✅ 支持音频元素和媒体流输入

### 4. 对话气泡功能
- ✅ DOM 叠加在 Live2D 之上的气泡 UI
- ✅ 自动锚点定位到模型头部附近
- ✅ Framer Motion 动画效果
- ✅ 逐字打字效果
- ✅ 响应式设计，适配移动端

### 5. 自动表情与动作系统
- ✅ 说话/停顿/心情联动
- ✅ 根据情绪自动切换表情
- ✅ 说话时自动播放手势动作
- ✅ 停止说话时回到 Idle 状态
- ✅ 支持手动覆盖表情和动作

## 使用方法

### 基本使用
```tsx
import Live2DStage from '@/components/Live2DStage'
import ChatOverlay from '@/components/ChatOverlay'

function App() {
  const [anchor, setAnchor] = useState<{x: number, y: number} | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Live2DStage
        modelUrl="/models/youyou/youyou.model3.json"
        onAnchor={(pt) => setAnchor(pt)}
      />
      <ChatOverlay anchor={anchor} />
    </div>
  )
}
```

### 访问模型实例
```tsx
// 在 Live2DStage 的 onReady 回调中
const handleModelReady = (model: Live2DModel, app: PIXI.Application) => {
  // 获取动画导演
  const director = (model as any).__director
  
  // 获取口型同步
  const lipSync = (model as any).__lipSync
  
  // 播放表情
  director.setExpression('wenroudexiao') // 温柔的笑
  
  // 开始说话（自动播放手势动作）
  director.speakStart({ mood: 'happy' })
  
  // 停止说话
  director.speakStop()
}
```

### 音频口型同步
```tsx
// 音频元素口型同步
const audio = new Audio('/audio/demo.mp3')
const lipSync = (model as any).__lipSync
lipSync.fromMediaElement(audio)
audio.play()

// 麦克风口型同步
navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
  lipSync.fromStream(stream)
})
```

### 表情和动作控制
```tsx
const director = (model as any).__director

// 设置心情（自动选择合适的表情）
director.setMood('happy')    // 快乐 -> wenroudexiao, hahadadxiao
director.setMood('sad')      // 悲伤 -> weiqu, luolei
director.setMood('angry')    // 生气 -> shengqi
director.setMood('surprised') // 惊讶 -> jingya, jingxi

// 手动播放表情
director.setExpression('aojiao')     // 傲娇
director.setExpression('haixiu')     // 害羞
director.setExpression('tuosai')     // 托腮

// 手动播放动作
director.playMotion('TapBody', { index: 0 })  // 挥手
director.playMotion('TapHead', { index: 0 })  // 眼珠子动作
director.playMotion('Idle', { index: 0 })     // 基础动画
```

## 可用的表情列表
- aojiao (傲娇)
- chayao (叉腰)
- hahadadxiao (哈哈大笑)
- weiqu (委屈)
- haixiu (害羞)
- jingxi (惊喜)
- jingya (惊讶)
- tuosai (托腮)
- baoxiong (抱胸)
- huishou (挥手表情)
- wenroudexiao (温柔的笑)
- shengqi (生气)
- diannao (电脑)
- diannaofaguang (电脑发光)
- mimiyan (眯眯眼)
- yanlei (眼泪)
- lianhong (脸红)
- luolei (落泪)
- jianpantaiqi (键盘抬起)
- guilian (鬼脸)

## 可用的动作列表
### Idle 组
- sleep (睡眠)
- jichudonghua (基础动画)

### TapBody 组
- huishou (挥手)
- diantou (点头)
- yaotou (摇头)

### TapHead 组
- yanzhuzi (眼珠子)
- shuijiao (睡觉)

## 性能优化特性
- DPR 限制到 2 以平衡清晰度与性能
- ResizeObserver + rAF 合并窗口变化更新
- 纯命令式更新，避免 React 重渲染
- 低频锚点更新（10Hz），避免频繁 setState
- GPU 加速渲染，DOM 气泡与 Pixi 解耦

## 注意事项
1. 确保 Live2D Cubism Core 已正确加载（index.html 中的脚本）
2. 音频口型同步需要用户手势触发（浏览器安全限制）
3. 不同模型的动作组和表情名称可能不同，需要相应调整
4. 移动端可能需要额外的触摸事件处理
