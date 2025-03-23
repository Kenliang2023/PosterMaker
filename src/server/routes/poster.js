const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

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

// 生成海报
router.post('/generate', async (req, res) => {
  try {
    const { imageId, productName, features, promptId } = req.body;

    if (!imageId || !productName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取图片信息
    let imageInfo;
    try {
      imageInfo = await db.images.get(imageId);
    } catch (error) {
      return res.status(404).json({ error: '图片不存在' });
    }

    // 获取提示词模板
    let promptTemplate;
    try {
      if (promptId) {
        promptTemplate = await db.prompts.get(promptId);
      } else {
        // 获取默认提示词模板
        // 这里简化处理，实际应用需要查询默认模板
        promptTemplate = { template: "创建一个展示{productName}的市场营销海报。突出以下特点：{features}" };
      }
    } catch (error) {
      return res.status(500).json({ error: '获取提示词模板失败' });
    }

    // 构建完整提示词
    const fullPrompt = promptTemplate.template
      .replace('{productName}', productName)
      .replace('{features}', features || '');

    // TODO: 调用Gemini API生成海报
    // 这里是模拟，实际项目中需要对接Gemini API
    const posterResult = {
      id: `poster_${Date.now()}`,
      imageUrl: `/uploads/posters/sample-poster.jpg`, // 模拟的海报URL
      prompt: fullPrompt,
      productName,
      features,
      sourceImageId: imageId,
      createdAt: new Date().toISOString()
    };

    // 保存海报信息
    await db.posters.put(posterResult.id, posterResult);

    // 记录使用统计
    const analyticsId = `analytics_${Date.now()}`;
    await db.analytics.put(analyticsId, {
      type: 'poster_generation',
      posterId: posterResult.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      poster: posterResult
    });
  } catch (error) {
    console.error('生成海报失败:', error);
    res.status(500).json({ error: '生成海报失败' });
  }
});

// 获取所有海报
router.get('/', async (req, res) => {
  try {
    const posters = [];
    
    // 从数据库获取所有海报
    await new Promise((resolve, reject) => {
      db.posters.createReadStream()
        .on('data', (data) => {
          posters.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 按创建时间排序，最新的在前
    posters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      posters: posters
    });
  } catch (error) {
    console.error('获取海报列表失败:', error);
    res.status(500).json({ error: '获取海报列表失败' });
  }
});

// 获取单个海报详情
router.get('/:id', async (req, res) => {
  try {
    const posterId = req.params.id;
    
    try {
      const poster = await db.posters.get(posterId);
      res.json({
        success: true,
        poster: poster
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '海报不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('获取海报详情失败:', error);
    res.status(500).json({ error: '获取海报详情失败' });
  }
});

// 删除海报
router.delete('/:id', async (req, res) => {
  try {
    const posterId = req.params.id;
    
    try {
      // 检查海报是否存在
      await db.posters.get(posterId);
      
      // 删除海报
      await db.posters.del(posterId);
      
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