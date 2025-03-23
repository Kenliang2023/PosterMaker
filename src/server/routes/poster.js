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
    const { prompt, productInfo, templateId } = req.body;
    
    if (!prompt || !productInfo || !productInfo.imageUrl) {
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
    
    try {
      // 调用Gemini API生成海报
      console.log('===== 开始调用Gemini API生成海报 =====');
      
      console.time('geminiApiCall'); // 记录API调用时间
      const geminiResponse = await geminiService.generatePoster(imageUrlPath, prompt);
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
      targetAudience: productInfo.targetAudience,
      originalImageUrl: productInfo.imageUrl,
      templateId: templateId,
      prompt: prompt,
      posterUrl: posterUrl,
      createdAt: new Date().toISOString(),
      useBackup: useBackup
    };
    
    try {
      await db.posters.put(posterId, posterData);
      console.log('海报数据已保存到数据库');
    } catch (dbError) {
      console.error('保存海报数据到数据库失败:', dbError);
      // 继续执行，返回结果给用户
    }
    
    // 返回结果
    console.log('===== 返回客户端响应 =====');
    console.log('状态:', '成功');
    console.log('是否使用备用方案:', useBackup);
    console.log('海报URL:', posterUrl);
    
    res.json({
      success: true,
      message: useBackup ? '海报生成失败，使用原图作为海报' : '海报生成成功',
      posterId: posterId,
      posterUrl: posterUrl,
      useBackup: useBackup
    });
  } catch (error) {
    console.error('===== 生成海报过程中发生致命错误 =====');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    res.status(500).json({
      success: false,
      message: '生成海报过程中发生错误',
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