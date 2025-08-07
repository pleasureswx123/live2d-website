# Live2D Website

一个基于 React + TypeScript + Live2D 的数字人对话网站项目。

## 功能特性

### 🎭 Live2D 模型渲染
- 支持 Cubism 3.x 和 4.x 格式
- 自动模型配置生成
- 表情和动作控制
- 实时模型交互

### 💬 智能对话系统
- 文本对话功能
- 语音输入支持（浏览器语音识别）
- 聊天历史记录
- 实时打字效果

### 🎨 现代化UI设计
- 黑色系科技风格
- 流畅的动画效果
- 响应式设计
- 移动端适配

### 📱 页面结构
1. **登录页面** - 科技风格的加载界面
2. **对话页面** - 100%全屏Live2D模型渲染 + 对话功能
3. **历史记录页面** - 查看和管理聊天历史

## 技术栈

- **前端框架**: React 19 + TypeScript
- **动画库**: Framer Motion
- **UI组件**: Radix UI + shadcn/ui
- **样式**: Tailwind CSS
- **Live2D**: pixi.js + pixi-live2d-display
- **状态管理**: Zustand
- **构建工具**: Vite
- **包管理**: pnpm

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

## Live2D 模型配置

### 模型文件结构
```
public/models/
└── youyou/                    # 模型文件夹
    ├── youyou.model3.json     # 模型配置文件
    ├── youyou.moc3            # 模型数据
    ├── youyou.physics3.json   # 物理配置
    ├── youyou.cdi3.json       # 显示信息
    ├── textures/              # 贴图文件夹
    │   ├── texture_00.png
    │   └── texture_01.png
    ├── *.exp3.json            # 表情文件
    └── *.motion3.json         # 动作文件
```

### 添加新模型
1. 将模型文件放入 `public/models/` 目录
2. 更新 `src/config/modelsConfig.ts` 配置文件
3. 或使用自动配置生成工具

## 主要功能说明

### 登录页面
- 科技风格的加载动画
- 进度条显示
- 连接状态指示
- 扫描线特效

### 对话页面
- 100%全屏Live2D模型渲染
- 底部浮动对话框
- 右上角控制面板（抽屉式）
- 语音输入支持
- 实时聊天显示

### 控制面板功能
- 模型状态显示
- 表情控制
- 动作播放
- 音量调节
- 快捷操作

### 历史记录页面
- 聊天记录列表
- 搜索和过滤功能
- 详细聊天内容查看
- 记录删除和清空

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### 语音功能要求
- 支持 Web Speech API
- 需要 HTTPS 环境（生产环境）

## 注意事项

1. **模型文件**: 确保Live2D模型文件格式正确且完整
2. **浏览器权限**: 语音功能需要麦克风权限
3. **HTTPS**: 生产环境需要HTTPS才能使用语音功能
4. **性能**: Live2D渲染对设备性能有一定要求

## 许可证

MIT License
