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

// 创建新提示词模板
router.post('/', async (req, res) => {
  try {
    const { name, template, category, isDefault } = req.body;

    if (!name || !template) {
      return res.status(400).json({ error: '名称和模板内容是必填项' });
    }

    const promptId = `prompt_${Date.now()}`;
    const promptData = {
      id: promptId,
      name,
      template,
      category: category || '通用',
      isDefault: isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.prompts.put(promptId, promptData);

    res.json({
      success: true,
      prompt: promptData
    });
  } catch (error) {
    console.error('创建提示词模板失败:', error);
    res.status(500).json({ error: '创建提示词模板失败' });
  }
});

// 获取所有提示词模板
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const prompts = [];
    
    await new Promise((resolve, reject) => {
      db.prompts.createReadStream()
        .on('data', (data) => {
          // 如果指定了分类，只返回该分类的模板
          if (!category || data.value.category === category) {
            prompts.push(data.value);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve();
        });
    });

    // 按创建时间排序
    prompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      prompts: prompts
    });
  } catch (error) {
    console.error('获取提示词模板列表失败:', error);
    res.status(500).json({ error: '获取提示词模板列表失败' });
  }
});

// 获取单个提示词模板
router.get('/:id', async (req, res) => {
  try {
    const promptId = req.params.id;
    
    try {
      const prompt = await db.prompts.get(promptId);
      res.json({
        success: true,
        prompt: prompt
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '提示词模板不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('获取提示词模板详情失败:', error);
    res.status(500).json({ error: '获取提示词模板详情失败' });
  }
});

// 更新提示词模板
router.put('/:id', async (req, res) => {
  try {
    const promptId = req.params.id;
    const { name, template, category, isDefault } = req.body;

    if (!name && !template && !category && isDefault === undefined) {
      return res.status(400).json({ error: '至少需要提供一个更新字段' });
    }

    // 获取现有模板
    let prompt;
    try {
      prompt = await db.prompts.get(promptId);
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '提示词模板不存在' });
      }
      throw error;
    }

    // 更新字段
    const updatedPrompt = {
      ...prompt,
      name: name || prompt.name,
      template: template || prompt.template,
      category: category || prompt.category,
      isDefault: isDefault !== undefined ? isDefault : prompt.isDefault,
      updatedAt: new Date().toISOString()
    };

    await db.prompts.put(promptId, updatedPrompt);

    res.json({
      success: true,
      prompt: updatedPrompt
    });
  } catch (error) {
    console.error('更新提示词模板失败:', error);
    res.status(500).json({ error: '更新提示词模板失败' });
  }
});

// 删除提示词模板
router.delete('/:id', async (req, res) => {
  try {
    const promptId = req.params.id;
    
    try {
      // 检查提示词是否存在
      const prompt = await db.prompts.get(promptId);
      
      // 默认模板不允许删除
      if (prompt.isDefault) {
        return res.status(403).json({ error: '默认模板不能删除' });
      }
      
      // 删除提示词
      await db.prompts.del(promptId);
      
      res.json({
        success: true,
        message: '提示词模板已成功删除'
      });
    } catch (error) {
      if (error.notFound) {
        return res.status(404).json({ error: '提示词模板不存在' });
      }
      throw error;
    }
  } catch (error) {
    console.error('删除提示词模板失败:', error);
    res.status(500).json({ error: '删除提示词模板失败' });
  }
});

// 初始化默认提示词模板
router.post('/init-defaults', async (req, res) => {
  try {
    // 预设的默认模板
    const defaultPrompts = [
      {
        id: 'prompt_default_general',
        name: '通用产品海报',
        template: '创建一个专业的营销海报，展示{productName}产品。突出以下特点：{features}。使用简洁现代的设计风格，确保产品图片清晰可见，文字易于阅读。',
        category: '通用',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prompt_default_strip',
        name: 'LED灯带海报',
        template: '为{productName} LED灯带设计一张吸引人的营销海报。强调以下特点：{features}。展示灯带的灯光效果、应用场景和安装便捷性。使用现代化的设计，突出色彩鲜艳的视觉效果。',
        category: 'LED灯带',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prompt_default_panel',
        name: 'LED面板灯海报',
        template: '为{productName} LED面板灯创建一个专业的产品海报。突出以下特点：{features}。展示面板灯的均匀照明效果、超薄设计和安装灵活性。使用简洁商务风格，适合商业和家庭环境推广。',
        category: '面板灯',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prompt_default_spotlight',
        name: 'LED射灯海报',
        template: '设计一张{productName} LED射灯的营销海报。重点展示：{features}。突出射灯的聚光效果、照射角度和多样化的应用场景。使用具有冲击力的视觉设计，强调光影效果。',
        category: '射灯',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 添加默认模板到数据库
    for (const prompt of defaultPrompts) {
      await db.prompts.put(prompt.id, prompt);
    }

    res.json({
      success: true,
      message: '默认提示词模板初始化成功',
      prompts: defaultPrompts
    });
  } catch (error) {
    console.error('初始化默认提示词模板失败:', error);
    res.status(500).json({ error: '初始化默认提示词模板失败' });
  }
});

module.exports = router; 