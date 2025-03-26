const express = require('express');
const router = express.Router();
const db = require('../db');
const geminiService = require('../services/geminiService');
const { v4: uuidv4 } = require('uuid');

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
      const userKey = `user_${username}`;
      const userData = await db.users.get(userKey);
      
      if (userData.role === 'admin') {
        // 将用户信息添加到请求对象中
        req.user = userData;
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
    
    const metaTemplateKey = `meta:${templateId}`;
    let isNewTemplate = true;
    
    // 检查是否已存在同名模板
    try {
      const existingTemplate = await db.prompts.get(metaTemplateKey);
      isNewTemplate = false;
      
      // 如果是更新现有模板，创建版本记录
      const versionId = Date.now().toString();
      await db.prompts.put(`meta-version:${templateId}:${versionId}`, {
        ...existingTemplate,
        versionId
      });
    } catch (error) {
      if (!error.notFound) {
        throw error;
      }
      // 如果不存在，就是新模板
    }
    
    // 保存元提示词模板
    const metaTemplate = {
      templateId,
      template,
      description: description || '',
      createdBy: req.user.username,
      updatedAt: new Date().toISOString()
    };
    
    if (isNewTemplate) {
      metaTemplate.createdAt = metaTemplate.updatedAt;
    }
    
    await db.prompts.put(metaTemplateKey, metaTemplate);
    
    res.json({
      success: true,
      metaTemplate,
      isNew: isNewTemplate
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
      const metaTemplate = await db.prompts.get(metaTemplateKey);
      
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
router.get('/meta-templates', isAdmin, async (req, res) => {
  try {
    const metaTemplates = [];
    
    // 使用迭代器查询所有元提示词模板
    for await (const [key, value] of db.prompts.iterator({
      gte: 'meta:',
      lt: 'meta:\xFF'
    })) {
      metaTemplates.push(value);
    }
    
    // 按更新时间降序排序
    metaTemplates.sort((a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
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
      // 首先确认元提示词模板存在
      const metaTemplateKey = `meta:${templateId}`;
      await db.prompts.get(metaTemplateKey);
      
      // 删除元提示词模板
      await db.prompts.del(metaTemplateKey);
      
      // 删除相关版本记录
      const versionPrefix = `meta-version:${templateId}:`;
      for await (const [key] of db.prompts.iterator({
        gte: versionPrefix,
        lt: versionPrefix + '\xFF'
      })) {
        await db.prompts.del(key);
      }
      
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

// 获取元提示词模板的版本历史
router.get('/meta-template-versions/:templateId', isAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    const versions = [];
    
    // 获取当前版本
    try {
      const metaTemplateKey = `meta:${templateId}`;
      const currentTemplate = await db.prompts.get(metaTemplateKey);
      
      // 添加到版本列表，当前版本会显示在最前面
      currentTemplate.versionId = 'current';
      versions.push(currentTemplate);
      
      // 获取历史版本
      const versionPrefix = `meta-version:${templateId}:`;
      for await (const [key, value] of db.prompts.iterator({
        gte: versionPrefix,
        lt: versionPrefix + '\xFF'
      })) {
        versions.push(value);
      }
      
      // 按更新时间降序排序
      versions.sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      
      res.json({
        success: true,
        versions
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
      message: '获取元提示词版本历史失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 恢复元提示词模板版本
router.post('/restore-meta-template-version', isAdmin, async (req, res) => {
  try {
    const { templateId, versionId } = req.body;
    
    if (!templateId || !versionId) {
      return res.status(400).json({
        success: false,
        message: '参数不完整，需要提供模板ID和版本ID'
      });
    }
    
    try {
      let versionToRestore;
      
      // 获取要恢复的版本
      if (versionId === 'current') {
        // 当前版本，不需要恢复
        return res.json({
          success: true,
          message: '当前已是最新版本，无需恢复'
        });
      } else {
        const versionKey = `meta-version:${templateId}:${versionId}`;
        versionToRestore = await db.prompts.get(versionKey);
      }
      
      // 获取当前版本
      const metaTemplateKey = `meta:${templateId}`;
      const currentTemplate = await db.prompts.get(metaTemplateKey);
      
      // 创建新的版本记录，保存当前版本到历史
      const newVersionId = Date.now().toString();
      await db.prompts.put(`meta-version:${templateId}:${newVersionId}`, {
        ...currentTemplate,
        versionId: newVersionId
      });
      
      // 更新当前版本为要恢复的版本
      const updatedTemplate = {
        ...versionToRestore,
        updatedAt: new Date().toISOString(),
        createdBy: req.user.username,
        description: `从版本 ${versionId} 恢复 - ${versionToRestore.description}`
      };
      delete updatedTemplate.versionId; // 移除版本ID
      
      await db.prompts.put(metaTemplateKey, updatedTemplate);
      
      res.json({
        success: true,
        message: '元提示词模板版本已恢复',
        template: updatedTemplate
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '元提示词模板或版本不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '恢复元提示词模板版本失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取已生成的提示词列表
router.get('/generated-list', isAdmin, async (req, res) => {
  try {
    const prompts = [];
    const { username } = req.query;
    
    // 使用迭代器查询生成的提示词
    for await (const [key, value] of db.prompts.iterator({
      gte: 'generated:',
      lt: 'generated:\xFF'
    })) {
      // 如果指定了用户名，则只返回该用户的记录
      if (username && !key.includes(`generated:${username}:`)) {
        continue;
      }
      
      prompts.push(value);
    }
    
    // 按创建时间降序排序
    prompts.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取生成的提示词列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 创建LED产品海报提示词模板
router.post('/product-template', async (req, res) => {
  try {
    const { 
      templateId, 
      productType, 
      applicationScene, 
      styleType, 
      position, 
      foreground, 
      background, 
      featurePosition, 
      layout, 
      backgroundDesc, 
      lightingRequirements,
      textRequirements,
      colorTone,
      posterSize,
      overallStyle,
      description
    } = req.body;
    
    if (!templateId || !productType || !foreground || !background) {
      return res.status(400).json({
        success: false,
        message: '参数不完整，必须提供模板ID、产品类型、前景和背景描述'
      });
    }
    
    // 保存海报提示词模板
    const templateKey = `product-template:${templateId}`;
    const template = {
      templateId,
      productType,
      applicationScene: applicationScene || '通用',
      styleType: styleType || '现代',
      position: position || '中央',
      foreground,
      background,
      featurePosition: featurePosition || '底部',
      layout: layout || '',
      backgroundDesc: backgroundDesc || '',
      lightingRequirements: lightingRequirements || '',
      textRequirements: textRequirements || '',
      colorTone: colorTone || '',
      posterSize: posterSize || '1:1',
      overallStyle: overallStyle || '',
      description: description || '',
      score: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.prompts.put(templateKey, template);
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存海报提示词模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取所有LED产品海报提示词模板
router.get('/product-templates', async (req, res) => {
  try {
    const { productType, applicationScene, styleType } = req.query;
    const templates = [];
    
    // 使用迭代器查询所有模板
    for await (const [key, value] of db.prompts.iterator({
      gte: 'product-template:',
      lt: 'product-template:\xFF'
    })) {
      let match = true;
      
      // 根据查询参数筛选
      if (productType && value.productType !== productType) {
        match = false;
      }
      
      if (applicationScene && value.applicationScene !== applicationScene) {
        match = false;
      }
      
      if (styleType && value.styleType !== styleType) {
        match = false;
      }
      
      if (match) {
        templates.push(value);
      }
    }
    
    // 按评分和使用次数排序
    templates.sort((a, b) => {
      // 首先按评分排序
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 然后按使用次数排序
      return b.usageCount - a.usageCount;
    });
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取海报提示词模板列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取单个LED产品海报提示词模板
router.get('/product-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    try {
      const templateKey = `product-template:${templateId}`;
      const template = await db.prompts.get(templateKey);
      
      res.json({
        success: true,
        template
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '海报提示词模板不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取海报提示词模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 更新LED产品海报提示词模板的评分
router.post('/product-template/:templateId/rate', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { score } = req.body;
    
    if (score === undefined || score < 1 || score > 10) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-10之间'
      });
    }
    
    try {
      const templateKey = `product-template:${templateId}`;
      const template = await db.prompts.get(templateKey);
      
      // 更新评分 (简单平均)
      const currentTotal = template.score * template.usageCount;
      template.usageCount += 1;
      template.score = (currentTotal + score) / template.usageCount;
      template.updatedAt = new Date().toISOString();
      
      await db.prompts.put(templateKey, template);
      
      res.json({
        success: true,
        template
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '海报提示词模板不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新海报提示词模板评分失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 生成最终提示词（组装为元提示词要求的格式）
router.post('/generate-final-prompt', async (req, res) => {
  try {
    const { templateId, productName, features } = req.body;
    
    if (!templateId || !productName) {
      return res.status(400).json({
        success: false,
        message: '参数不完整，必须提供模板ID和产品名称'
      });
    }
    
    // 获取模板
    try {
      const templateKey = `product-template:${templateId}`;
      const template = await db.prompts.get(templateKey);
      
      // 组装最终提示词
      const finalPrompt = `一张${productName}商业海报。

产品位于海报${template.position}，前景描述：${template.foreground}，和海报背景无缝组成完整海报。

海报的背景是：${template.background}。

产品特点文字位于${template.featurePosition}，写着"${features || '产品特点文字'}"。

整体布局：${template.layout || '产品居中，背景环绕，文字简洁'}。

背景描述：${template.backgroundDesc || '材质+光线+质感'}。

光影要求：${template.lightingRequirements || '从产品投射柔和光线'}。

文字要求：${template.textRequirements || '中等大小，清晰易读'}。

色调要求：${template.colorTone || '根据产品特点选择和谐色调'}。

海报尺寸：${template.posterSize}。

海报整体风格：${template.overallStyle || template.styleType}。

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
      
      // 英文版提示词（这里简单处理，实际可能需要翻译API）
      const finalPromptEn = `A ${productName} commercial poster.

The product is positioned at the ${template.position} of the poster, foreground description: ${template.foreground}, seamlessly composing a complete poster with the background.

The poster background is: ${template.background}.

Product feature text is located at the ${template.featurePosition}, reading "${features || 'Product Features'}".

Overall layout: ${template.layout || 'Product centered, background surrounding, text concise'}.

Background description: ${template.backgroundDesc || 'Material+Light+Texture'}.

Lighting requirements: ${template.lightingRequirements || 'Soft light projecting from the product'}.

Text requirements: ${template.textRequirements || 'Medium size, clear and readable'}.

Color tone requirements: ${template.colorTone || 'Harmonious colors based on product characteristics'}.

Poster size: ${template.posterSize}.

Overall poster style: ${template.overallStyle || template.styleType}.

Upper left brand LOGO reads: "RS-LED", lower right company website reads "www.rs-led.com", lower left is a very small company QR code.`;
      
      // 更新使用次数
      template.usageCount += 1;
      template.updatedAt = new Date().toISOString();
      await db.prompts.put(templateKey, template);
      
      res.json({
        success: true,
        finalPrompt,
        finalPromptEn,
        template
      });
    } catch (error) {
      if (error.notFound) {
        res.status(404).json({
          success: false,
          message: '海报提示词模板不存在'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成最终提示词失败',
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
    
    await db.prompts.put(generatedPromptKey, generatedPrompt);
    
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
      const generatedPrompt = await db.prompts.get(generatedPromptKey);
      
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
    
    // 使用迭代器替代流
    for await (const [key, value] of db.prompts.iterator({
      gte: `generated:${username}:`,
      lt: `generated:${username}:\xFF`
    })) {
      generatedPrompts.push(value);
    }
    
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
    
    // 使用迭代器代替流
    for await (const [key, value] of db.prompts.iterator()) {
      // 如果指定了分类，只返回该分类的模板
      if (!category || value.category === category) {
        prompts.push(value);
      }
    }

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

// 初始化默认海报提示词模板
router.post('/init-product-templates', async (req, res) => {
  try {
    // 预设的默认模板
    const defaultTemplates = [
      {
        templateId: 'led-strip-tech-001',
        productType: 'LED灯带',
        applicationScene: '商业空间',
        styleType: '科技未来',
        position: '中心向四周扩散',
        foreground: '金黄与银白相间的LED灯带呈现多重同心圆形态，灯带发出的光线形成3D全息投影效果，中心灯带形状变化为公司标志，光带随圆形动态旋转',
        background: '未来科技实验室场景，半透明的数据流在空中流动，背景墙面显示复杂的光照设计图，营造高科技研发环境的故事',
        featurePosition: '底部横向排列',
        layout: '放射状构图，产品居中发散，采用几何对称和圆形扩散动态',
        backgroundDesc: '玻璃金属混合材质+高科技光源+未来感质感，带有数字矩阵纹理和电路板图案',
        lightingRequirements: '灯带投射出蓝金色全息光影，形成立体层次，背景出现意外的代码光束交错',
        textRequirements: '大号未来科技字体，充满动感，讲述科技创新与定制化的故事',
        colorTone: '金黄与冷蓝对比色调，融入科技感与未来感情绪',
        posterSize: '1:1',
        overallStyle: '未来科技风，强调产品的创新科技与无限定制可能性',
        description: '适合面向科技爱好者、商业空间设计师和追求前沿技术的客户',
        score: 10,
        usageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        templateId: 'led-strip-warm-002',
        productType: 'LED灯带',
        applicationScene: '家居空间',
        styleType: '温馨',
        position: '环绕整个画面边缘',
        foreground: '暖黄色LED灯带柔和地环绕在画面四周，形成温暖光晕，灯带呈现柔和曲线，光线朦胧而舒适',
        background: '舒适的现代家居客厅，壁炉旁的沙发和书架，窗外是日落景色，营造温馨放松的居家氛围',
        featurePosition: '中心区域',
        layout: '环形构图，灯带环绕，中心留白放置文字，采用柔和曲线和圆滑过渡',
        backgroundDesc: '木质和织物材质+温暖夕阳光+舒适质感，带有细腻的家居纹理',
        lightingRequirements: '灯带发出的光线在墙壁和家具上形成温暖的光斑，强调光线的柔和扩散效果',
        textRequirements: '优雅的手写风格字体，中等大小，传递舒适和温馨的情感',
        colorTone: '暖黄、淡橙和浅棕色调，营造温暖放松的氛围',
        posterSize: '4:3',
        overallStyle: '现代温馨风格，强调产品为家居环境带来的舒适感和情调',
        description: '适合家庭用户、室内设计师和追求居家舒适感的客户',
        score: 9,
        usageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        templateId: 'led-panel-business-001',
        productType: 'LED面板灯',
        applicationScene: '办公空间',
        styleType: '现代商务',
        position: '画面中央顶部',
        foreground: '超薄LED面板灯悬浮在办公桌上方，发出均匀纯净的白光，照亮下方的工作区域，灯具边缘有金属质感装饰',
        background: '现代简约的办公环境，干净整洁的办公桌面，墙上挂着简约图表和公司愿景，体现专业高效的工作氛围',
        featurePosition: '底部分栏展示',
        layout: '上下分区构图，顶部为产品，底部为工作场景，采用直线和规则形状',
        backgroundDesc: '金属与玻璃材质+明亮均匀光线+专业质感，带有极简几何图案',
        lightingRequirements: '面板灯投射均匀的照明，无明显阴影，营造清晰可视的工作环境',
        textRequirements: '简洁现代无衬线字体，排版整齐，强调清晰易读',
        colorTone: '主色调为白色和浅灰色，配以少量蓝色企业色点缀',
        posterSize: '16:9',
        overallStyle: '专业商务风格，突出产品的高效、专业和可靠性',
        description: '适合企业客户、办公空间设计师和追求效率的专业人士',
        score: 8,
        usageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 添加默认模板到数据库
    for (const template of defaultTemplates) {
      await db.prompts.put(`product-template:${template.templateId}`, template);
    }

    res.json({
      success: true,
      message: '默认海报提示词模板初始化成功',
      templates: defaultTemplates
    });
  } catch (error) {
    console.error('初始化默认海报提示词模板失败:', error);
    res.status(500).json({ 
      success: false,
      error: '初始化默认海报提示词模板失败' 
    });
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

// 生成海报设计方案
router.post('/generate-poster-proposals', async (req, res) => {
  try {
    const { productInfo, useMultimodal } = req.body;
    
    if (!productInfo || !productInfo.name) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的产品信息'
      });
    }
    
    // 使用UUID为本次请求生成唯一标识
    const sessionId = uuidv4();
    
    // 调用geminiService生成海报方案
    console.log('生成海报方案, 使用多模态:', useMultimodal || false);
    const proposals = await geminiService.generatePosterProposals(productInfo, useMultimodal || false);
    
    // 将方案保存到数据库中
    await db.prompts.put(`session:${sessionId}`, {
      sessionId,
      productInfo,
      proposals,
      createdAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      sessionId,
      proposals
    });
  } catch (error) {
    console.error('生成海报方案失败:', error);
    
    res.status(500).json({
      success: false,
      message: '生成方案失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 基于选择的方案生成最终提示词
router.post('/generate-final-prompt-from-proposal', async (req, res) => {
  try {
    const { sessionId, proposalId, productInfo } = req.body;
    
    if (!sessionId || !proposalId || !productInfo) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 从数据库获取之前保存的方案
    let proposalsData;
    try {
      const storageKey = `proposals:${sessionId}`;
      console.log(`尝试从数据库获取方案数据，键名: ${storageKey}`);
      proposalsData = await db.prompts.get(storageKey);
      console.log(`成功获取方案数据，方案数量: ${proposalsData.proposals.length}`);
    } catch (error) {
      console.error(`从数据库获取方案数据失败:`, error);
      if (error.notFound) {
        return res.status(404).json({
          success: false,
          message: '找不到相关会话',
          error: '会话数据可能已过期或未正确保存'
        });
      }
      return res.status(500).json({
        success: false,
        message: '数据库操作失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
    
    // 找到选择的方案
    const selectedProposal = proposalsData.proposals.find(p => p.proposalId === proposalId);
    if (!selectedProposal) {
      return res.status(404).json({
        success: false,
        message: '找不到选择的方案',
        error: `在会话 ${sessionId} 中未找到方案ID ${proposalId}`
      });
    }
    
    // 生成最终提示词
    const finalPrompt = await geminiService.generateFinalPromptFromProposal(selectedProposal, productInfo);
    
    // 同时生成英文版本提示词，方便调试
    // 英文版本简单使用原始结构，实际应用中可能需要翻译
    const finalPromptEn = `A ${productInfo.name} commercial poster with ${selectedProposal.styleName} style.

The product is positioned at the ${selectedProposal.position} of the poster, foreground: ${selectedProposal.foreground}.

Background: ${selectedProposal.background}.

Product features are positioned at ${selectedProposal.featurePosition}, displaying "${Array.isArray(productInfo.features) ? productInfo.features.join(', ') : productInfo.features}".

Layout: ${selectedProposal.layout}.

Background details: ${selectedProposal.backgroundDesc}.

Lighting: ${selectedProposal.lightingRequirements}.

Text: ${selectedProposal.textRequirements}.

Color tone: ${selectedProposal.colorTone}.

Poster size: ${selectedProposal.posterSize}.

Overall style: ${selectedProposal.overallStyle}.

Upper left brand LOGO: "RS-LED", lower right company website: "www.rs-led.com", lower left is a small company QR code.`;
    
    // 保存生成的提示词
    const promptId = `prompt_${Date.now()}`;
    await db.prompts.put(promptId, {
      id: promptId,
      sessionId,
      proposalId,
      productInfo,
      finalPrompt,
      finalPromptEn,
      proposal: selectedProposal,
      createdAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      promptId,
      finalPrompt,
      finalPromptEn,
      proposal: selectedProposal
    });
  } catch (error) {
    console.error('基于方案生成最终提示词失败:', error);
    res.status(500).json({
      success: false,
      message: '生成最终提示词失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 