const express = require('express');
const router = express.Router();
const db = require('../db');

// 简单的管理员验证中间件
const isAdmin = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(401).json({ error: '未提供用户信息' });
    }

    try {
      const userData = await db.users.get(`user_${username}`);
      if (userData.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
      }
      
      req.admin = userData;
      next();
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('验证管理员权限失败:', error);
    res.status(500).json({ error: '验证管理员权限失败' });
  }
};

// 检查管理员认证状态
router.get('/check-auth', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(401).json({ 
        success: false,
        isAdmin: false,
        message: '未提供用户信息' 
      });
    }

    try {
      const userData = await db.users.get(`user_${username}`);
      
      res.json({
        success: true,
        isAdmin: userData.role === 'admin',
        username: userData.username
      });
    } catch (error) {
      if (error.notFound) {
        return res.json({ 
          success: false,
          isAdmin: false,
          message: '用户不存在' 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    res.json({ 
      success: false,
      isAdmin: false,
      message: '检查管理员权限失败' 
    });
  }
});

// 获取系统统计数据
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // 统计用户数量
    let userCount = 0;
    await new Promise((resolve, reject) => {
      db.users.createReadStream()
        .on('data', () => {
          userCount++;
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 统计海报数量
    let posterCount = 0;
    await new Promise((resolve, reject) => {
      db.posters.createReadStream()
        .on('data', () => {
          posterCount++;
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 统计图片数量
    let imageCount = 0;
    await new Promise((resolve, reject) => {
      db.images.createReadStream()
        .on('data', () => {
          imageCount++;
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 获取所有分析数据
    const analyticsData = [];
    await new Promise((resolve, reject) => {
      db.analytics.createReadStream()
        .on('data', (data) => {
          analyticsData.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 计算过去7天每天的生成数量
    const now = new Date();
    const last7Days = Array(7).fill(0).map((_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const dailyActivity = {};
    last7Days.forEach(day => {
      dailyActivity[day] = 0;
    });

    analyticsData.forEach(record => {
      const day = record.timestamp.split('T')[0];
      if (dailyActivity[day] !== undefined) {
        dailyActivity[day]++;
      }
    });

    res.json({
      success: true,
      stats: {
        userCount,
        posterCount,
        imageCount,
        dailyActivity
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取所有用户列表
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = [];
    
    await new Promise((resolve, reject) => {
      db.users.createReadStream()
        .on('data', (data) => {
          // 不返回密码
          const { password, ...userWithoutPassword } = data.value;
          users.push(userWithoutPassword);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 排序，管理员优先，然后按创建时间降序
    users.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 设置用户角色
router.put('/users/:username/role', isAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的角色值' });
    }

    try {
      const userData = await db.users.get(`user_${username}`);
      
      // 更新角色
      userData.role = role;
      userData.updatedAt = new Date().toISOString();

      await db.users.put(`user_${username}`, userData);

      // 不返回密码
      const { password, ...userWithoutPassword } = userData;

      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('设置用户角色失败:', error);
    res.status(500).json({ error: '设置用户角色失败' });
  }
});

// 获取所有海报
router.get('/posters', isAdmin, async (req, res) => {
  try {
    const posters = [];
    
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

    // 按创建时间降序排序
    posters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      posters
    });
  } catch (error) {
    console.error('获取所有海报失败:', error);
    res.status(500).json({ error: '获取所有海报失败' });
  }
});

// 系统备份
router.get('/backup', isAdmin, async (req, res) => {
  try {
    const backup = {
      users: [],
      prompts: [],
      posters: [],
      images: [],
      analytics: [],
      timestamp: new Date().toISOString()
    };

    // 读取用户数据
    await new Promise((resolve, reject) => {
      db.users.createReadStream()
        .on('data', (data) => {
          backup.users.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 读取提示词数据
    await new Promise((resolve, reject) => {
      db.prompts.createReadStream()
        .on('data', (data) => {
          backup.prompts.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 读取海报数据
    await new Promise((resolve, reject) => {
      db.posters.createReadStream()
        .on('data', (data) => {
          backup.posters.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 读取图片元数据
    await new Promise((resolve, reject) => {
      db.images.createReadStream()
        .on('data', (data) => {
          backup.images.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 读取分析数据
    await new Promise((resolve, reject) => {
      db.analytics.createReadStream()
        .on('data', (data) => {
          backup.analytics.push(data.value);
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 移除敏感信息
    backup.users.forEach(user => {
      delete user.password;
    });

    res.json({
      success: true,
      backup
    });
  } catch (error) {
    console.error('系统备份失败:', error);
    res.status(500).json({ error: '系统备份失败' });
  }
});

module.exports = router; 