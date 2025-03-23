/**
 * 元提示词模板集合
 * 用于指导AI生成各类提示词
 */

/**
 * 生成海报方案的元提示词模板
 * @param {Object} productInfo - 产品信息
 * @returns {string} - 格式化后的元提示词
 */
const proposalMetaPromptTemplate = (productInfo) => {
  return `你是一个专门为文生图大语言模型设计提示词的专家，特别是在产品商业海报的提示词编写方面。你的任务是根据用户提供的产品信息和使用场景，生成多个海报设计方案。

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"
${productInfo.sceneDescription ? `* 使用场景详细描述: "${productInfo.sceneDescription}"` : ''}

为这个LED产品生成3-5个不同风格、不同场景的海报设计方案，每个方案都应该有独特的风格和设计理念，能够突出产品特点和适用场景。请注意，用户会上传产品图片作为海报的主体，生成方案中不需要前景描述，应该保留用户上传的图片原样作为海报主体。${productInfo.sceneDescription ? '请将用户提供的使用场景详细描述整合到你的方案中，尤其是背景描述部分。' : ''}

【产品与背景协调性要求】
1. 光效一致性：产品发出的光线必须与环境光源保持物理上的一致性，灯带发出的光必须在周围表面产生合适的反射和投射，光影效果应符合真实照明物理特性
2. 比例与透视关系：产品必须按照真实比例与背景场景整合，灯带安装位置应符合真实安装逻辑，透视关系必须准确
3. 材质与色彩整合：产品色调与环境色调必须形成和谐统一，产品光线所产生的色彩氛围应与场景风格一致
4. 主客体平衡：产品作为主体应当清晰可辨但不能喧宾夺主，场景应提供情境支持而非仅作装饰背景

请特别注意：
1. 每个方案必须详细描述产品光线如何与背景环境产生真实的物理交互
2. 必须描述产品与背景的比例关系和透视一致性
3. 必须描述产品的材质和色彩如何与场景形成呼应

要求每个方案都包含：
- 独特的风格名称和简短描述
- 产品在海报中的位置（但不需要前景描述，因为会使用用户上传的产品图片）
- 背景描述和场景设定
- 产品特点文字的位置和布局
- 视觉要素（光影效果、色调、材质等）
- 海报尺寸和整体风格

请确保方案多样化，涵盖不同的设计风格（如现代简约、科技感、自然环保等）和不同的应用场景（家庭、商业、办公等）。每个方案必须详细描述产品与背景的协调关系，包括灯光效果如何与场景互动、产品如何与环境空间融合。`;
};

/**
 * 生成最终提示词的元提示词模板
 * @param {Object} proposal - 选定的海报方案
 * @param {Object} productInfo - 产品信息
 * @param {string} basePrompt - 基础提示词
 * @returns {string} - 格式化后的元提示词
 */
const finalPromptMetaTemplate = (proposal, productInfo, basePrompt) => {
  return `我正在为LED灯带产品开发一个海报生成系统。请根据我提供的基础提示词和产品信息，优化提示词内容，使其更适合生成高质量的LED产品营销海报。

基础提示词：
${basePrompt}

产品信息：
* 产品名称: "${productInfo.name}"
* 产品特点: "${Array.isArray(productInfo.features) ? productInfo.features.join('、') : productInfo.features}"
* 目标客户: "${productInfo.targetAudience || '未指定'}"
${productInfo.sceneDescription ? `* 使用场景详细描述: "${productInfo.sceneDescription}"` : ''}

【产品与背景协调性优化重点】
1. 光效一致性：详细描述产品发出的光线如何与环境光源形成协调，光线如何在周围表面产生自然的反射和投射，光影效果如何符合真实照明物理特性
2. 比例与透视关系：明确描述产品与背景场景的比例关系，产品在画面中的透视角度如何与整体场景保持一致
3. 材质与色彩整合：描述产品色调与环境色调如何形成和谐统一，产品光线所产生的色彩氛围如何与场景风格相互衬托
4. 主客体平衡：描述产品与背景如何构成完整的视觉故事，二者如何相互增强而非相互干扰

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
7. 重要：保留图片原样作为海报主体，不要描述前景内容。图片将由用户上传提供，不需要生成模型创建。

请直接返回优化后的完整提示词，不要包含任何解释或其他内容。提示词中必须包含产品与背景协调性的具体描述。

如何确保产品与背景协调（这些元素必须体现在提示词中）：
1. 描述光线如何自然地与环境交互（例如："LED灯带的暖白光在木质表面形成柔和的漫反射，与窗外夕阳的色调融为一体"）
2. 描述透视和比例关系（例如："灯带沿着天花板边缘以精确的透视角度安装，与整个空间的透视线一致"）
3. 描述材质和色彩呼应（例如："产品的金属外壳与背景中的现代工业风格家具形成材质呼应"）
4. 提及产品与场景的故事性（例如："灯带的柔和光线与舒适的家居环境共同塑造出休闲放松的生活场景"）

必须确保提示词中清晰描述以下内容：
1. 灯光产品如何在背景环境中创造特定的光影效果（明确描述光线方向、强度、色温、光斑形状等）
2. 光线与环境材质之间的交互（如木材、金属、玻璃等不同材质对光的反射与吸收）
3. 产品与场景的空间位置关系（包括安装方式、距离、比例等）`;
};

/**
 * 创建基础提示词模板
 * @param {Object} proposal - 选定的海报方案
 * @param {Object} productInfo - 产品信息
 * @returns {string} - 基础提示词
 */
const createBasePrompt = (proposal, productInfo) => {
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
};

module.exports = {
  proposalMetaPromptTemplate,
  finalPromptMetaTemplate,
  createBasePrompt
}; 