const express = require('express');
const router = express.Router();
const db = require('../db');

// 创建/注册用户
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, company } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码是必填项' });
    }

    // 检查用户名是否已存在
    try {
      const existingUser = await db.users.get(`user_${username}`);
      if (existingUser) {
        return res.status(409).json({ error: '用户名已存在' });
      }
    } catch (error) {
      if (!error.notFound) {
        throw error;
      }
      // 如果是notFound错误，表示用户不存在，可以继续注册
    }

    const userId = `user_${username}`;
    const userData = {
      id: userId,
      username,
      password, // 注意：实际应用中应该对密码进行哈希处理
      name: name || username,
      company: company || '',
      role: 'user', // 默认为普通用户
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.users.put(userId, userData);

    // 不返回密码字段
    const { password: _, ...userDataWithoutPassword } = userData;

    res.json({
      success: true,
      user: userDataWithoutPassword
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ error: '用户注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: '用户名和密码不能为空' 
      });
    }

    try {
      const userData = await db.users.get(`user_${username}`);
      
      if (userData.password === password) {
        // 登录成功，返回用户信息（不包含密码）
        const { password: _, ...userDataWithoutPassword } = userData;
        
        res.json({
          success: true,
          message: '登录成功',
          user: userDataWithoutPassword
        });
      } else {
        res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
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
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

// 获取用户信息
router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    try {
      const userData = await db.users.get(`user_${username}`);
      
      // 不返回密码字段
      const { password, ...userDataWithoutPassword } = userData;

      res.json({
        success: true,
        user: userDataWithoutPassword
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const { password, name, company } = req.body;

    if (!password && !name && !company) {
      return res.status(400).json({ error: '至少需要提供一个更新字段' });
    }

    try {
      const userData = await db.users.get(`user_${username}`);
      
      // 更新字段
      if (password) userData.password = password; // 实际应用中应该对密码进行哈希
      if (name) userData.name = name;
      if (company) userData.company = company;
      
      userData.updatedAt = new Date().toISOString();

      await db.users.put(`user_${username}`, userData);

      // 不返回密码字段
      const { password: _, ...userDataWithoutPassword } = userData;

      res.json({
        success: true,
        user: userDataWithoutPassword
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 删除用户
router.delete('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    try {
      // 检查用户是否存在
      await db.users.get(`user_${username}`);
      
      // 删除用户
      await db.users.del(`user_${username}`);
      
      res.json({
        success: true,
        message: '用户已成功删除'
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 获取用户历史记录
router.get('/:username/history', async (req, res) => {
  try {
    const username = req.params.username;
    const { type } = req.query; // 可选，按类型筛选 (poster, prompt)
    
    // 确保用户存在
    try {
      await db.users.get(`user_${username}`);
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '用户不存在' });
      }
      throw error;
    }
    
    // 获取用户的所有海报
    const posters = [];
    if (!type || type === 'poster') {
      await new Promise((resolve, reject) => {
        db.posters.createReadStream()
          .on('data', (data) => {
            if (data.value && data.value.username === username) {
              posters.push(data.value);
            }
          })
          .on('error', (err) => {
            reject(err);
          })
          .on('end', () => {
            resolve();
          });
      });
    }
    
    // 按时间排序
    posters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      history: {
        posters
      }
    });
  } catch (error) {
    console.error('获取用户历史记录失败:', error);
    res.status(500).json({ error: '获取用户历史记录失败' });
  }
});

// 初始化管理员账户
router.get('/init-admin', async (req, res) => {
  try {
    const adminUsername = 'admin';
    const adminPassword = 'admin123'; // 实际应用中应使用更强的密码并哈希
    
    // 检查是否已存在管理员账户
    try {
      const existingAdmin = await db.users.get(`user_${adminUsername}`);
      return res.json({
        success: true,
        message: '管理员账户已存在',
        admin: {
          username: existingAdmin.username,
          name: existingAdmin.name,
          role: existingAdmin.role
        }
      });
    } catch (error) {
      if (!error.notFound) {
        throw error;
      }
      
      // 创建管理员账户
      const adminData = {
        id: `user_${adminUsername}`,
        username: adminUsername,
        password: adminPassword,
        name: '系统管理员',
        company: '系统',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.users.put(`user_${adminUsername}`, adminData);
      
      res.json({
        success: true,
        message: '管理员账户初始化成功',
        admin: {
          username: adminData.username,
          name: adminData.name,
          role: adminData.role
        }
      });
    }
  } catch (error) {
    console.error('初始化管理员账户失败:', error);
    res.status(500).json({ error: '初始化管理员账户失败' });
  }
});

module.exports = router; 