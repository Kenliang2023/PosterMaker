const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Gemini API配置
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent';

/**
 * 将图片转换为base64编码
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string>} - base64编码的图片
 */
const imageToBase64 = async (imagePath) => {
  try {
    const imageBuffer = await fs.promises.readFile(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('图片转换为base64失败:', error);
    throw new Error('图片转换失败');
  }
};

/**
 * 使用Gemini API生成海报
 * @param {string} imagePath - 产品图片路径
 * @param {string} prompt - 提示词
 * @returns {Promise<Object>} - Gemini API响应
 */
const generatePoster = async (imagePath, prompt) => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('未配置Gemini API密钥');
    }

    // 读取图片并转换为base64
    const base64Image = await imageToBase64(imagePath);
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

    // 构建API请求数据
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    // 发送API请求
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Gemini API调用失败:', error.message);
    throw new Error(`海报生成失败: ${error.message}`);
  }
};

/**
 * 保存生成的海报图片
 * @param {string} base64Image - base64编码的图片数据
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} - 保存的文件路径
 */
const savePosterImage = async (base64Image, fileName) => {
  try {
    // 从base64数据中提取图片数据部分
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('无效的base64图片数据');
    }

    const data = Buffer.from(matches[2], 'base64');
    const filePath = path.join(__dirname, '../../../uploads/posters', fileName);
    
    await fs.promises.writeFile(filePath, data);
    return `/uploads/posters/${fileName}`;
  } catch (error) {
    console.error('保存海报图片失败:', error);
    throw new Error('保存海报图片失败');
  }
};

/**
 * 解析Gemini API响应中的图片URL或base64数据
 * @param {Object} geminiResponse - Gemini API响应
 * @returns {Promise<string|null>} - 图片URL或base64数据
 */
const extractImageFromResponse = (geminiResponse) => {
  try {
    // 这里的逻辑需要根据实际的Gemini API响应格式进行调整
    if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
      const candidate = geminiResponse.candidates[0];
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        // 遍历所有parts，查找图片数据
        for (const part of candidate.content.parts) {
          if (part.inline_data && part.inline_data.data) {
            return part.inline_data.data;
          }
          
          // 检查文本中是否包含base64图片
          if (part.text) {
            const base64Match = part.text.match(/data:image\/[^;]+;base64,[^\s"')]+/);
            if (base64Match) {
              return base64Match[0];
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('从Gemini响应中提取图片失败:', error);
    return null;
  }
};

module.exports = {
  generatePoster,
  savePosterImage,
  extractImageFromResponse
}; 