// 使用Google官方客户端库
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Gemini API配置
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * 将图片转换为base64编码
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string>} - base64编码的图片
 */
const imageToBase64 = async (imagePath) => {
  try {
    console.log(`开始读取图片: ${imagePath}`);
    const imageBuffer = await fs.promises.readFile(imagePath);
    const base64Data = imageBuffer.toString('base64');
    console.log(`成功将图片转换为base64，大小: ${Math.round(base64Data.length / 1024)}KB`);
    return base64Data;
  } catch (error) {
    console.error(`图片转换为base64失败: ${error.message}`);
    console.error(`图片路径: ${imagePath}`);
    console.error(`错误堆栈: ${error.stack}`);
    throw new Error(`图片转换失败: ${error.message}`);
  }
};

/**
 * 使用Gemini API生成海报
 * @param {string} imagePath - 产品图片路径
 * @param {string} prompt - 提示词
 * @returns {Promise<Object>} - Gemini API响应
 */
const generatePoster = async (imagePath, prompt) => {
  let retries = 0;
  let lastError = null;

  console.log(`===== 开始Gemini API海报生成流程 =====`);
  console.log(`图片路径: ${imagePath}`);
  console.log(`API密钥: ${GEMINI_API_KEY ? '已配置' : '未配置'}`);

  while (retries < MAX_RETRIES) {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('未配置Gemini API密钥');
      }

      console.log(`尝试生成海报 (尝试 ${retries + 1}/${MAX_RETRIES})...`);
      console.log(`使用提示词: ${prompt}`);
      
      // 构建增强的提示词，包含创建海报的详细说明
      const enhancedPrompt = `Create a professional marketing poster for an LED strip light product. 
Design it with a modern, clean aesthetic that highlights the product's features.
Make the poster visually appealing with a strong brand presence and compelling text layout.
The poster should include these product features prominently: ${prompt}
IMPORTANT: Generate a complete image of the poster, not just text describing it.`;

      // 读取图片文件并转换为base64
      const imageData = await imageToBase64(imagePath);
      
      // 初始化客户端
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      
      // 使用gemini-2.0-flash-exp-image-generation模型
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseModalities: ['Text', 'Image']
        }
      });
      
      console.log('准备发送API请求，同时提交文本和图片...');
      
      // 创建包含图片的内容部分
      const fileObject = {
        data: Buffer.from(imageData, 'base64'),
        mimeType: 'image/jpeg'
      };
      
      // 将文本和图片组合成内容数组发送请求
      const result = await model.generateContent([
        enhancedPrompt, 
        fileObject
      ]);
      
      const response = await result.response;
      
      console.log(`Gemini API响应成功`);
      
      return response;
    } catch (error) {
      lastError = error;
      retries++;
      
      // 记录详细错误信息
      console.error(`Gemini API调用失败 (尝试 ${retries}/${MAX_RETRIES}):`, error.message);
      console.error(`错误堆栈: ${error.stack}`);
      
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAY * retries;
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  console.error('达到最大重试次数，生成海报失败');
  throw new Error(`海报生成失败 (${MAX_RETRIES}次尝试后): ${lastError.message}`);
};

/**
 * 从Gemini API响应中提取图片数据
 * @param {Object} response - Gemini API响应
 * @returns {string|null} - base64编码的图片数据或null
 */
const extractImageFromResponse = (response) => {
  try {
    console.log('开始从响应中提取图像...');
    
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error('响应中没有候选结果');
      return null;
    }
    
    const parts = response.candidates[0].content.parts;
    console.log(`找到 ${parts.length} 个内容部分`);
    
    // 查找包含图像数据的部分
    for (const part of parts) {
      if (part.inlineData) {
        console.log(`找到图像数据，MIME类型: ${part.inlineData.mimeType}`);
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    console.error('在响应中未找到图像数据');
    return null;
  } catch (error) {
    console.error('提取图像时出错:', error);
    return null;
  }
};

/**
 * 保存海报图片
 * @param {string} imageData - base64编码的图片数据
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} - 保存的图片URL
 */
const savePosterImage = async (imageData, fileName) => {
  // 使用public目录，确保前端可以访问
  const posterDir = path.join(__dirname, '../../../public/uploads/posters');
  const filePath = path.join(posterDir, fileName);
  
  try {
    // 确保目录存在
    if (!fs.existsSync(posterDir)) {
      fs.mkdirSync(posterDir, { recursive: true });
      console.log(`创建海报目录: ${posterDir}`);
    }
    
    // 从base64数据中提取实际的base64编码部分
    let base64Data = imageData;
    if (imageData.includes('base64,')) {
      base64Data = imageData.split('base64,')[1];
    }
    
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));
    
    // 返回正确的公共URL路径，始终使用/public前缀
    return `/public/uploads/posters/${fileName}`;
  } catch (error) {
    console.error(`保存海报图片失败: ${error.message}`);
    throw new Error(`保存海报图片失败: ${error.message}`);
  }
};

module.exports = {
  generatePoster,
  savePosterImage,
  extractImageFromResponse
}; 