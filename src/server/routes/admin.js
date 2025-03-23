const express = require('express');
const router = express.Router();
const db = require('../db');

// 简单的管理员认证中间件
const isAdmin = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(401).json({
        success: false,
        message: '未提供用户信息'
      });
    }
    
    try {
      const userKey = `user:${username}`;
      const userData = await db.users.get(userKey);
      const user = JSON.parse(userData);
      
      if (user.role === 'admin') {
        // 将用户信息添加到请求对象中
        req.user = user;
        next();
      } else {
        res.status(403).json({
          success: false,
          message: '权限不足'
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
      message: '认证失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取所有用户列表
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = [];
    
    // 创建读取流
    const stream = db.users.createReadStream({
      gt: 'user:',
      lt: 'user:\xFF'
    });
    
    // 处理数据
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        const user = JSON.parse(data.value.toString());
        // 移除密码字段
        const { password, ...userWithoutPassword } = user;
        users.push(userWithoutPassword);
      });
      
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取生成统计信息
router.get('/statistics', isAdmin, async (req, res) => {
  try {
    // 获取图片总数
    let imageCount = 0;
    let posterCount = 0;
    let userCount = 0;
    
    // 统计用户数量
    const userStream = db.users.createReadStream({
      gt: 'user:',
      lt: 'user:\xFF'
    });
    
    await new Promise((resolve, reject) => {
      userStream.on('data', () => {
        userCount++;
      });
      userStream.on('error', reject);
      userStream.on('end', resolve);
    });
    
    // 统计图片数量
    const imageStream = db.images.createReadStream({
      gt: 'image:',
      lt: 'image:\xFF'
    });
    
    await new Promise((resolve, reject) => {
      imageStream.on('data', () => {
        imageCount++;
      });
      imageStream.on('error', reject);
      imageStream.on('end', resolve);
    });
    
    // 统计海报数量
    const posterStream = db.posters.createReadStream({
      gt: 'poster:',
      lt: 'poster:\xFF'
    });
    
    await new Promise((resolve, reject) => {
      posterStream.on('data', () => {
        posterCount++;
      });
      posterStream.on('error', reject);
      posterStream.on('end', resolve);
    });
    
    res.json({
      success: true,
      statistics: {
        userCount,
        imageCount,
        posterCount,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 设置用户角色
router.post('/set-user-role', isAdmin, async (req, res) => {
  try {
    const { targetUsername, role } = req.body;
    
    if (!targetUsername || !role) {
      return res.status(400).json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 检查角色是否有效
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色'
      });
    }
    
    try {
      const userKey = `user:${targetUsername}`;
      const userData = await db.users.get(userKey);
      const user = JSON.parse(userData);
      
      // 更新角色
      user.role = role;
      
      // 保存更新后的用户信息
      await db.users.put(userKey, JSON.stringify(user));
      
      // 返回更新后的用户信息（不包含密码）
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
      message: '设置用户角色失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 