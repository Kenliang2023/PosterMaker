# Google API 调用完整指南

本文档提供了Google API的标准调用方法，特别是Gemini API的文本生成和图像生成功能，可用于快速实现AI驱动的应用程序。

## 目录

1. [环境准备](#环境准备)
2. [Gemini 文本生成](#Gemini-文本生成)
3. [Gemini 多模态输入](#Gemini-多模态输入)
4. [Gemini 图像生成](#Gemini-图像生成)
5. [结构化输出](#结构化输出)
6. [错误处理与重试机制](#错误处理与重试机制)
7. [最佳实践](#最佳实践)

## 环境准备

### 安装依赖

```bash
npm install @google/generative-ai axios dotenv
```

### 配置环境变量

创建 `.env` 文件并添加 Google API 密钥：

```
GEMINI_API_KEY=your_api_key_here
```

### 基本初始化

```javascript
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
require('dotenv').config();

// 获取API密钥
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 初始化Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 毫秒
```

## Gemini 文本生成

### 基本文本生成

```javascript
/**
 * 使用Gemini生成文本内容
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} - 生成的文本
 */
async function generateText(prompt) {
  try {
    // 选择模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 生成内容
    const result = await model.generateContent(prompt);
    
    // 返回文本
    return result.response.text();
  } catch (error) {
    console.error('文本生成失败:', error);
    throw error;
  }
}
```

### 高级文本生成（带参数控制）

```javascript
/**
 * 使用Gemini生成文本内容（高级参数控制）
 * @param {string} prompt - 提示词
 * @param {Object} options - 生成参数
 * @returns {Promise<string>} - 生成的文本
 */
async function generateTextAdvanced(prompt, options = {}) {
  try {
    // 默认参数
    const defaultOptions = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 选择模型
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: mergedOptions.temperature,
        topK: mergedOptions.topK,
        topP: mergedOptions.topP,
        maxOutputTokens: mergedOptions.maxOutputTokens
      },
      safetySettings: mergedOptions.safetySettings
    });
    
    // 生成内容
    const result = await model.generateContent(prompt);
    
    // 返回文本
    return result.response.text();
  } catch (error) {
    console.error('高级文本生成失败:', error);
    throw error;
  }
}
```

## Gemini 多模态输入

### 文本+图像输入

```javascript
/**
 * 使用Gemini处理图像和文本
 * @param {string} prompt - 提示词
 * @param {string} imageUrl - 图片URL或本地路径
 * @returns {Promise<string>} - 生成的文本
 */
async function analyzeImageWithText(prompt, imageUrl) {
  try {
    // 准备图像数据
    const imageData = await prepareImageData(imageUrl);
    
    // 选择多模态模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // 创建多模态内容
    const content = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: imageData.mimeType, data: imageData.data } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };
    
    // 生成内容
    const result = await model.generateContent(content);
    
    // 返回文本
    return result.response.text();
  } catch (error) {
    console.error('多模态分析失败:', error);
    throw error;
  }
}

/**
 * 准备图像数据
 * @param {string} imageUrl - 图像URL或路径
 * @returns {Promise<Object>} - 包含mime_type和base64数据
 */
async function prepareImageData(imageUrl) {
  if (!imageUrl) {
    throw new Error('未提供图片URL');
  }
  
  try {
    // 本地文件路径处理
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/public/') || imageUrl.startsWith('./')) {
      const localPath = path.join(process.cwd(), imageUrl);
      const fileData = await fs.promises.readFile(localPath);
      const base64Data = fileData.toString('base64');
      const extension = path.extname(localPath).substring(1).toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
      
      return {
        mimeType: mimeType,
        data: base64Data
      };
    } 
    // 远程URL处理
    else if (imageUrl.startsWith('http')) {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Data = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'];
      
      return {
        mimeType: mimeType,
        data: base64Data
      };
    }
    // Data URL处理
    else if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        return {
          mimeType: matches[1],
          data: matches[2]
        };
      }
    }
    
    throw new Error('不支持的图片URL格式');
  } catch (error) {
    console.error('准备图片数据失败:', error);
    throw error;
  }
}
```

## Gemini 图像生成

### 基于文本和参考图片生成图像

```javascript
/**
 * 使用Gemini生成图像
 * @param {string} imageUrl - 参考图像URL
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} - 返回base64格式的图像
 */
async function generateImage(imageUrl, prompt) {
  let retries = 0;
  let lastError = null;

  console.log(`开始Gemini API图像生成流程`);

  while (retries < MAX_RETRIES) {
    try {
      // 读取图片文件
      const imageData = await prepareImageData(imageUrl);
      
      // 创建多模态内容
      const imagePart = {
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      };
      
      // 初始化图像生成模型
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
          responseModalities: ['Text', 'Image']
        },
      });
      
      // 调用API生成图像，传递多模态内容
      const parts = [imagePart, { text: prompt }];
      const response = await model.generateContent(parts);
      
      // 解析返回的图像数据
      return extractImageFromResponse(response);
      
    } catch (error) {
      lastError = error;
      retries++;
      
      console.error(`Gemini API调用失败 (尝试 ${retries}/${MAX_RETRIES}):`, error.message);
      
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAY * retries;
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  throw new Error(`图像生成失败 (${MAX_RETRIES}次尝试后): ${lastError.message}`);
}

/**
 * 解析Gemini API响应中的图像数据
 * @param {Object} geminiResponse - Gemini API响应
 * @returns {string|null} - 图像的base64数据
 */
function extractImageFromResponse(geminiResponse) {
  try {
    // 检查响应格式
    for (const part of geminiResponse.response.candidates[0].content.parts) {
      // 提取图像数据
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('解析Gemini响应失败:', error);
    return null;
  }
}

/**
 * 保存生成的图像
 * @param {string} base64Image - base64编码的图像数据
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} - 保存的文件路径
 */
async function saveImage(base64Image, fileName) {
  try {
    // 从base64数据中提取图像数据部分
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('无效的base64图像数据');
    }

    const data = Buffer.from(matches[2], 'base64');
    const directory = path.join(process.cwd(), 'uploads/images');
    
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    const filePath = path.join(directory, fileName);
    await fs.promises.writeFile(filePath, data);
    
    return `/uploads/images/${fileName}`;
  } catch (error) {
    console.error('保存图像失败:', error);
    throw new Error('保存图像失败');
  }
}
```

## 结构化输出

### 使用Schema定义输出结构

```javascript
/**
 * 使用Gemini生成结构化数据
 * @param {string} prompt - 提示词
 * @param {Object} schema - 输出的JSON Schema
 * @returns {Promise<Object>} - 结构化的输出数据
 */
async function generateStructuredData(prompt, schema) {
  try {
    // 选择模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 创建schema驱动请求
    const content = {
      contents: [{
        parts: [
          { text: prompt },
          { schema_id: "your_schema_id", schema: schema }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseSchemaVersion: 1
      }
    };
    
    // 生成内容
    const result = await model.generateContent(content);
    const response = result.response;
    
    try {
      // 尝试解析响应的JSON
      const responseText = response.text();
      
      // 移除可能的Markdown代码块标记
      let cleanResponse = responseText;
      if (responseText.includes('```json')) {
        cleanResponse = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
      } else if (responseText.includes('```')) {
        cleanResponse = responseText.replace(/```\n/, '').replace(/\n```$/, '');
      }
      
      // 解析JSON数据
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('解析结构化数据失败:', parseError);
      console.error('原始响应:', response.text());
      throw new Error('解析结构化数据失败');
    }
  } catch (error) {
    console.error('生成结构化数据失败:', error);
    throw error;
  }
}

// 示例Schema定义
const exampleSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: "名称"
    },
    age: {
      type: SchemaType.NUMBER,
      description: "年龄"
    },
    hobbies: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING
      },
      description: "爱好列表"
    },
    address: {
      type: SchemaType.OBJECT,
      properties: {
        street: {
          type: SchemaType.STRING,
          description: "街道"
        },
        city: {
          type: SchemaType.STRING,
          description: "城市"
        }
      },
      description: "地址信息"
    }
  }
};
```

## 错误处理与重试机制

### 完整的重试机制

```javascript
/**
 * 带重试机制的API调用
 * @param {Function} apiCall - API调用函数
 * @param {Array} args - API调用参数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} baseDelay - 基础延迟（毫秒）
 * @returns {Promise<any>} - API调用结果
 */
async function withRetry(apiCall, args, maxRetries = 3, baseDelay = 1000) {
  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    try {
      return await apiCall(...args);
    } catch (error) {
      lastError = error;
      retries++;
      
      // 记录错误，但继续重试
      console.error(`API调用失败 (尝试 ${retries}/${maxRetries}):`, error.message);
      
      // 检查是否为不可重试的错误
      if (isNonRetryableError(error)) {
        console.error('遇到不可重试的错误，停止重试');
        throw error;
      }
      
      if (retries < maxRetries) {
        // 使用指数退避策略
        const delay = baseDelay * Math.pow(2, retries - 1);
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  throw new Error(`API调用失败 (${maxRetries}次尝试后): ${lastError.message}`);
}

/**
 * 检查是否为不可重试的错误
 * @param {Error} error - 错误对象
 * @returns {boolean} - 是否为不可重试的错误
 */
function isNonRetryableError(error) {
  // 检查错误是否包含状态码
  if (error.status) {
    // 400错误通常表示请求有问题，不适合重试
    if (error.status === 400) {
      return true;
    }
    
    // 401/403错误表示授权问题，不适合重试
    if (error.status === 401 || error.status === 403) {
      return true;
    }
  }
  
  // 检查错误消息
  const errorMessage = error.message.toLowerCase();
  
  // API密钥相关错误
  if (errorMessage.includes('api key') || errorMessage.includes('apikey')) {
    return true;
  }
  
  // 配额限制错误
  if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    return true;
  }
  
  return false;
}
```

## 最佳实践

### 提示词工程

1. **清晰明确的指令**：提供详细的指令，包括任务目标、期望输出格式和任何限制。

```javascript
// 好的提示词示例
const goodPrompt = `分析以下LED灯带产品数据，创建一个销售海报设计方案。
产品详情：
- 产品名称: 高亮度LED灯带
- 主要特点: 高亮度、低功耗、长寿命
- 目标客户: 室内装饰市场
- 使用场景: 客厅间接照明

请提供以下内容：
1. 一个吸引人的标题（不超过10个字）
2. 3个产品亮点（每个不超过6个字）
3. 一个具体的视觉设计方案，包括：
   - 产品在画面中的位置和大小
   - 建议的色彩方案
   - 文字布局
   - 背景设计
`;
```

2. **使用结构化提示**：通过分点和示例增强清晰度，特别是使用Schema时。

3. **考虑多轮交互**：对于复杂任务，考虑分步骤生成，逐步完善结果。

### 性能优化

1. **选择合适的模型**：
   - 文本任务：使用 `gemini-2.0-flash`
   - 文本+图像输入：使用 `gemini-2.0-flash-exp`
   - 生成图像：使用 `gemini-2.0-flash-exp-image-generation`

2. **生成参数调优**：
   - `temperature`：控制创造性，0.0为最确定性，1.0为最创造性
   - `topK` 和 `topP`：控制文本多样性
   - `maxOutputTokens`：限制响应长度，减少API成本

3. **缓存常用响应**：对于频繁且相似的请求，考虑实现缓存机制。

### 安全注意事项

1. **API密钥保护**：
   - 使用环境变量管理API密钥
   - 避免在客户端代码中暴露密钥
   - 考虑通过后端服务代理API请求

2. **内容安全过滤**：
   - 使用safetySettings参数过滤有害内容
   - 针对用户输入实施验证，防止提示词注入攻击

3. **错误信息处理**：
   - 在生产环境中避免向用户展示原始API错误信息
   - 实现适当的错误日志记录和监控

### 处理大型响应

1. **分块处理**：对于大型文本响应，考虑分块处理并递增显示。

2. **流式处理**：对于长时间运行的请求，考虑实现流式API调用，提供更好的用户体验。

## 常见问题排查

1. **API密钥问题**：
   - 确认API密钥正确且有效
   - 验证API配额和使用限制

2. **模型不可用**：
   - 确认使用的模型名称是否正确
   - 检查模型是否在您的区域可用

3. **请求格式错误**：
   - 验证JSON请求格式
   - 检查参数名称和类型是否正确

4. **内容被过滤**：
   - 检查是否触发了安全过滤器
   - 调整提示词，避免敏感内容

---

本文档提供了Google API的标准调用方法，重点介绍了Gemini系列模型的使用。通过这些代码模板，您可以快速实现文本生成、图像分析和图像生成功能，加速AI应用开发。 