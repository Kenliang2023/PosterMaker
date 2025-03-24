const express = require('express');
const router = express.Router();
const db = require('../db');
const geminiService = require('../services/geminiService');

// 生成海报方案
router.post('/generate-proposals', async (req, res) => {
  try {
    const { productInfo } = req.body;
    
    if (!productInfo) {
      return res.status(400).json({
        success: false,
        message: '缺少产品信息'
      });
    }
    
    // 调用Gemini服务生成方案
    const result = await geminiService.generatePosterProposals(productInfo);
    
    // 返回生成的方案和会话ID
    res.json({
      success: true,
      proposals: result.proposals,
      sessionId: result.sessionId,
      message: '成功生成海报方案'
    });
  } catch (error) {
    console.error('生成海报方案失败:', error);
    res.status(500).json({
      success: false,
      message: '生成海报方案失败:' + error.message
    });
  }
});

// 根据会话ID获取方案
router.get('/proposals/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 尝试不同的键名格式获取方案数据
    let proposalsData;
    try {
      // 首先尝试带冒号的格式
      proposalsData = await db.prompts.get(`proposals:${sessionId}`);
      console.log('成功使用proposals:sessionId格式获取方案');
    } catch (error) {
      if (error.notFound) {
        // 如果找不到，尝试不带冒号的格式
        try {
          proposalsData = await db.prompts.get(sessionId);
          console.log('成功使用sessionId格式获取方案');
          // 将数组格式的数据转换为对象格式
          if (Array.isArray(proposalsData)) {
            proposalsData = { proposals: proposalsData };
          }
        } catch (innerError) {
          throw new Error('方案数据不存在或已过期');
        }
      } else {
        throw error;
      }
    }
    
    // 返回方案数据
    res.json({
      success: true,
      data: proposalsData
    });
  } catch (error) {
    console.error('获取方案数据失败:', error);
    res.status(404).json({
      success: false,
      message: '获取方案数据失败:' + error.message
    });
  }
});

// 根据方案生成最终提示词
router.post('/generate-final-prompt-from-proposal', async (req, res) => {
  try {
    const { sessionId, proposalId, productInfo } = req.body;
    
    if (!sessionId || !proposalId || !productInfo) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 首先尝试从缓存中获取之前生成的提示词
    try {
      const savedPrompt = await db.prompts.get(`prompt_${sessionId}_${proposalId}`);
      if (savedPrompt && savedPrompt.finalPrompt) {
        console.log('使用缓存的提示词');
        return res.json({
          success: true,
          finalPrompt: savedPrompt.finalPrompt,
          cached: true
        });
      }
    } catch (cacheError) {
      // 缓存不存在，继续获取方案生成提示词
      console.log('缓存提示词不存在，将重新生成');
    }
    
    // 获取方案数据
    let selectedProposal;
    
    // 尝试不同的键名格式获取方案数据
    try {
      // 首先尝试带冒号的格式
      const proposalsData = await db.prompts.get(`proposals:${sessionId}`);
      selectedProposal = proposalsData.proposals.find(p => p.proposalId === proposalId);
    } catch (error) {
      if (error.notFound) {
        // 如果找不到，尝试不带冒号的格式
        try {
          const proposalsData = await db.prompts.get(sessionId);
          // 可能直接返回数组
          if (Array.isArray(proposalsData)) {
            selectedProposal = proposalsData.find(p => p.proposalId === proposalId);
          } else if (proposalsData.proposals) {
            selectedProposal = proposalsData.proposals.find(p => p.proposalId === proposalId);
          }
        } catch (innerError) {
          throw new Error('方案数据不存在或已过期');
        }
      } else {
        throw error;
      }
    }
    
    if (!selectedProposal) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的方案'
      });
    }
    
    // 生成最终提示词
    const finalPrompt = await geminiService.generateFinalPromptFromProposal(selectedProposal, productInfo);
    
    // 保存生成的提示词供后续使用
    try {
      await db.prompts.put(`prompt_${sessionId}_${proposalId}`, {
        sessionId,
        proposalId,
        productInfo,
        finalPrompt,
        createdAt: new Date().toISOString()
      });
      console.log('提示词已保存到数据库');
    } catch (saveError) {
      console.error('保存提示词到数据库失败:', saveError);
      // 继续使用生成的提示词，但不阻止流程
    }
    
    // 返回生成的提示词
    res.json({
      success: true,
      finalPrompt: finalPrompt,
      cached: false
    });
  } catch (error) {
    console.error('生成最终提示词失败:', error);
    res.status(500).json({
      success: false,
      message: '生成最终提示词失败:' + error.message
    });
  }
});

module.exports = router; 