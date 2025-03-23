const express = require('express');
const router = express.Router();

// 导入各个路由模块
const userRoutes = require('./user');
const posterRoutes = require('./poster');
const adminRoutes = require('./admin');
const promptRoutes = require('./prompt');

// 设置API路由
router.use('/user', userRoutes);
router.use('/poster', posterRoutes);
router.use('/admin', adminRoutes);
router.use('/prompt', promptRoutes);

// API状态检查
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

module.exports = router; 