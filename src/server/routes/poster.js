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
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    // 提取请求参数
    const { sessionId, proposalId, productInfo, prompt, templateId } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : (productInfo ? productInfo.imageUrl : null);
    let posterUrl = '';
    let finalPrompt = '';
    let useBackup = false;
    
    console.log(`===== 开始生成海报 =====`);
    console.log('会话ID:', sessionId);
    console.log('方案ID:', proposalId);
    console.log('图片路径:', imageUrl);
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '未提供图片'
      });
    }
    
    // 规范化图片路径
    let imageUrlPath = imageUrl;
    if (imageUrlPath.startsWith('/uploads')) {
      imageUrlPath = path.join(__dirname, '../../..', imageUrlPath);
    }
    
    if (!fs.existsSync(imageUrlPath)) {
      return res.status(404).json({
        success: false,
        message: '图片文件不存在'
      });
    }
    
    // 生成海报文件名
    const posterFileName = `poster_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const posterPath = path.join(__dirname, '../../../public/uploads/posters', posterFileName);
    
    // 如果有会话ID和方案ID，则使用保存的方案生成海报
    if (sessionId && proposalId) {
      console.log('===== 使用保存的方案生成海报 =====');
      try {
        // 从数据库获取方案
        const sessionData = await db.prompts.get(`session:${sessionId}`);
        
        if (sessionData && sessionData.proposals) {
          // 查找指定的方案
          const selectedProposal = sessionData.proposals.find(p => p.proposalId === proposalId);
          
          if (selectedProposal) {
            console.log('找到选定的方案:', selectedProposal.styleName);
            
            // 直接使用方案中的最终提示词
            finalPrompt = selectedProposal.finalPrompt;
            
            // 如果没有最终提示词，则尝试生成一个(兼容旧版本数据)
            if (!finalPrompt) {
              console.log('方案中无最终提示词，尝试生成...');
              finalPrompt = await geminiService.generateFinalPromptFromProposal(selectedProposal, productInfo);
            }
            
            console.log('使用最终提示词:', finalPrompt);
          } else {
            throw new Error(`未找到ID为${proposalId}的方案`);
          }
        } else {
          throw new Error(`未找到会话${sessionId}的数据`);
        }
      } catch (dbError) {
        console.error('获取方案失败:', dbError);
        
        // 如果是找不到数据的错误，尝试使用备用方案
        if (dbError.notFound) {
          console.log('使用备用方案处理...');
          useBackup = true;
          
          // 创建一个备用方案
          const backupProposal = {
            proposalId: 'backup',
            position: '中心',
            background: '简约专业的商业环境',
            featurePosition: '底部水平排列',
            layout: '产品居中，文字清晰可见',
            backgroundDesc: '现代简约风格',
            lightingRequirements: '突出产品照明效果',
            textRequirements: '清晰易读的现代字体',
            colorTone: '专业商业色调',
            posterSize: productInfo.posterSize || '16:9',
            overallStyle: '现代专业风格',
            integrationElements: {
              lightIntegration: '产品光线均匀照亮环境',
              installationContext: '标准安装位置',
              visualHarmony: '色彩协调统一'
            },
            displayedText: {
              headline: productInfo.name,
              features: Array.isArray(productInfo.features) ? 
                productInfo.features.slice(0, 3) : 
                productInfo.features.split('\n').slice(0, 3),
              tagline: `${productInfo.targetAudience || "专业"}照明选择`
            },
            finalPrompt: `一张"${productInfo.name}"商业海报。

保留图片原样，作为海报的主体。

主标题写着"${productInfo.name}"。

产品特点文字位于底部，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。

标语文字写着"${productInfo.targetAudience || "专业"}照明选择"。

整体布局简约，突出产品特性。

光影要求：突出产品的照明效果。

文字要求：简洁明了，突出产品特点。

色调要求：专业商业色调。

海报尺寸：${productInfo.posterSize || "16:9"}。

海报整体风格：现代专业。

左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`
          };
          
          finalPrompt = backupProposal.finalPrompt;
          console.log('使用备用提示词:', finalPrompt);
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
    
    // 保存海报信息到数据库
    const posterData = {
      id: posterFileName,
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
    
    await db.posters.put(posterFileName, posterData);
    
    res.json({
      success: true,
      posterId: posterFileName,
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
router.delete('/delete/:posterId', async (req, res) => {
  try {
    const { posterId } = req.params;
    
    if (!posterId) {
      return res.status(400).json({
        success: false,
        message: '缺少海报ID'
      });
    }
    
    // 获取海报数据，以便删除文件
    let poster;
    try {
      poster = await db.posters.get(posterId);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: '未找到海报'
      });
    }
    
    // 从数据库中删除海报
    await db.posters.del(posterId);
    
    // 如果有海报文件，也删除文件
    try {
      // 检查是否有图片URL
      if (poster.imageUrl) {
        // 转换为文件系统路径
        const posterUrl = poster.imageUrl.replace(/^\//, ''); // 移除开头的斜杠
        const fullPath = path.join(__dirname, '../../../public', posterUrl);
        
        // 检查文件是否存在
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`已删除海报文件: ${fullPath}`);
        } else {
          // 尝试不同的路径格式
          const altPath = path.join(__dirname, '../../../', posterUrl);
          if (fs.existsSync(altPath)) {
            fs.unlinkSync(altPath);
            console.log(`已删除海报文件(替代路径): ${altPath}`);
          } else {
            console.warn(`警告: 找不到要删除的海报文件: ${fullPath}`);
          }
        }
      } else {
        console.warn(`警告: 海报记录 ${posterId} 没有关联的图片URL`);
      }
    } catch (err) {
      console.error('删除海报文件失败:', err);
      // 继续执行，即使文件删除失败
    }
    
    res.json({
      success: true,
      message: '海报已成功删除'
    });
  } catch (error) {
    console.error('删除海报错误:', error);
    res.status(500).json({
      success: false,
      message: '删除海报失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 