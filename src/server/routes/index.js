const express = require('express');
const router = express.Router();

// 导入路由模块
const promptRoutes = require('./prompt');
const posterRoutes = require('./poster');
const uploadRoutes = require('./upload');
const userRoutes = require('./user');
const adminRoutes = require('./admin');

// 注册路由
router.use('/prompts', promptRoutes);
router.use('/posters', posterRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// API状态检查路由
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API服务正常运行'
  });
});

module.exports = router; 