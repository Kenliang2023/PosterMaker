const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
require('dotenv').config();

// Gemini API配置
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// 使用gemini-2.0-flash-exp模型，该模型支持图像生成
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 初始化 Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 使用Gemini文本模型生成海报设计方案
 * @param {object} productInfo - 产品信息
 * @returns {Promise<Array>} - 海报方案数组
 */
const generatePosterProposals = async (productInfo) => {
  try {
    console.log('===== 开始调用Gemini文本模型生成海报方案 =====');
    console.log('产品信息:', JSON.stringify(productInfo, null, 2));
    
    // 定义方案输出的结构化Schema
    const schema = {
      type: SchemaType.ARRAY,
      description: "海报设计方案列表",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          proposalId: {
            type: SchemaType.STRING,
            description: "方案唯一ID",
          },
          styleName: {
            type: SchemaType.STRING,
            description: "风格名称",
          },
          styleDescription: {
            type: SchemaType.STRING,
            description: "风格简短描述",
          },
          position: {
            type: SchemaType.STRING,
            description: "产品在海报中的位置",
          },
          background: {
            type: SchemaType.STRING,
            description: "背景描述",
          },
          featurePosition: {
            type: SchemaType.STRING,
            description: "产品特点文字位置",
          },
          layout: {
            type: SchemaType.STRING,
            description: "整体布局描述",
          },
          backgroundDesc: {
            type: SchemaType.STRING,
            description: "背景材质、光线和质感描述",
          },
          lightingRequirements: {
            type: SchemaType.STRING,
            description: "光影要求",
          },
          textRequirements: {
            type: SchemaType.STRING,
            description: "文字要求",
          },
          colorTone: {
            type: SchemaType.STRING,
            description: "色调要求",
          },
          posterSize: {
            type: SchemaType.STRING,
            description: "海报尺寸",
          },
          overallStyle: {
            type: SchemaType.STRING,
            description: "海报整体风格",
          },
          integrationElements: {
            type: SchemaType.OBJECT,
            description: "产品与背景环境协调统一的元素",
            properties: {
              lightIntegration: {
                type: SchemaType.STRING,
                description: "详细描述产品发出的光线如何与背景环境融合，包括光线在表面的反射、扩散和投影效果"
              },
              installationContext: {
                type: SchemaType.STRING,
                description: "描述产品在场景中的具体安装位置、方式和作用，确保符合实际应用逻辑"
              },
              visualHarmony: {
                type: SchemaType.STRING,
                description: "说明产品与环境在色彩、风格和主题上如何保持统一和协调"
              }
            }
          },
          displayedText: {
            type: SchemaType.OBJECT,
            description: "海报上显示的文字内容，所有需在海报上显示的文字必须用引号包围",
            properties: {
              headline: {
                type: SchemaType.STRING,
                description: "主标题文字，用引号包围，如\"高亮度LED灯带\""
              },
              features: {
                type: SchemaType.ARRAY,
                description: "产品特点，每条都用引号包围，如[\"高显色性\", \"防水设计\"]",
                items: {
                  type: SchemaType.STRING
                }
              },
              tagline: {
                type: SchemaType.STRING,
                description: "标语/副标题，用引号包围，如\"照亮您的世界\""
              }
            }
          }
        },
        required: [
          "proposalId", "styleName", "styleDescription", "position", 
          "background", "featurePosition", "layout", "backgroundDesc", 
          "lightingRequirements", "textRequirements", "colorTone", 
          "posterSize", "overallStyle", "integrationElements", "displayedText"
        ]
      },
      minItems: 3,
      maxItems: 5
    };
    
    // 初始化文本模型，配置结构化输出
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    
    // 构建元提示词，指导AI生成海报方案
    const metaPrompt = `你是一个专门为文生图大语言模型设计提示词的专家，特别是在产品商业海报的提示词编写方面。你的任务是根据用户提供的产品信息和使用场景，生成多个海报设计方案。

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"
${productInfo.sceneDescription ? `* 使用场景详细描述: "${productInfo.sceneDescription}"` : ''}

为这个LED产品生成3-5个不同风格、不同场景的海报设计方案，每个方案都应该有独特的风格和设计理念，能够突出产品特点和适用场景。请注意，用户会上传产品图片作为海报的主体，生成方案中不需要前景描述，应该保留用户上传的图片原样作为海报主体。${productInfo.sceneDescription ? '请将用户提供的使用场景详细描述整合到你的方案中，尤其是背景描述部分。' : ''}

要求每个方案都包含：
- 独特的风格名称和简短描述
- 产品在海报中的位置（但不需要前景描述，因为会使用用户上传的产品图片）
- 背景描述和场景设定
- 产品特点文字的位置和布局
- 视觉要素（光影效果、色调、材质等）
- 海报尺寸和整体风格
- 产品与背景环境协调统一的表现：
  * 详细描述产品发出的光线如何与背景环境融合，包括光线在表面的反射、扩散和投影效果
  * 描述产品在场景中的具体安装位置、方式和作用，确保符合实际应用逻辑
  * 说明产品与环境在色彩、风格和主题上如何保持统一和协调
- 海报上显示的文字内容：
  * 主标题文字：必须用引号包围，如"高亮度LED灯带"
  * 产品特点：每条都用引号包围，如["高显色性", "防水设计"]
  * 标语/副标题：用引号包围，如"照亮您的世界"

请确保方案多样化，涵盖不同的设计风格（如现代简约、科技感、自然环保等）和不同的应用场景（家庭、商业、办公等）。每个方案的背景和产品必须有明确的视觉和功能上的关联，确保生成的海报看起来自然、专业且有说服力。`;

    // 调用API生成内容
    console.log('向Gemini发送方案生成请求...');
    const result = await model.generateContent(metaPrompt);
    
    // 提取返回的结构化数据
    const proposalsText = result.response.text().trim();
    console.log('Gemini返回的结构化方案:', proposalsText);
    
    // 解析JSON数据
    const proposals = JSON.parse(proposalsText);
    
    // 确保所有方案中都不包含前景描述，而是使用统一表述
    proposals.forEach(proposal => {
      // 如果schema中仍包含foreground字段(为了向后兼容)，就设置为固定文本
      if (proposal.hasOwnProperty('foreground')) {
        proposal.foreground = "保留图片原样，作为海报的主体";
      }
    });
    
    return proposals;
  } catch (error) {
    console.error('生成海报方案失败:', error.message);
    console.error('错误堆栈:', error.stack);
    throw error;
  }
};

/**
 * 基于选定的方案生成最终海报提示词
 * @param {object} proposal - 选择的海报方案
 * @param {object} productInfo - 产品信息
 * @returns {Promise<string>} - 最终海报提示词
 */
const generateFinalPromptFromProposal = async (proposal, productInfo) => {
  try {
    console.log('===== 开始基于方案生成最终提示词 =====');
    
    // 构建基础提示词，确保产品名称和特点使用引号包围，去掉前景描述
    const basePrompt = `一张"${productInfo.name}"商业海报。

产品位于海报${proposal.position}，保留图片原样，作为海报的主体。

海报的背景是：${proposal.background}。

${proposal.displayedText && proposal.displayedText.headline ? `海报主标题："${proposal.displayedText.headline}"。` : ''}

${proposal.displayedText && proposal.displayedText.features && Array.isArray(proposal.displayedText.features) ? `产品特点文字：${proposal.displayedText.features.map(feature => `"${feature}"`).join('、')}。` : `产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"`}

${proposal.displayedText && proposal.displayedText.tagline ? `海报标语："${proposal.displayedText.tagline}"。` : ''}

整体布局：${proposal.layout}。

背景描述：${proposal.backgroundDesc}。

光影要求：${proposal.lightingRequirements}。

文字要求：${proposal.textRequirements}。

色调要求：${proposal.colorTone}。

海报尺寸：${proposal.posterSize}。

海报整体风格：${proposal.overallStyle}。

${proposal.integrationElements ? `产品与环境协调：
- 光线融合：${proposal.integrationElements.lightIntegration}
- 安装位置：${proposal.integrationElements.installationContext}
- 视觉和谐：${proposal.integrationElements.visualHarmony}
` : ''}

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;

    // 初始化文本模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 构建元提示词，指导AI优化最终提示词，同时保留关键元素
    const metaPrompt = `我正在为LED灯带产品开发一个海报生成系统。请根据我提供的基础提示词和产品信息，优化提示词内容，使其更适合生成高质量的LED产品营销海报。

基础提示词：
${basePrompt}

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"

优化要求：
1. 增强提示词中的视觉细节描述，如光影效果、色彩表现、照明氛围等
2. 强化产品特点与具体应用场景的关联，使画面更具说服力
3. 添加专业的LED照明术语，突出产品的技术优势
4. 确保提示词长度适中，重点突出
5. 保留元素顺序和结构
6. 必须严格保留以下关键元素，不得修改：
   - 产品名称必须使用引号，即："${productInfo.name}"
   - 产品特点必须使用引号，即："${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
   - 左上角品牌LOGO："RS-LED"
   - 右下角网址："www.rs-led.com"
   - 左下角的公司二维码
   ${proposal.displayedText ? '- 海报上显示的所有文字内容，包括主标题、特点和标语，必须保持引号包围' : ''}
   ${proposal.integrationElements ? '- 保留所有关于产品与环境协调的描述，包括光线融合、安装位置和视觉和谐部分' : ''}
7. 重要：保留图片原样作为海报主体，不要描述前景内容。图片将由用户上传提供，不需要生成模型创建。

请直接返回优化后的完整提示词，不要包含任何解释或其他内容。`;

    // 调用API生成内容
    console.log('向Gemini发送最终提示词生成请求...');
    console.log('元提示词:', metaPrompt);
    const result = await model.generateContent(metaPrompt);
    
    // 提取返回的文本
    let finalPrompt = result.response.text().trim();
    
    // 检查并确保关键元素存在，移除任何前景描述
    finalPrompt = finalPrompt.replace(/前景描述：.*?，和海报背景无缝组成完整海报。/g, '保留图片原样，作为海报的主体。');
    
    const keyElements = [
      { key: `"${productInfo.name}"`, fallback: `一张"${productInfo.name}"商业海报` },
      { key: `"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"`, fallback: `产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"` },
      { key: "左上角品牌 LOGO 写着：\"RS-LED\"", fallback: "左上角品牌 LOGO 写着：\"RS-LED\"" },
      { key: "右下角公司网址写着\"www.rs-led.com\"", fallback: "右下角公司网址写着\"www.rs-led.com\"" },
      { key: "左下角是很小的公司二维码", fallback: "左下角是很小的公司二维码" }
    ];
    
    // 如果有displayedText字段，添加对应检查
    if (proposal.displayedText) {
      if (proposal.displayedText.headline) {
        keyElements.push({
          key: `"${proposal.displayedText.headline}"`,
          fallback: `海报主标题："${proposal.displayedText.headline}"`
        });
      }
      if (proposal.displayedText.tagline) {
        keyElements.push({
          key: `"${proposal.displayedText.tagline}"`,
          fallback: `海报标语："${proposal.displayedText.tagline}"`
        });
      }
    }
    
    // 如果有integrationElements字段，添加对应检查
    if (proposal.integrationElements && proposal.integrationElements.lightIntegration) {
      keyElements.push({
        key: "产品与环境协调",
        fallback: `产品与环境协调：\n- 光线融合：${proposal.integrationElements.lightIntegration}\n- 安装位置：${proposal.integrationElements.installationContext || '未指定'}\n- 视觉和谐：${proposal.integrationElements.visualHarmony || '未指定'}`
      });
    }
    
    // 对每个关键元素进行检查
    keyElements.forEach(element => {
      if (!finalPrompt.includes(element.key)) {
        console.warn(`警告：优化后的提示词缺少关键元素: ${element.key}`);
        // 如果是文本开头缺少产品名称，进行添加
        if (element.key.includes(productInfo.name) && !finalPrompt.startsWith('一张')) {
          finalPrompt = `一张"${productInfo.name}"商业海报。\n\n${finalPrompt}`;
        } 
        // 如果是结尾缺少LOGO等信息，进行添加
        else if (element.key.includes("RS-LED") || element.key.includes("www.rs-led.com") || element.key.includes("二维码")) {
          if (!finalPrompt.endsWith('.')) finalPrompt += '.';
          finalPrompt += '\n\n' + element.fallback + '.';
        }
        // 如果是产品特点缺失，尝试插入
        else if (element.key.includes(productInfo.features)) {
          const position = finalPrompt.indexOf("产品特点") || finalPrompt.indexOf("特点");
          if (position !== -1) {
            const beforeText = finalPrompt.substring(0, position + 6);
            const afterText = finalPrompt.substring(position + 6);
            finalPrompt = `${beforeText}文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"${afterText}`;
          } else {
            // 如果找不到插入点，追加到末尾
            finalPrompt += `\n\n产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。`;
          }
        }
      }
    });
    
    console.log('Gemini返回的最终提示词(检查后):', finalPrompt);
    
    return finalPrompt;
  } catch (error) {
    console.error('生成最终提示词失败:', error.message);
    console.error('错误堆栈:', error.stack);
    // 如果出错，返回基础提示词，确保包含必要的引号，去掉前景描述
    return `一张"${productInfo.name}"商业海报。

产品位于海报${proposal.position}，保留图片原样，作为海报的主体。

海报的背景是：${proposal.background}。

产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。

整体布局：${proposal.layout}。

背景描述：${proposal.backgroundDesc}。

光影要求：${proposal.lightingRequirements}。

文字要求：${proposal.textRequirements}。

色调要求：${proposal.colorTone}。

海报尺寸：${proposal.posterSize}。

海报整体风格：${proposal.overallStyle}。

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
  }
};

/**
 * 使用Gemini文本模型优化提示词
 * @param {string} originalPrompt - 原始提示词
 * @param {object} productInfo - 产品信息
 * @returns {Promise<string>} - 优化后的提示词
 */
const optimizePromptWithGemini = async (originalPrompt, productInfo) => {
  try {
    console.log('===== 开始调用Gemini文本模型优化提示词 =====');
    console.log('原始提示词:', originalPrompt);
    
    // 初始化文本模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 构建元提示词，指导AI如何优化提示词
    const metaPrompt = `我正在为LED灯带产品开发一个海报生成系统。请根据我提供的原始提示词和产品信息，优化提示词内容，使其更适合生成高质量的LED产品营销海报。

原始提示词：
${originalPrompt}

产品信息：
* 产品名称: ${productInfo.name}
* 产品特点: ${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}
* 目标客户: ${productInfo.targetAudience || '未指定'}

优化要求：
1. 请保持提示词的主要结构和关键元素不变
2. 增强提示词中的视觉细节描述，如光影效果、色彩表现、照明氛围等
3. 强化产品特点与具体应用场景的关联，使画面更具说服力
4. 确保优化后的提示词仍包含原始提示词中的所有重要信息
5. 保留品牌标识相关描述（如LOGO、网址等）
6. 添加专业的LED照明术语，突出产品的技术优势
7. 文本简洁明了，不要超过原始提示词长度的1.5倍

请直接返回优化后的完整提示词，不需要解释或其他内容。`;

    // 调用API生成内容
    console.log('向Gemini发送元提示词请求...');
    const result = await model.generateContent(metaPrompt);
    
    // 提取返回的文本
    const optimizedPrompt = result.response.text().trim();
    console.log('Gemini返回的优化提示词:', optimizedPrompt);
    
    return optimizedPrompt;
  } catch (error) {
    console.error('优化提示词失败:', error.message);
    console.error('错误堆栈:', error.stack);
    // 如果出错，返回原始提示词
    return originalPrompt;
  }
};

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

  // 检查提示词是否存在
  if (!prompt) {
    throw new Error('提示词不能为空');
  }

  // 修改提示词，去掉前景描述
  const modifiedPrompt = prompt.replace(/前景描述：.*?，和海报背景无缝组成完整海报。/g, '保留图片原样，作为海报的主体。');
  console.log(`修改后的提示词: ${modifiedPrompt}`);

  while (retries < MAX_RETRIES) {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('未配置Gemini API密钥');
      }

      console.log(`尝试生成海报 (尝试 ${retries + 1}/${MAX_RETRIES})...`);
      
      // 读取图片文件
      const imageBuffer = await fs.promises.readFile(imagePath);
      const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      const base64Image = imageBuffer.toString('base64');
      
      // 创建多模态内容
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };
      
      // 使用与测试文件相同的方式初始化模型
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
          responseModalities: ['Text', 'Image']
        },
      });
      
      console.log("使用模型: gemini-2.0-flash-exp-image-generation");
      
      // 调用API生成内容，传递多模态内容
      const parts = [imagePart, { text: modifiedPrompt }];
      console.log("发送多模态内容请求...");
      const response = await model.generateContent(parts);
      console.log("API调用成功！");
      
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
 * 解析Gemini API响应中的图片数据
 * @param {Object} geminiResponse - Gemini API响应
 * @returns {string|null} - 图片的base64数据
 */
const extractImageFromResponse = (geminiResponse) => {
  try {
    console.log('解析Gemini API响应...');
    
    // 检查响应格式
    for (const part of geminiResponse.response.candidates[0].content.parts) {
      // 根据部分类型，提取文本或图像
      if (part.text) {
        console.log("响应包含文本:", part.text.substring(0, 100) + "...");
      } else if (part.inlineData) {
        console.log("发现图像数据");
        const imageData = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${imageData}`;
      }
    }
    
    console.log('未能从响应中提取图片数据');
    return null;
  } catch (error) {
    console.error('解析Gemini响应失败:', error);
    return null;
  }
};

module.exports = {
  generatePoster,
  savePosterImage,
  extractImageFromResponse,
  optimizePromptWithGemini,
  generatePosterProposals,
  generateFinalPromptFromProposal
}; 