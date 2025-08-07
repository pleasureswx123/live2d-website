/**
 * Live2D 模型配置生成工具
 * 自动扫描 public/models 目录，生成模型配置文件
 * 支持 Cubism 3.x 和 4.x 格式
 */

export interface ModelExpression {
  name: string;
  file: string;
  displayName?: string;
}

export interface ModelMotion {
  name: string;
  file: string;
  group?: string;
  displayName?: string;
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

/**
 * 从 model3.json 文件解析模型配置
 */
export async function parseModelConfig(modelPath: string): Promise<ModelConfig | null> {
  try {
    const response = await fetch(modelPath);
    if (!response.ok) {
      console.warn(`无法加载模型文件: ${modelPath}`);
      return null;
    }

    const modelData = await response.json();
    const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
    const modelId = modelDir.substring(modelDir.lastIndexOf('/') + 1);

    // 解析表情
    const expressions: ModelExpression[] = [];
    if (modelData.FileReferences?.Expressions) {
      for (const exp of modelData.FileReferences.Expressions) {
        expressions.push({
          name: exp.Name,
          file: exp.File,
          displayName: getDisplayName(exp.Name)
        });
      }
    }

    // 解析动作
    const motions: ModelMotion[] = [];
    const idleMotions: ModelMotion[] = [];
    const tapBodyMotions: ModelMotion[] = [];
    const tapHeadMotions: ModelMotion[] = [];

    if (modelData.FileReferences?.Motions) {
      const motionGroups = modelData.FileReferences.Motions;

      // 处理 Idle 动作
      if (motionGroups.Idle) {
        for (const motion of motionGroups.Idle) {
          const motionConfig = {
            name: motion.File.replace('.motion3.json', ''),
            file: motion.File,
            group: 'Idle',
            displayName: getDisplayName(motion.File.replace('.motion3.json', ''))
          };
          idleMotions.push(motionConfig);
          motions.push(motionConfig);
        }
      }

      // 处理 TapBody 动作
      if (motionGroups.TapBody) {
        for (const motion of motionGroups.TapBody) {
          const motionConfig = {
            name: motion.File.replace('.motion3.json', ''),
            file: motion.File,
            group: 'TapBody',
            displayName: getDisplayName(motion.File.replace('.motion3.json', ''))
          };
          tapBodyMotions.push(motionConfig);
          motions.push(motionConfig);
        }
      }

      // 处理 TapHead 动作
      if (motionGroups.TapHead) {
        for (const motion of motionGroups.TapHead) {
          const motionConfig = {
            name: motion.File.replace('.motion3.json', ''),
            file: motion.File,
            group: 'TapHead',
            displayName: getDisplayName(motion.File.replace('.motion3.json', ''))
          };
          tapHeadMotions.push(motionConfig);
          motions.push(motionConfig);
        }
      }
    }

    const config: ModelConfig = {
      id: modelId,
      name: modelId,
      displayName: getDisplayName(modelId),
      path: modelPath,
      expressions,
      motions,
      idleMotions,
      tapBodyMotions,
      tapHeadMotions,
      physics: modelData.FileReferences?.Physics,
      pose: modelData.FileReferences?.Pose,
      displayInfo: modelData.FileReferences?.DisplayInfo,
      textures: modelData.FileReferences?.Textures || [],
      moc: modelData.FileReferences?.Moc || '',
      version: modelData.Version || 3
    };

    return config;
  } catch (error) {
    console.error(`解析模型配置失败: ${modelPath}`, error);
    return null;
  }
}

/**
 * 扫描所有模型并生成配置
 */
export async function generateModelsConfig(): Promise<ModelsConfig> {
  const models: ModelConfig[] = [];
  
  try {
    // 扫描 public/models 目录
    const modelsResponse = await fetch('/models/');
    if (!modelsResponse.ok) {
      console.warn('无法访问 /models/ 目录');
      return { models: [], defaultModel: '' };
    }

    // 这里我们需要手动指定已知的模型，因为浏览器无法直接列出目录
    const knownModels = ['youyou']; // 可以根据实际情况扩展

    for (const modelName of knownModels) {
      const modelPath = `/models/${modelName}/${modelName}.model3.json`;
      const config = await parseModelConfig(modelPath);
      if (config) {
        models.push(config);
      }
    }

    return {
      models,
      defaultModel: models.length > 0 ? models[0].id : ''
    };
  } catch (error) {
    console.error('生成模型配置失败:', error);
    return { models: [], defaultModel: '' };
  }
}

/**
 * 将中文名称转换为更友好的显示名称
 */
function getDisplayName(name: string): string {
  const displayNames: Record<string, string> = {
    // 表情映射
    'aojiao': '傲娇',
    'baoxiong': '抱胸',
    'chayao': '叉腰',
    'diannao': '点脑',
    'diannaofaguang': '点脑发光',
    'guilian': '鬼脸',
    'hahadadxiao': '哈哈大笑',
    'haixiu': '害羞',
    'huishou': '挥手',
    'jianpantaiqi': '键盘太气',
    'jingxi': '惊喜',
    'jingya': '惊讶',
    'lianhong': '脸红',
    'luolei': '落泪',
    'mimiyan': '眯眯眼',
    'shengqi': '生气',
    'tuosai': '托腮',
    'weiqu': '委屈',
    'wenroudexiao': '温柔的笑',
    'yanlei': '眼泪',
    
    // 动作映射
    'diantou': '点头',
    'huishou': '挥手',
    'jichudonghua': '基础动画',
    'shuijiao': '睡觉',
    'sleep': '睡眠',
    'yanzhuzi': '眼珠子',
    'yaotou': '摇头',
    
    // 模型名称映射
    'youyou': '悠悠'
  };

  return displayNames[name] || name;
}

/**
 * 保存配置到本地存储
 */
export function saveModelsConfig(config: ModelsConfig): void {
  try {
    localStorage.setItem('live2d_models_config', JSON.stringify(config));
    console.log('模型配置已保存到本地存储');
  } catch (error) {
    console.error('保存模型配置失败:', error);
  }
}

/**
 * 从本地存储加载配置
 */
export function loadModelsConfig(): ModelsConfig | null {
  try {
    const configStr = localStorage.getItem('live2d_models_config');
    if (configStr) {
      return JSON.parse(configStr);
    }
  } catch (error) {
    console.error('加载模型配置失败:', error);
  }
  return null;
}

/**
 * 获取模型配置（优先从本地存储加载，否则重新生成）
 */
export async function getModelsConfig(): Promise<ModelsConfig> {
  // 先尝试从本地存储加载
  const cachedConfig = loadModelsConfig();
  if (cachedConfig && cachedConfig.models.length > 0) {
    console.log('从本地存储加载模型配置');
    return cachedConfig;
  }

  // 重新生成配置
  console.log('重新生成模型配置');
  const config = await generateModelsConfig();
  
  // 保存到本地存储
  if (config.models.length > 0) {
    saveModelsConfig(config);
  }

  return config;
}

/**
 * 刷新模型配置（强制重新扫描）
 */
export async function refreshModelsConfig(): Promise<ModelsConfig> {
  console.log('强制刷新模型配置');
  const config = await generateModelsConfig();
  
  if (config.models.length > 0) {
    saveModelsConfig(config);
  }

  return config;
}
