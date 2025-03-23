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

// 创建或更新元提示词模板
router.post('/meta-template', isAdmin, async (req, res) => {
  try {
    const { templateId, template, description } = req.body;
    
    if (!templateId || !template) {
      return res.status(400).json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 保存元提示词模板
    const metaTemplateKey = `meta:${templateId}`;
    const metaTemplate = {
      templateId,
      template,
      description: description || '',
      createdBy: req.user.username,
      updatedAt: new Date().toISOString()
    };
    
    await db.prompts.put(metaTemplateKey, JSON.stringify(metaTemplate));
    
    res.json({
      success: true,
      metaTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存元提示词模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取元提示词模板
router.get('/meta-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    try {
      const metaTemplateKey = `meta:${templateId}`;
      const metaTemplateStr = await db.prompts.get(metaTemplateKey);
      const metaTemplate = JSON.parse(metaTemplateStr);
      
      res.json({
        success: true,
        metaTemplate
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '元提示词模板不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取元提示词模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取所有元提示词模板
router.get('/meta-templates', async (req, res) => {
  try {
    const metaTemplates = [];
    
    // 创建读取流
    const stream = db.prompts.createReadStream({
      gt: 'meta:',
      lt: 'meta:\xFF'
    });
    
    // 处理数据
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        metaTemplates.push(JSON.parse(data.value.toString()));
      });
      
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    res.json({
      success: true,
      metaTemplates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取元提示词模板列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 删除元提示词模板
router.delete('/meta-template/:templateId', isAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    try {
      const metaTemplateKey = `meta:${templateId}`;
      // 检查模板是否存在
      await db.prompts.get(metaTemplateKey);
      
      // 删除模板
      await db.prompts.del(metaTemplateKey);
      
      res.json({
        success: true,
        message: '元提示词模板已删除'
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '元提示词模板不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除元提示词模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 保存生成的提示词
router.post('/generated', async (req, res) => {
  try {
    const { username, templateId, prompt, productInfo } = req.body;
    
    if (!username || !prompt) {
      return res.status(400).json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 生成唯一提示词ID
    const promptId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // 保存生成的提示词
    const generatedPromptKey = `generated:${username}:${promptId}`;
    const generatedPrompt = {
      promptId,
      username,
      templateId: templateId || 'default',
      prompt,
      productInfo: productInfo || {},
      createdAt: new Date().toISOString()
    };
    
    await db.prompts.put(generatedPromptKey, JSON.stringify(generatedPrompt));
    
    res.json({
      success: true,
      generatedPrompt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存生成的提示词失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取生成的提示词
router.get('/generated/:username/:promptId', async (req, res) => {
  try {
    const { username, promptId } = req.params;
    
    try {
      const generatedPromptKey = `generated:${username}:${promptId}`;
      const generatedPromptStr = await db.prompts.get(generatedPromptKey);
      const generatedPrompt = JSON.parse(generatedPromptStr);
      
      res.json({
        success: true,
        generatedPrompt
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '生成的提示词不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取生成的提示词失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取用户的所有生成提示词列表
router.get('/generated/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const generatedPrompts = [];
    
    // 创建读取流
    const stream = db.prompts.createReadStream({
      gt: `generated:${username}:`,
      lt: `generated:${username}:\xFF`
    });
    
    // 处理数据
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        generatedPrompts.push(JSON.parse(data.value.toString()));
      });
      
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    res.json({
      success: true,
      generatedPrompts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取生成的提示词列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 