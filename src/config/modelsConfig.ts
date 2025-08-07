/**
 * Live2D 模型配置文件
 * 基于 public/models 目录中的模型文件生成
 */

export interface ModelExpression {
  name: string;
  file: string;
  displayName: string;
}

export interface ModelMotion {
  name: string;
  file: string;
  group: string;
  displayName: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  path: string;
  previewImage?: string;
  expressions: ModelExpression[];
  motions: ModelMotion[];
  idleMotions: ModelMotion[];
  tapBodyMotions: ModelMotion[];
  tapHeadMotions: ModelMotion[];
  physics?: string;
  pose?: string;
  displayInfo?: string;
  textures: string[];
  moc: string;
  version: number;
}

export interface ModelsConfig {
  models: ModelConfig[];
  defaultModel: string;
}

// 基于 youyou.model3.json 生成的配置
export const modelsConfig: ModelsConfig = {
  models: [
    {
      id: 'youyou',
      name: 'youyou',
      displayName: '悠悠',
      path: '/models/youyou/youyou.model3.json',
      version: 3,
      moc: 'youyou.moc3',
      textures: [
        'textures/texture_00.png',
        'textures/texture_01.png'
      ],
      physics: 'youyou.physics3.json',
      displayInfo: 'youyou.cdi3.json',
      expressions: [
        { name: 'aojiao', file: 'aojiao.exp3.json', displayName: '傲娇' },
        { name: 'baoxiong', file: 'baoxiong.exp3.json', displayName: '抱胸' },
        { name: 'chayao', file: 'chayao.exp3.json', displayName: '叉腰' },
        { name: 'diannao', file: 'diannao.exp3.json', displayName: '点脑' },
        { name: 'diannaofaguang', file: 'diannaofaguang.exp3.json', displayName: '点脑发光' },
        { name: 'guilian', file: 'guilian.exp3.json', displayName: '鬼脸' },
        { name: 'hahadadxiao', file: 'hahadadxiao.exp3.json', displayName: '哈哈大笑' },
        { name: 'haixiu', file: 'haixiu.exp3.json', displayName: '害羞' },
        { name: 'huishou_exp', file: 'huishou.exp3.json', displayName: '挥手表情' },
        { name: 'jianpantaiqi', file: 'jianpantaiqi.exp3.json', displayName: '键盘太气' },
        { name: 'jingxi', file: 'jingxi.exp3.json', displayName: '惊喜' },
        { name: 'jingya', file: 'jingya.exp3.json', displayName: '惊讶' },
        { name: 'lianhong', file: 'lianhong.exp3.json', displayName: '脸红' },
        { name: 'luolei', file: 'luolei.exp3.json', displayName: '落泪' },
        { name: 'mimiyan', file: 'mimiyan.exp3.json', displayName: '眯眯眼' },
        { name: 'shengqi', file: 'shengqi.exp3.json', displayName: '生气' },
        { name: 'tuosai', file: 'tuosai.exp3.json', displayName: '托腮' },
        { name: 'weiqu', file: 'weiqu.exp3.json', displayName: '委屈' },
        { name: 'wenroudexiao', file: 'wenroudexiao.exp3.json', displayName: '温柔的笑' },
        { name: 'yanlei', file: 'yanlei.exp3.json', displayName: '眼泪' }
      ],
      motions: [
        // Idle 动作
        { name: 'jichudonghua', file: 'jichudonghua.motion3.json', group: 'Idle', displayName: '基础动画' },
        { name: 'sleep', file: 'sleep.motion3.json', group: 'Idle', displayName: '睡眠' },
        
        // TapBody 动作
        { name: 'huishou', file: 'huishou.motion3.json', group: 'TapBody', displayName: '挥手' },
        { name: 'diantou', file: 'diantou.motion3.json', group: 'TapBody', displayName: '点头' },
        { name: 'yaotou', file: 'yaotou.motion3.json', group: 'TapBody', displayName: '摇头' },
        
        // TapHead 动作
        { name: 'yanzhuzi', file: 'yanzhuzi.motion3.json', group: 'TapHead', displayName: '眼珠子' },
        { name: 'shuijiao', file: 'shuijiao.motion3.json', group: 'TapHead', displayName: '睡觉' }
      ],
      idleMotions: [
        { name: 'jichudonghua', file: 'jichudonghua.motion3.json', group: 'Idle', displayName: '基础动画' },
        { name: 'sleep', file: 'sleep.motion3.json', group: 'Idle', displayName: '睡眠' }
      ],
      tapBodyMotions: [
        { name: 'huishou', file: 'huishou.motion3.json', group: 'TapBody', displayName: '挥手' },
        { name: 'diantou', file: 'diantou.motion3.json', group: 'TapBody', displayName: '点头' },
        { name: 'yaotou', file: 'yaotou.motion3.json', group: 'TapBody', displayName: '摇头' }
      ],
      tapHeadMotions: [
        { name: 'yanzhuzi', file: 'yanzhuzi.motion3.json', group: 'TapHead', displayName: '眼珠子' },
        { name: 'shuijiao', file: 'shuijiao.motion3.json', group: 'TapHead', displayName: '睡觉' }
      ]
    }
  ],
  defaultModel: 'youyou'
};

/**
 * 根据ID获取模型配置
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return modelsConfig.models.find(model => model.id === modelId);
}

/**
 * 获取默认模型配置
 */
export function getDefaultModelConfig(): ModelConfig | undefined {
  return getModelConfig(modelsConfig.defaultModel);
}

/**
 * 获取所有模型列表
 */
export function getAllModels(): ModelConfig[] {
  return modelsConfig.models;
}

/**
 * 根据组名获取动作列表
 */
export function getMotionsByGroup(modelId: string, group: string): ModelMotion[] {
  const model = getModelConfig(modelId);
  if (!model) return [];
  
  return model.motions.filter(motion => motion.group === group);
}

/**
 * 获取模型的所有表情
 */
export function getExpressions(modelId: string): ModelExpression[] {
  const model = getModelConfig(modelId);
  return model?.expressions || [];
}

/**
 * 获取模型的空闲动作
 */
export function getIdleMotions(modelId: string): ModelMotion[] {
  const model = getModelConfig(modelId);
  return model?.idleMotions || [];
}

/**
 * 获取模型的点击身体动作
 */
export function getTapBodyMotions(modelId: string): ModelMotion[] {
  const model = getModelConfig(modelId);
  return model?.tapBodyMotions || [];
}

/**
 * 获取模型的点击头部动作
 */
export function getTapHeadMotions(modelId: string): ModelMotion[] {
  const model = getModelConfig(modelId);
  return model?.tapHeadMotions || [];
}
