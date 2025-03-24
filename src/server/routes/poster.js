const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const geminiService = require('../services/geminiService');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制10MB
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 上传产品图片
router.post('/upload-image', upload.single('product_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 保存图片信息到数据库
    const imageInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    const imageId = `image_${Date.now()}`;
    await db.images.put(imageId, imageInfo);

    // 返回与前端预期格式一致的响应
    res.json({
      success: true,
      imageId: imageId,
      filename: req.file.filename,
      url: `/uploads/images/${req.file.filename}`
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ error: '上传图片失败' });
  }
});

// 确保海报目录存在
const posterDir = path.join(__dirname, '../../../uploads/posters');
if (!fs.existsSync(posterDir)) {
  fs.mkdirSync(posterDir, { recursive: true });
}

// 生成海报
router.post('/generate', async (req, res) => {
  try {
    console.log('===== 收到生成海报请求 =====');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    const { prompt, productInfo, templateId, proposalId, sessionId } = req.body;
    
    if (!productInfo || !productInfo.imageUrl) {
      console.log('缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 获取上传的图片数据
    console.log('产品图片URL:', productInfo.imageUrl);
    const imageUrlPath = path.join(__dirname, '../../..', productInfo.imageUrl);
    console.log('完整的图片路径:', imageUrlPath);
    
    // 检查源文件是否存在
    if (!fs.existsSync(imageUrlPath)) {
      console.log('源图片文件不存在');
      return res.status(404).json({
        success: false,
        message: '找不到上传的图片'
      });
    }
    
    // 生成唯一ID
    const posterId = `poster_${uuidv4()}`;
    const posterFileName = `${posterId}.png`;
    const posterPath = path.join(posterDir, posterFileName);
    let useBackup = false;
    let posterUrl = `/uploads/posters/${posterFileName}`;
    let finalPrompt = prompt;
    
    try {
      // 如果提供了方案ID和会话ID，则优先使用方案生成提示词
      if (proposalId && sessionId) {
        console.log('===== 基于选择的方案生成提示词 =====');
        console.log(`sessionId: ${sessionId}, proposalId: ${proposalId}`);
        
        try {
          // 首先尝试使用新格式查找最终提示词（prompt_timestamp）
          // 这是prompt.js中保存的格式
          const promptStorageKey = `prompt_${Date.now()}`; // 这是一个示例，我们会尝试多种键名
          console.log(`尝试查找已保存的提示词，键名可能为: ${promptStorageKey} 或其他时间戳格式`);
          
          // 从proposals:sessionId获取方案数据
          const proposalsStorageKey = `proposals:${sessionId}`;
          console.log(`尝试从数据库获取方案数据，键名: ${proposalsStorageKey}`);
          
          let proposalsData;
          try {
            proposalsData = await db.prompts.get(proposalsStorageKey);
            console.log(`成功获取方案数据，方案数量: ${proposalsData.proposals.length}`);
            
            // 查找选定的方案
            const selectedProposal = proposalsData.proposals.find(p => p.proposalId === proposalId);
            
            if (selectedProposal) {
              console.log('找到选定的方案:', selectedProposal.styleName);
              
              // 使用方案和产品信息生成最终提示词
              finalPrompt = await geminiService.generateFinalPromptFromProposal(selectedProposal, productInfo);
              console.log('基于方案生成的提示词:', finalPrompt);
              
              // 保存生成的提示词供后续使用
              const newPromptId = `prompt_${sessionId}_${proposalId}`;
              try {
                await db.prompts.put(newPromptId, {
                  id: newPromptId,
                  sessionId,
                  proposalId,
                  productInfo,
                  finalPrompt,
                  selectedProposal,
                  createdAt: new Date().toISOString()
                });
                console.log(`提示词已保存到数据库，键名: ${newPromptId}`);
              } catch (saveError) {
                console.error('保存提示词到数据库失败:', saveError);
                // 继续使用生成的提示词，但不阻止流程
              }
            } else {
              console.log(`在会话 ${sessionId} 中未找到方案ID ${proposalId}`);
              throw new Error(`找不到选定的方案 (proposalId: ${proposalId})`);
            }
          } catch (dbError) {
            console.error('从数据库获取方案失败:', dbError);
            
            // 如果是"找不到数据"错误，尝试使用原始提示词或创建备用方案
            if (dbError.notFound || dbError.code === 'LEVEL_NOT_FOUND') {
              console.log('数据库中找不到方案数据，尝试备用方案');
              
              if (prompt) {
                console.log('使用请求中提供的原始提示词');
                finalPrompt = prompt;
              } else {
                console.log('根据产品信息创建备用方案');
                
                // 创建一个基本方案结构用于生成提示词
                const backupProposal = {
                  proposalId: proposalId || 'backup',
                  styleName: "默认方案",
                  styleDescription: "基于产品信息创建的备用方案",
                  position: "画面中央",
                  background: productInfo.sceneDescription || "简洁专业的背景",
                  featurePosition: "画面底部",
                  layout: "产品居中，背景环绕，文字简洁",
                  backgroundDesc: "专业商业环境",
                  lightingRequirements: "从产品投射柔和光线",
                  textRequirements: "中等大小，清晰易读",
                  colorTone: "专业商业色调",
                  posterSize: productInfo.posterSize || "16:9",
                  overallStyle: "现代专业",
                  integrationElements: {
                    lightIntegration: "LED产品的光线与环境和谐融合",
                    installationContext: "产品安装在最佳位置，展示其功能",
                    visualHarmony: "产品与背景在视觉上保持协调统一"
                  },
                  displayedText: {
                    headline: productInfo.name,
                    features: Array.isArray(productInfo.features) ? 
                      productInfo.features.slice(0, 3) : 
                      productInfo.features.split('\n').slice(0, 3),
                    tagline: `${productInfo.targetAudience || "专业"}照明选择`
                  }
                };
                
                // 使用备用方案生成提示词
                finalPrompt = await geminiService.generateFinalPromptFromProposal(backupProposal, productInfo);
                console.log('使用备用方案生成的提示词:', finalPrompt);
              }
            } else {
              // 如果是其他错误，重新抛出
              throw dbError;
            }
          }
        } catch (error) {
          console.error('获取/生成方案提示词失败:', error);
          
          // 确保提示词不为undefined，提供默认提示词
          if (!finalPrompt) {
            console.log('提供默认提示词，因为原始提示词缺失');
            finalPrompt = `一张"${productInfo.name}"商业海报。

保留图片原样，作为海报的主体。

主标题写着"${productInfo.name}"。

产品特点文字位于海报底部，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。

标语文字写着"专业照明解决方案"。

整体布局简约，突出产品特性。

光影要求：突出产品的照明效果。

文字要求：简洁明了，突出产品特点。

色调要求：专业商业色调。

海报尺寸：${productInfo.posterSize || "16:9"}。

海报整体风格：现代专业。

左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
          }
        }
      } 
      // 如果没有方案信息但有提示词和模板ID，则使用原来的方式
      else if (prompt && templateId) {
        console.log('===== 使用传统方式生成海报 =====');
        // 使用Gemini文本模型优化提示词
        console.log('===== 第一阶段: 使用Gemini文本模型优化提示词 =====');
        try {
          console.time('optimizePrompt');
          finalPrompt = await geminiService.optimizePromptWithGemini(prompt, productInfo);
          console.timeEnd('optimizePrompt');
          console.log('优化后的提示词:', finalPrompt);
        } catch (optimizeError) {
          console.error('提示词优化失败，将使用原始提示词:', optimizeError);
          console.log('继续使用原始提示词:', prompt);
          finalPrompt = prompt;
        }
      } else {
        console.log('缺少提示词或方案信息');
        
        // 提供默认提示词
        console.log('使用默认提示词');
        finalPrompt = `一张"${productInfo.name}"商业海报。

保留图片原样，作为海报的主体。

主标题写着"${productInfo.name}"。

产品特点文字位于海报底部，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。

标语文字写着"专业照明解决方案"。

整体布局简约，突出产品特性。

光影要求：突出产品的照明效果。

文字要求：简洁明了，突出产品特点。

色调要求：专业商业色调。

海报尺寸：${productInfo.posterSize || "16:9"}。

海报整体风格：现代专业。

左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
      }
      
      // 确保最终提示词不为undefined
      if (!finalPrompt) {
        console.error('最终提示词为undefined，使用默认提示词');
        finalPrompt = `一张"${productInfo.name}"商业海报。保留图片原样，作为海报的主体。左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
      }
      
      // 步骤2: 调用Gemini API生成海报
      console.log('===== 第二阶段: 使用优化后的提示词调用Gemini API生成海报 =====');
      console.log('最终使用的提示词:', finalPrompt);
      
      console.time('geminiApiCall'); // 记录API调用时间
      const geminiResponse = await geminiService.generatePoster(imageUrlPath, finalPrompt);
      console.timeEnd('geminiApiCall'); // 输出API调用耗时
      
      console.log('===== Gemini API调用完成 =====');
      console.log('响应状态:', '成功');
      console.log('响应大小:', JSON.stringify(geminiResponse).length, '字节');
      
      // 从响应中提取图片数据
      console.log('开始从响应中提取图片数据...');
      const imageData = geminiService.extractImageFromResponse(geminiResponse);
      
      if (!imageData) {
        console.error('无法从Gemini响应中提取图片数据');
        throw new Error('无法从AI服务获取图像数据');
      }
      
      console.log('成功提取图片数据，类型:', imageData.substring(0, 30) + '...');
      
      // 保存生成的图片
      if (imageData.startsWith('data:image')) {
        // 保存base64图片数据
        console.log('处理base64图片数据...');
        posterUrl = await geminiService.savePosterImage(imageData, posterFileName);
        console.log('图片保存路径:', posterUrl);
      } else if (imageData.startsWith('http')) {
        // 下载并保存远程图片
        console.log(`下载远程图片: ${imageData.substring(0, 50)}...`);
        try {
          console.time('downloadImage'); // 记录下载时间
          const response = await axios.get(imageData, { 
            responseType: 'arraybuffer',
            timeout: 10000
          });
          console.timeEnd('downloadImage'); // 输出下载耗时
          
          console.log('远程图片下载成功，大小:', response.data.length, '字节');
          const buffer = Buffer.from(response.data, 'binary');
          await fs.promises.writeFile(posterPath, buffer);
          console.log('远程图片保存成功');
        } catch (downloadError) {
          console.error(`下载远程图片失败: ${downloadError.message}`);
          throw new Error(`下载远程图片失败: ${downloadError.message}`);
        }
      } else {
        throw new Error(`不支持的图片数据格式: ${imageData.substring(0, 30)}...`);
      }
      
      console.log('成功生成海报并保存到:', posterUrl);
    } catch (error) {
      useBackup = true;
      console.error('===== AI生成海报失败 =====');
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
      console.error('使用备用方案:', '复制原图');
      
      // 如果AI生成失败，使用备用方案（复制原图）作为海报
      try {
        fs.copyFileSync(imageUrlPath, posterPath);
        console.log('使用备用方案：复制原图到海报目录，路径:', posterPath);
        
        // 确认文件复制是否成功
        if (fs.existsSync(posterPath)) {
          const stats = fs.statSync(posterPath);
          console.log(`备用海报文件大小: ${stats.size} bytes`);
        } else {
          console.error('备用海报文件复制后不存在');
        }
      } catch (copyError) {
        console.error('复制原图作为备用方案失败:', copyError);
        return res.status(500).json({
          success: false,
          message: '生成海报和备用方案都失败',
          error: copyError.message
        });
      }
    }
    
    // 保存海报信息到数据库
    const posterData = {
      id: posterId,
      productName: productInfo.name,
      features: productInfo.features,
      templateId: templateId,
      proposalId: proposalId, // 添加方案ID
      sessionId: sessionId, // 添加会话ID
      originalPrompt: prompt,
      finalPrompt: finalPrompt, // 保存最终使用的提示词
      imageUrl: posterUrl,
      useBackup: useBackup,
      createdAt: new Date().toISOString()
    };
    
    await db.posters.put(posterId, posterData);
    
    res.json({
      success: true,
      posterId: posterId,
      posterUrl: posterUrl,
      useBackup: useBackup,
      finalPrompt: finalPrompt // 返回最终使用的提示词
    });
  } catch (error) {
    console.error('生成海报过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '生成海报失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取所有海报列表
router.get('/', async (req, res) => {
  try {
    const posters = [];
    
    // 使用迭代器读取所有海报数据
    for await (const [key, value] of db.posters.iterator()) {
      posters.push(value);
    }
    
    // 按创建时间排序
    posters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      posters
    });
  } catch (error) {
    console.error('获取海报列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取海报列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取特定海报
router.get('/:posterId', async (req, res) => {
  try {
    const { posterId } = req.params;
    
    try {
      const poster = await db.posters.get(posterId);
      
      res.json({
        success: true,
        poster
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '海报不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('获取海报详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取海报详情失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 删除海报
router.delete('/:id', async (req, res) => {
  try {
    const posterId = req.params.id;
    
    try {
      // 检查海报是否存在
      const poster = await db.posters.get(posterId);
      
      // 删除海报
      await db.posters.del(posterId);

      // 尝试删除对应的海报图片文件
      if (poster.imageUrl) {
        const filePath = path.join(__dirname, '../../../', poster.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.json({
        success: true,
        message: '海报已成功删除'
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '海报不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('删除海报失败:', error);
    res.status(500).json({ error: '删除海报失败' });
  }
});

module.exports = router; 