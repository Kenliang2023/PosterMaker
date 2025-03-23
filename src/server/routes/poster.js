const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
  }
});

// 上传产品图片
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传图片文件'
      });
    }

    const { username } = req.body;
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '缺少用户信息'
      });
    }

    // 生成唯一图片ID
    const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // 存储图片数据
    const imageKey = `image:${username}:${imageId}`;
    await db.images.put(imageKey, req.file.buffer);

    // 存储图片元数据
    const metadataKey = `metadata:${username}:${imageId}`;
    const metadata = {
      username,
      imageId,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    
    await db.images.put(metadataKey, JSON.stringify(metadata));

    res.json({
      success: true,
      image: {
        imageId,
        ...metadata
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '上传图片失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取图片
router.get('/image/:username/:imageId', async (req, res) => {
  try {
    const { username, imageId } = req.params;
    
    // 获取图片元数据
    try {
      const metadataKey = `metadata:${username}:${imageId}`;
      const metadataStr = await db.images.get(metadataKey);
      const metadata = JSON.parse(metadataStr);
      
      // 获取图片数据
      const imageKey = `image:${username}:${imageId}`;
      const imageBuffer = await db.images.get(imageKey);
      
      // 设置响应头
      res.set('Content-Type', metadata.mimetype);
      res.set('Content-Length', imageBuffer.length);
      
      // 发送图片数据
      res.send(imageBuffer);
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '图片不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取图片失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取用户的所有图片列表
router.get('/images/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const images = [];
    
    // 创建读取流
    const stream = db.images.createReadStream({
      gt: `metadata:${username}:`,
      lt: `metadata:${username}:\xFF`
    });
    
    // 处理数据
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        if (data.key.startsWith(`metadata:${username}:`)) {
          images.push(JSON.parse(data.value.toString()));
        }
      });
      
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    res.json({
      success: true,
      images
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取图片列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 存储生成的海报
router.post('/save-poster', upload.single('poster'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传海报图片'
      });
    }

    const { username, sourceImageId, promptId } = req.body;
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '缺少用户信息'
      });
    }

    // 生成唯一海报ID
    const posterId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // 存储海报图片数据
    const posterKey = `poster:${username}:${posterId}`;
    await db.posters.put(posterKey, req.file.buffer);

    // 存储海报元数据
    const metadataKey = `metadata:${username}:${posterId}`;
    const metadata = {
      username,
      posterId,
      sourceImageId,
      promptId,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      createdAt: new Date().toISOString()
    };
    
    await db.posters.put(metadataKey, JSON.stringify(metadata));

    res.json({
      success: true,
      poster: {
        posterId,
        ...metadata
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存海报失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取海报
router.get('/poster/:username/:posterId', async (req, res) => {
  try {
    const { username, posterId } = req.params;
    
    // 获取海报元数据
    try {
      const metadataKey = `metadata:${username}:${posterId}`;
      const metadataStr = await db.posters.get(metadataKey);
      const metadata = JSON.parse(metadataStr);
      
      // 获取海报数据
      const posterKey = `poster:${username}:${posterId}`;
      const posterBuffer = await db.posters.get(posterKey);
      
      // 设置响应头
      res.set('Content-Type', metadata.mimetype);
      res.set('Content-Length', posterBuffer.length);
      
      // 发送海报数据
      res.send(posterBuffer);
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
    res.status(500).json({
      success: false,
      message: '获取海报失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取用户的所有海报列表
router.get('/posters/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const posters = [];
    
    // 创建读取流
    const stream = db.posters.createReadStream({
      gt: `metadata:${username}:`,
      lt: `metadata:${username}:\xFF`
    });
    
    // 处理数据
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        if (data.key.startsWith(`metadata:${username}:`)) {
          posters.push(JSON.parse(data.value.toString()));
        }
      });
      
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    res.json({
      success: true,
      posters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取海报列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 