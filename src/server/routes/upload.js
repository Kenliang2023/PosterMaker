const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。只允许JPG和PNG图片。'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// 图片上传路由
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    console.log('收到图片上传请求:', req.file ? '有文件' : '无文件');
    
    if (!req.file) {
      console.log('未接收到文件或上传失败');
      return res.status(400).json({
        success: false,
        message: '没有选择文件或文件上传失败'
      });
    }

    console.log('接收到的文件信息:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // 获取文件信息
    const fileName = req.file.filename;
    const fileUrl = `/uploads/images/${fileName}`;
    
    // 保存到数据库
    const imageId = `image_${uuidv4()}`;
    const imageData = {
      id: imageId,
      fileName: fileName,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl,
      uploadedAt: new Date().toISOString()
    };
    
    await db.images.put(imageId, imageData);
    
    // 确保文件可以访问
    console.log('保存的图片URL:', fileUrl);
    console.log('响应成功');
    
    res.json({
      success: true,
      message: '图片上传成功',
      imageId: imageId,
      imageUrl: fileUrl
    });
  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({
      success: false,
      message: '图片上传过程中发生错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 