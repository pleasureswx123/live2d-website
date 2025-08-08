#!/bin/bash

# 创建目标目录
mkdir -p public/models/youyou/textures

# 复制并重命名主要文件
cp "temp/提供的模型文件/LIVE 2D 384.moc3" "public/models/youyou/youyou.moc3"
cp "temp/提供的模型文件/LIVE 2D 384.physics3.json" "public/models/youyou/youyou.physics3.json"
cp "temp/提供的模型文件/LIVE 2D 384.cdi3.json" "public/models/youyou/youyou.cdi3.json"
cp "temp/提供的模型文件/LIVE 2D 384.vtube.json" "public/models/youyou/youyou.vtube.json"
cp "temp/提供的模型文件/items_pinned_to_model.json" "public/models/youyou/items_pinned_to_model.json"

# 复制纹理文件
cp "temp/提供的模型文件/LIVE 2D 384.4096/texture_00.png" "public/models/youyou/textures/texture_00.png"
cp "temp/提供的模型文件/LIVE 2D 384.4096/texture_01.png" "public/models/youyou/textures/texture_01.png"

# 复制并重命名表情文件（中文拼音）
cp "temp/提供的模型文件/傲娇.exp3.json" "public/models/youyou/aojiao.exp3.json"
cp "temp/提供的模型文件/叉腰.exp3.json" "public/models/youyou/chayao.exp3.json"
cp "temp/提供的模型文件/哈哈大笑.exp3.json" "public/models/youyou/hahadadxiao.exp3.json"
cp "temp/提供的模型文件/委屈.exp3.json" "public/models/youyou/weiqu.exp3.json"
cp "temp/提供的模型文件/害羞.exp3.json" "public/models/youyou/haixiu.exp3.json"
cp "temp/提供的模型文件/惊喜.exp3.json" "public/models/youyou/jingxi.exp3.json"
cp "temp/提供的模型文件/惊讶.exp3.json" "public/models/youyou/jingya.exp3.json"
cp "temp/提供的模型文件/托腮.exp3.json" "public/models/youyou/tuosai.exp3.json"
cp "temp/提供的模型文件/抱胸.exp3.json" "public/models/youyou/baoxiong.exp3.json"
cp "temp/提供的模型文件/挥手.exp3.json" "public/models/youyou/huishou.exp3.json"
cp "temp/提供的模型文件/温柔的笑.exp3.json" "public/models/youyou/wenroudexiao.exp3.json"
cp "temp/提供的模型文件/生气.exp3.json" "public/models/youyou/shengqi.exp3.json"
cp "temp/提供的模型文件/电脑.exp3.json" "public/models/youyou/diannao.exp3.json"
cp "temp/提供的模型文件/电脑发光.exp3.json" "public/models/youyou/diannaofaguang.exp3.json"
cp "temp/提供的模型文件/眯眯眼.exp3.json" "public/models/youyou/mimiyan.exp3.json"
cp "temp/提供的模型文件/眼泪.exp3.json" "public/models/youyou/yanlei.exp3.json"
cp "temp/提供的模型文件/脸红.exp3.json" "public/models/youyou/lianhong.exp3.json"
cp "temp/提供的模型文件/落泪.exp3.json" "public/models/youyou/luolei.exp3.json"
cp "temp/提供的模型文件/键盘抬起.exp3.json" "public/models/youyou/jianpantaiqi.exp3.json"
cp "temp/提供的模型文件/鬼脸.exp3.json" "public/models/youyou/guilian.exp3.json"

# 复制并重命名动作文件（中文拼音）
cp "temp/提供的模型文件/基础动画.motion3.json" "public/models/youyou/jichudonghua.motion3.json"
cp "temp/提供的模型文件/挥手.motion3.json" "public/models/youyou/huishou.motion3.json"
cp "temp/提供的模型文件/摇头.motion3.json" "public/models/youyou/yaotou.motion3.json"
cp "temp/提供的模型文件/点头.motion3.json" "public/models/youyou/diantou.motion3.json"
cp "temp/提供的模型文件/眼珠子.motion3.json" "public/models/youyou/yanzhuzi.motion3.json"
cp "temp/提供的模型文件/睡觉.motion3.json" "public/models/youyou/shuijiao.motion3.json"
cp "temp/提供的模型文件/sleep.motion3.json" "public/models/youyou/sleep.motion3.json"

echo "文件复制和重命名完成！"
