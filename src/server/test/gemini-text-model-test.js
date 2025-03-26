// gemini-text-model-test.js
// 测试Gemini文本模型API调用

// 导入依赖
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: './.env' });

// 从环境变量获取API密钥
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("错误：未设置GEMINI_API_KEY环境变量");
  process.exit(1);
}

async function testGeminiTextModel() {
  try {
    console.log("开始测试Gemini文本模型API...");
    
    // 初始化Gemini API客户端
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 获取文本生成模型实例
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 测试提示词
    const prompt = "用简短的话解释什么是LED灯带";
    
    console.log(`发送提示词: "${prompt}"`);
    
    // 调用API生成内容
    const result = await model.generateContent(prompt);
    
    // 输出结果
    console.log("\n=== API响应结果 ===");
    console.log(result.response.text());
    console.log("\n=== 测试完成 ===");
    
    return result.response.text();
  } catch (error) {
    console.error("API调用失败:", error.message);
    if (error.stack) {
      console.error("错误堆栈:", error.stack);
    }
    throw error;
  }
}

// 执行测试
testGeminiTextModel()
  .then(() => {
    console.log("Gemini文本API测试成功完成");
  })
  .catch((err) => {
    console.error("Gemini文本API测试失败:", err);
    process.exit(1);
  }); 