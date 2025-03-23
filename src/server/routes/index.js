const express = require('express');
const router = express.Router();

// 导入所有路由模块
const posterRoutes = require('./poster');
const promptRoutes = require('./prompt');
const userRoutes = require('./user');
const adminRoutes = require('./admin');

// 注册路由
router.use('/posters', posterRoutes);
router.use('/prompts', promptRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// API状态检查
router.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'API服务正常运行' });
});

module.exports = router; 