const express = require('express');
const router = express.Router();
const db = require('../db');

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 简单的认证实现（后续可以增强安全性）
    // 检查用户是否存在
    try {
      const userKey = `user:${username}`;
      const userData = await db.users.get(userKey);
      const user = JSON.parse(userData);
      
      // 验证密码（简单比较，生产环境应使用加密）
      if (user.password === password) {
        // 返回用户信息（不包含密码）
        const { password, ...userWithoutPassword } = user;
        res.json({
          success: true,
          user: userWithoutPassword
        });
      } else {
        res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
    } catch (error) {
      if (error.notFound) {
        res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    // 检查用户是否已存在
    try {
      await db.users.get(`user:${username}`);
      // 如果没有抛出notFound错误，说明用户已存在
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    } catch (error) {
      // 用户不存在，可以创建
      if (error.notFound) {
        const newUser = {
          username,
          password, // 生产环境应加密存储
          name,
          role: 'user', // 默认角色
          created: new Date().toISOString()
        };
        
        await db.users.put(`user:${username}`, JSON.stringify(newUser));
        
        // 返回用户信息（不包含密码）
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json({
          success: true,
          user: userWithoutPassword
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取用户信息
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    try {
      const userData = await db.users.get(`user:${username}`);
      const user = JSON.parse(userData);
      
      // 返回用户信息（不包含密码）
      const { password, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 