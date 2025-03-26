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
 * @param {boolean} useMultimodal - 是否使用多模态模型
 * @returns {Promise<Array>} - 海报方案数组
 */
const generatePosterProposals = async (productInfo, useMultimodal = false) => {
  try {
    console.log('===== 开始调用Gemini模型生成海报方案 =====');
    console.log('产品信息:', JSON.stringify(productInfo, null, 2));
    console.log('是否使用多模态模型:', useMultimodal);
    
    // 定义方案输出的结构化Schema
    const schema = {
      type: SchemaType.ARRAY,
      description: "海报设计方案列表",
      items: {
        type: SchemaType.OBJECT,
        description: "单个海报设计方案",
        properties: {
          proposalId: {
            type: SchemaType.STRING,
            description: "提案ID",
          },
          styleName: {
            type: SchemaType.STRING,
            description: "海报风格名称，如'现代简约'、'科技感'、'环保自然'等",
          },
          styleDescription: {
            type: SchemaType.STRING,
            description: "对海报风格的简要描述",
          },
          position: {
            type: SchemaType.STRING,
            description: "产品在海报中的位置，产品图片只能占画面15-30%的面积，必须确保背景环境清晰可见",
          },
          background: {
            type: SchemaType.STRING,
            description: "详细描述海报背景场景，突出与产品使用环境的关联",
          },
          featurePosition: {
            type: SchemaType.STRING,
            description: "产品特点文字在海报中的位置和排列方式",
          },
          layout: {
            type: SchemaType.STRING,
            description: "海报整体布局描述",
          },
          backgroundDesc: {
            type: SchemaType.STRING,
            description: "背景的材质、质感、氛围等详细描述",
          },
          lightingRequirements: {
            type: SchemaType.STRING,
            description: "海报中光线和照明效果的要求",
          },
          textRequirements: {
            type: SchemaType.STRING,
            description: "文字字体、大小、颜色等的要求",
          },
          colorTone: {
            type: SchemaType.STRING,
            description: "海报整体色调要求",
          },
          posterSize: {
            type: SchemaType.STRING,
            description: "海报尺寸，只能选择16:9、9:16、1:1三种标准格式",
            enum: ["16:9", "9:16", "1:1"]
          },
          overallStyle: {
            type: SchemaType.STRING,
            description: "海报整体设计风格",
          },
          integrationElements: {
            type: SchemaType.OBJECT,
            description: "产品与背景环境的协调元素",
            properties: {
              lightIntegration: {
                type: SchemaType.STRING,
                description: "产品发出的光线如何与背景环境融合"
              },
              installationContext: {
                type: SchemaType.STRING,
                description: "产品在场景中的安装位置和方式"
              },
              visualHarmony: {
                type: SchemaType.STRING,
                description: "产品颜色和材质如何与背景环境协调"
              }
            }
          },
          displayedText: {
            type: SchemaType.OBJECT,
            description: "海报上显示的文字内容",
            properties: {
              headline: {
                type: SchemaType.STRING,
                description: "海报主标题",
              },
              features: {
                type: SchemaType.ARRAY,
                description: "显示的产品特点列表（最多3条）",
                items: {
                  type: SchemaType.STRING
                }
              },
              tagline: {
                type: SchemaType.STRING,
                description: "海报广告语或标语",
              }
            }
          },
          finalPrompt: {
            type: SchemaType.STRING,
            description: "此方案对应的完整最终提示词，可直接用于生成海报",
          }
        }
      }
    };
    
    // 构建产品特点数组
    let featuresArray = [];
    if (Array.isArray(productInfo.features)) {
      featuresArray = productInfo.features;
    } else if (typeof productInfo.features === 'string') {
      featuresArray = productInfo.features.split('\n').filter(f => f.trim() !== '');
    }
    
    // 选择合适的模型
    const modelName = useMultimodal ? "gemini-2.0-flash-exp" : "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    
    let prompt = `作为一位LED灯带和照明产品营销内容专家，你的任务是创建3种不同风格的海报设计方案，以突出这款LED产品的特点和应用场景。

产品信息:
- 产品名称: ${productInfo.name}
- 产品特点: ${featuresArray.join(', ')}
- 目标客户: ${productInfo.targetAudience || "照明产品用户"}
- 使用场景: ${productInfo.sceneDescription || "室内外照明环境"}
- 海报画幅比例: ${productInfo.posterSize || "16:9"}

每个方案需要考虑:
1. 独特的视觉风格和情感基调
2. 产品在画面中的布局与位置安排
3. 背景场景的选择与描述
4. 文字布局与设计风格
5. 色彩搭配与光线效果
6. 整体设计感和专业性

海报构图要求:
1. 视觉层次分明，设置清晰的视觉重点和次重点区域
2. 合理运用留白，确保画面呼吸感和平衡感
3. 强调LED灯带的线性特质，创造视觉引导线条
4. 利用光影和线条创造层次感和空间感
5. 至少有一个方案应强调线条艺术风格，通过LED灯带的光线勾勒建筑或空间轮廓
6. 对比度处理，确保产品形象和文字清晰可辨

非常重要：每个方案都必须包含一个完整的最终提示词(finalPrompt)，该提示词将直接用于生成海报，不需要再进行处理。
提示词必须包含产品名称、位置说明、背景描述、文字内容、布局安排、光线效果、色调要求、海报尺寸、整体风格以及标志位置等所有必要元素。`;

    // 如果是多模态调用，添加图片分析提示
    if (useMultimodal && productInfo.imageUrl) {
      prompt += `\n\n请分析用户提供的产品图片，了解产品的实际外观、颜色和形状。根据图片特征，提出能够最好地展示产品特性的设计方案。
图片分析应考虑:
- 产品的具体形态与结构
- 产品的材质与颜色
- 产品的光照效果与特性
- 最适合产品的展示角度

请以JSON格式返回结果，每个方案包含以下字段：proposalId, styleName, styleDescription, position, background, featurePosition, layout, backgroundDesc, lightingRequirements, textRequirements, colorTone, posterSize, overallStyle, integrationElements, displayedText。`;
      
      // 准备图片数据
      const imageUrl = productInfo.imageUrl;
      const imageData = await prepareImageData(imageUrl);
      
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
      
      console.log('发送多模态请求到Gemini...');
      const result = await model.generateContent(content);
      const response = result.response;
      const proposalsResponse = response.text();
      
      try {
        // 移除可能的Markdown代码块标记
        let cleanResponse = proposalsResponse;
        if (proposalsResponse.includes('```json')) {
          cleanResponse = proposalsResponse.replace(/```json\n/, '').replace(/\n```$/, '');
        } else if (proposalsResponse.includes('```')) {
          cleanResponse = proposalsResponse.replace(/```\n/, '').replace(/\n```$/, '');
        }
        
        let proposals = JSON.parse(cleanResponse);
        console.log(`成功解析到${proposals.length}个方案`);
        
        // 确保每个方案都有唯一ID
        proposals.forEach((proposal, index) => {
          if (!proposal.proposalId) {
            proposal.proposalId = `proposal-${Date.now()}-${index}`;
          }
        });
        
        // 为每个方案生成最终提示词
        proposals = await generateFinalPromptsForProposals(proposals, productInfo);
        
        return proposals;
      } catch (parseError) {
        console.error('解析方案JSON失败:', parseError);
        console.error('原始响应内容:', proposalsResponse);
        
        // 创建基本的备用方案
        const fallbackProposals = [
          {
            proposalId: `fallback-${Date.now()}-1`,
            styleName: "线条艺术风格",
            styleDescription: "利用LED灯带线性特质创造视觉冲击力",
            position: "底部或侧边",
            background: "现代室内空间，如桑拿房、SPA中心或高端商业空间",
            featurePosition: "顶部水平排列",
            layout: "产品光线效果勾勒出建筑轮廓，形成强烈的几何线条感",
            backgroundDesc: "深色或中性色背景，突出灯带的光线线条和色彩",
            lightingRequirements: "强烈的灯带光线勾勒建筑线条，形成光影层次",
            textRequirements: "简洁现代字体，与线条风格呼应",
            colorTone: "冷色调与暖色对比，如蓝色灯光与原木色背景对比",
            posterSize: productInfo.posterSize || "16:9",
            overallStyle: "现代极简线条艺术风格",
            integrationElements: {
              lightIntegration: "灯带光线勾勒建筑线条，创造强烈视觉效果",
              installationContext: "灯带沿建筑结构边缘安装",
              visualHarmony: "灯光与建筑结构融为一体"
            },
            displayedText: {
              headline: productInfo.name,
              features: Array.isArray(productInfo.features) ? 
                productInfo.features.slice(0, 3) : 
                productInfo.features.split('\n').slice(0, 3),
              tagline: `线性光效，空间艺术`
            }
          },
          {
            proposalId: `fallback-${Date.now()}-2`,
            styleName: "现代简约风格",
            styleDescription: "以简洁线条和现代感设计展现产品特性",
            position: "中央位置",
            background: "简约现代商业环境",
            featurePosition: "底部水平排列",
            layout: "中心产品，底部文字说明",
            backgroundDesc: "简洁线条和明亮色彩的现代商业空间",
            lightingRequirements: "均匀照明，突出产品特色",
            textRequirements: "现代无衬线字体，简洁明了",
            colorTone: "主色调白色与蓝色，现代商业感",
            posterSize: productInfo.posterSize || "16:9",
            overallStyle: "现代专业商业风格",
            integrationElements: {
              lightIntegration: "产品光线与环境自然融合",
              installationContext: "专业商业安装展示",
              visualHarmony: "色彩与环境协调一致"
            },
            displayedText: {
              headline: productInfo.name,
              features: Array.isArray(productInfo.features) ? 
                productInfo.features.slice(0, 3) : 
                productInfo.features.split('\n').slice(0, 3),
              tagline: `${productInfo.targetAudience || "专业"}照明选择`
            }
          },
          {
            proposalId: `fallback-${Date.now()}-3`,
            styleName: "科技智能风格",
            styleDescription: "突出产品的高科技智能特性",
            position: "右侧三分之一区域",
            background: "高科技智能家居或办公环境",
            featurePosition: "左侧垂直排列",
            layout: "右侧产品，左侧文字说明",
            backgroundDesc: "未来感十足的智能环境，数字化元素点缀",
            lightingRequirements: "蓝色调光线，科技感十足",
            textRequirements: "科技感字体，简洁有力",
            colorTone: "蓝色与黑色主调，高科技氛围",
            posterSize: productInfo.posterSize || "16:9",
            overallStyle: "高科技智能风格",
            integrationElements: {
              lightIntegration: "产品光线呈现未来科技感",
              installationContext: "智能系统集成展示",
              visualHarmony: "科技感视觉统一"
            },
            displayedText: {
              headline: productInfo.name,
              features: Array.isArray(productInfo.features) ? 
                productInfo.features.slice(0, 3) : 
                productInfo.features.split('\n').slice(0, 3),
              tagline: `智能${productInfo.targetAudience || "照明"}解决方案`
            }
          }
        ];
        
        // 为备用方案生成最终提示词
        const processedProposals = await generateFinalPromptsForProposals(fallbackProposals, productInfo);
        
        console.log('使用备用方案:', processedProposals.length, '个方案');
        return processedProposals;
      }
    } else {
      // 纯文本请求
      const content = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseSchemaVersion: "v2"
        }
      };
      
      if (schema) {
        content.contents[0].parts.push({ schema_id: "schema" });
        content.schema = schema;
      }
      
      console.log('发送文本请求到Gemini...');
      const result = await model.generateContent(content);
      const response = result.response;
      const proposalsResponse = response.text();
      
      try {
        // 移除可能的Markdown代码块标记
        let cleanResponse = proposalsResponse;
        if (proposalsResponse.includes('```json')) {
          cleanResponse = proposalsResponse.replace(/```json\n/, '').replace(/\n```$/, '');
        } else if (proposalsResponse.includes('```')) {
          cleanResponse = proposalsResponse.replace(/```\n/, '').replace(/\n```$/, '');
        }
        
        let proposals = JSON.parse(cleanResponse);
        console.log(`成功解析到${proposals.length}个方案`);
        
        // 为每个方案生成最终提示词
        proposals = await generateFinalPromptsForProposals(proposals, productInfo);
        
        return proposals;
      } catch (parseError) {
        console.error('解析方案JSON失败:', parseError);
        throw new Error('无法解析AI返回的方案数据');
      }
    }
  } catch (error) {
    console.error('生成海报方案失败:', error.message);
    console.error('错误堆栈:', error.stack);
    throw error;
  }
};

/**
 * 为每个方案生成最终提示词
 * @param {Array} proposals - 方案数组
 * @param {object} productInfo - 产品信息
 * @returns {Promise<Array>} - 包含最终提示词的方案数组
 */
const generateFinalPromptsForProposals = async (proposals, productInfo) => {
  try {
    // 初始化文本模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 处理每个方案，添加最终提示词
    for (const proposal of proposals) {
      // 如果方案已经包含最终提示词，则跳过
      if (proposal.finalPrompt && proposal.finalPrompt.trim() !== '') {
        continue;
      }
      
      // 构造基本提示词基于方案中的数据
      let basePrompt = `一张"${productInfo.name}"商业海报。

产品位于海报${proposal.position}，保留图片原样，作为海报的主体。

海报的背景是：${proposal.background}。

主标题写着"${proposal.displayedText?.headline || productInfo.name}"。

产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(proposal.displayedText?.features) ? proposal.displayedText.features.join('、') : (productInfo.features instanceof Array ? productInfo.features.join('、') : productInfo.features)}"。

标语文字写着"${proposal.displayedText?.tagline || `${productInfo.targetAudience || "专业"}照明选择`}"。

整体布局：${proposal.layout}。

背景描述：${proposal.backgroundDesc}。

光影要求：${proposal.lightingRequirements}。

文字要求：${proposal.textRequirements}。

色调要求：${proposal.colorTone}。

海报尺寸：${proposal.posterSize}。

海报整体风格：${proposal.overallStyle}。

产品与环境协调：
- 光线融合：${proposal.integrationElements?.lightIntegration || '未指定'}
- 安装位置：${proposal.integrationElements?.installationContext || '未指定'}
- 视觉和谐：${proposal.integrationElements?.visualHarmony || '未指定'}

左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;

      // 构建元提示词，指导AI如何优化提示词
      const metaPrompt = `我正在为LED灯带产品开发一个海报生成系统。请根据我提供的基础提示词和产品信息，优化提示词内容，使其更适合生成高质量的LED产品营销海报。

基础提示词：
${basePrompt}

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"
${productInfo.sceneDescription ? `* 使用场景详细描述: "${productInfo.sceneDescription}"` : ''}

优化要求：
1. 增强提示词中的视觉细节描述，如光影效果、色彩表现、照明氛围等
2. 强化产品特点与具体应用场景的关联，使画面更具说服力
3. 添加专业的LED照明术语，突出产品的技术优势
4. 确保提示词长度适中，重点突出
5. 保留元素顺序和结构
6. 必须严格使用英文引号(")而非中文引号("")来包围所有文字内容
7. 必须严格保留以下关键元素，不得修改：
   - 主标题必须使用格式：写着"${proposal.displayedText?.headline || productInfo.name}"，不要添加任何单引号
   - 产品特点文字必须使用格式：写着"${Array.isArray(proposal.displayedText?.features) ? proposal.displayedText.features.join('、') : (productInfo.features instanceof Array ? productInfo.features.join('、') : productInfo.features)}"，不要添加任何单引号
   - 标语文字必须使用格式：写着"${proposal.displayedText?.tagline || `${productInfo.targetAudience || "专业"}照明选择`}"，不要添加任何单引号
   - 左上角品牌LOGO必须使用格式：写着"RS-LED"，不要添加任何单引号
   - 右下角网址必须使用格式：写着"www.rs-led.com"，不要添加任何单引号
   - 左下角的公司二维码必须保留
8. 非常重要：确保每种文字元素（主标题、产品特点、标语）的写着"XXX"格式在最终提示词中只出现一次，不要使用任何单引号
9. 重要：保留图片原样作为海报主体，不要描述前景内容。图片将由用户上传提供，不需要生成模型创建。

请直接返回优化后的完整提示词，不要包含任何解释或其他内容。所有引号都必须使用英文引号。`;

    // 调用API生成内容
      console.log(`为方案${proposal.proposalId}生成最终提示词...`);
    const result = await model.generateContent(metaPrompt);
    
      // 提取返回的文本
      let finalPrompt = result.response.text().trim();
      console.log(`方案${proposal.proposalId}的最终提示词生成完成`);
      
      // 检查关键元素是否存在，如果不存在则添加
      const keyElements = [
        { key: `"${productInfo.name}"`, fallback: `一张"${productInfo.name}"商业海报` },
        { key: `写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"`, fallback: `产品特点文字写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"` },
        { key: `写着"RS-LED"`, fallback: `左上角品牌 LOGO 写着"RS-LED"` },
        { key: `写着"www.rs-led.com"`, fallback: `右下角公司网址写着"www.rs-led.com"` },
        { key: "左下角是很小的公司二维码", fallback: "左下角是很小的公司二维码" }
      ];
      
      // 如果有displayedText字段，添加对应检查
      if (proposal.displayedText) {
        if (proposal.displayedText.headline) {
          keyElements.push({
            key: `写着"${proposal.displayedText.headline}"`,
            fallback: `主标题写着"${proposal.displayedText.headline}"`
          });
        }
        if (proposal.displayedText.tagline) {
          keyElements.push({
            key: `写着"${proposal.displayedText.tagline}"`,
            fallback: `标语文字写着"${proposal.displayedText.tagline}"`
          });
        }
        if (proposal.displayedText.features && Array.isArray(proposal.displayedText.features)) {
          const featuresText = proposal.displayedText.features.join('、');
          keyElements.push({
            key: `写着"${featuresText}"`,
            fallback: `产品特点文字写着"${featuresText}"`
          });
        }
      }
      
      // 对每个关键元素进行检查
      keyElements.forEach(element => {
        if (!finalPrompt.includes(element.key)) {
          console.warn(`警告：方案${proposal.proposalId}的提示词缺少关键元素: ${element.key}`);
          // 如果是文本开头缺少产品名称，进行添加
          if (element.key.includes(productInfo.name) && !finalPrompt.startsWith('一张')) {
            finalPrompt = `一张"${productInfo.name}"商业海报。\n\n${finalPrompt}`;
          } 
          // 如果是结尾缺少LOGO等信息，进行添加
          else if (element.key.includes("RS-LED") || element.key.includes("www.rs-led.com") || element.key.includes("二维码")) {
            finalPrompt = `${finalPrompt}\n\n${element.fallback}`;
          }
        }
      });
      
      // 将最终提示词添加到方案中
      proposal.finalPrompt = finalPrompt;
    }
    
    return proposals;
  } catch (error) {
    console.error('生成最终提示词失败:', error);
    return proposals; // 返回原始方案，确保流程不中断
  }
};

/**
 * 准备图片数据用于API调用
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<Object>} - 包含mime_type和base64数据
 */
const prepareImageData = async (imageUrl) => {
  if (!imageUrl) {
    throw new Error('未提供图片URL');
  }
  
  try {
    // 本地文件路径处理
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/public/')) {
      const localPath = path.join(__dirname, '../../..', imageUrl);
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
};

/**
 * 基于选择的方案生成最终提示词
 * @param {object} proposal - 选择的方案
 * @param {object} productInfo - 产品信息
 * @returns {Promise<string>} - 最终提示词
 */
const generateFinalPromptFromProposal = async (proposal, productInfo) => {
  try {
    console.log('===== 开始基于方案生成最终提示词 =====');
    
    // 构造基本提示词基于方案中的数据
    let basePrompt = `一张"${productInfo.name}"商业海报。

产品位于海报${proposal.position}，保留图片原样，作为海报的主体。

海报的背景是：${proposal.background}。

主标题写着"${proposal.displayedText.headline || productInfo.name}"。

产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(proposal.displayedText.features) ? proposal.displayedText.features.join('、') : proposal.displayedText.features}"。

标语文字写着"${proposal.displayedText.tagline}"。

整体布局：${proposal.layout}。

背景描述：${proposal.backgroundDesc}。

光影要求：${proposal.lightingRequirements}。

文字要求：${proposal.textRequirements}。

色调要求：${proposal.colorTone}。

海报尺寸：${proposal.posterSize}。

海报整体风格：${proposal.overallStyle}。

产品与环境协调：
- 光线融合：${proposal.integrationElements.lightIntegration}
- 安装位置：${proposal.integrationElements.installationContext || '未指定'}
- 视觉和谐：${proposal.integrationElements.visualHarmony || '未指定'}

左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;

    // 初始化文本模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 构建元提示词，指导AI如何优化提示词
    const metaPrompt = `我正在为LED灯带产品开发一个海报生成系统。请根据我提供的基础提示词和产品信息，优化提示词内容，使其更适合生成高质量的LED产品营销海报。

基础提示词：
${basePrompt}

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"
${productInfo.sceneDescription ? `* 使用场景详细描述: "${productInfo.sceneDescription}"` : ''}

优化要求：
1. 增强提示词中的视觉细节描述，如光影效果、色彩表现、照明氛围等
2. 强化产品特点与具体应用场景的关联，使画面更具说服力
3. 添加专业的LED照明术语，突出产品的技术优势
4. 确保提示词长度适中，重点突出
5. 保留元素顺序和结构
6. 必须严格使用英文引号(")而非中文引号("")来包围所有文字内容
7. 必须严格保留以下关键元素，不得修改：
   - 主标题必须使用格式：写着"${proposal.displayedText.headline || productInfo.name}"，不要添加任何单引号
   - 产品特点文字必须使用格式：写着"${Array.isArray(proposal.displayedText.features) ? proposal.displayedText.features.join('、') : proposal.displayedText.features}"，不要添加任何单引号
   - 标语文字必须使用格式：写着"${proposal.displayedText.tagline}"，不要添加任何单引号
   - 左上角品牌LOGO必须使用格式：写着"RS-LED"，不要添加任何单引号
   - 右下角网址必须使用格式：写着"www.rs-led.com"，不要添加任何单引号
   - 左下角的公司二维码必须保留
8. 非常重要：确保每种文字元素（主标题、产品特点、标语）的写着"XXX"格式在最终提示词中只出现一次，不要使用任何单引号
9. 重要：保留图片原样作为海报主体，不要描述前景内容。图片将由用户上传提供，不需要生成模型创建。

请直接返回优化后的完整提示词，不要包含任何解释或其他内容。所有引号都必须使用英文引号。`;

    // 调用API生成内容
    console.log('向Gemini发送最终提示词生成请求...');
    const result = await model.generateContent(metaPrompt);
    
    // 提取返回的文本
    let finalPrompt = result.response.text().trim();
    console.log('Gemini返回的最终提示词:', finalPrompt);
    
    // 检查关键元素是否存在，如果不存在则添加
    const keyElements = [
      { key: `"${productInfo.name}"`, fallback: `一张"${productInfo.name}"商业海报` },
      { key: `写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"`, fallback: `产品特点文字写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"` },
      { key: `写着"RS-LED"`, fallback: `左上角品牌 LOGO 写着"RS-LED"` },
      { key: `写着"www.rs-led.com"`, fallback: `右下角公司网址写着"www.rs-led.com"` },
      { key: "左下角是很小的公司二维码", fallback: "左下角是很小的公司二维码" }
    ];
    
    // 如果有displayedText字段，添加对应检查
    if (proposal.displayedText) {
      if (proposal.displayedText.headline) {
        keyElements.push({
          key: `写着"${proposal.displayedText.headline}"`,
          fallback: `主标题写着"${proposal.displayedText.headline}"`
        });
      }
      if (proposal.displayedText.tagline) {
        keyElements.push({
          key: `写着"${proposal.displayedText.tagline}"`,
          fallback: `标语文字写着"${proposal.displayedText.tagline}"`
        });
      }
      if (proposal.displayedText.features && Array.isArray(proposal.displayedText.features)) {
        const featuresText = proposal.displayedText.features.join('、');
        keyElements.push({
          key: `写着"${featuresText}"`,
          fallback: `产品特点文字写着"${featuresText}"`
        });
      }
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
            // 检查是否已经存在"写着"的格式
            if (!finalPrompt.includes("写着")) {
              const beforeText = finalPrompt.substring(0, position + 6);
              const afterText = finalPrompt.substring(position + 6);
              finalPrompt = `${beforeText}文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"${afterText}`;
            }
          } else {
            // 如果找不到插入点，追加到末尾
            finalPrompt += `\n\n产品特点文字位于${proposal.featurePosition}，写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。`;
          }
        }
        // 如果是主标题或标语缺失，尝试插入
        else if (proposal.displayedText) {
          // 添加主标题
          if (element.key.includes(proposal.displayedText.headline) && !finalPrompt.includes("主标题写着")) {
            finalPrompt += `\n\n主标题写着"${proposal.displayedText.headline}"。`;
          }
          // 添加标语
          if (element.key.includes(proposal.displayedText.tagline) && !finalPrompt.includes("标语文字写着")) {
            finalPrompt += `\n\n标语文字写着"${proposal.displayedText.tagline}"。`;
          }
          // 添加特点
          if (element.key.includes('产品特点') && proposal.displayedText.features && Array.isArray(proposal.displayedText.features) && !finalPrompt.includes("产品特点文字写着")) {
            const featuresText = proposal.displayedText.features.join('、');
            finalPrompt += `\n\n产品特点文字写着"${featuresText}"。`;
          }
        }
      }
    });
    
    // 确保尺寸比例要求已包含
    if (!finalPrompt.includes("25-35%") && !finalPrompt.includes("25%到35%")) {
      finalPrompt += "\n\n产品图片仅占画面25-35%的面积，确保背景环境清晰可见。";
    }
    
    // 检查海报尺寸
    const sizeFormats = ["16:9", "9:16", "1:1"];
    const hasSizeFormat = sizeFormats.some(format => finalPrompt.includes(format));
    if (!hasSizeFormat) {
      finalPrompt += `\n\n海报尺寸为${proposal.posterSize || "16:9"}格式。`;
    }
    
    console.log('Gemini返回的最终提示词(检查后):', finalPrompt);
    
    return finalPrompt;
  } catch (error) {
    console.error('生成最终提示词失败:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 如果出错，返回基本的提示词
    return `一张"${productInfo.name}"商业海报。保留图片原样，作为海报的主体。主标题写着"${productInfo.name}"。产品特点文字写着"${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"。左上角品牌 LOGO 写着"RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
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