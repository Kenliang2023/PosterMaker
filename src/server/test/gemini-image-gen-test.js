const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateImage() {
  const contents = "Hi, can you create a 3d rendered image of a pig " +
                  "with wings and a top hat flying over a happy " +
                  "futuristic scifi city with lots of greenery?";

  // Set responseModalities to include "Image" so the model can generate an image
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
        responseModalities: ['Text', 'Image']
    },
  });

  try {
    console.log("开始生成图像...");
    console.log("使用提示词:", contents);
    console.log("使用模型:", "gemini-2.0-flash-exp-image-generation");
    console.log("API密钥:", process.env.GEMINI_API_KEY ? "已设置" : "未设置");
    
    const response = await model.generateContent(contents);
    console.log("API调用成功！");
    
    for (const part of response.response.candidates[0].content.parts) {
      // Based on the part type, either show the text or save the image
      if (part.text) {
        console.log("返回文本:", part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        const outputFile = 'gemini-native-image.png'; 
        fs.writeFileSync(outputFile, buffer);
        console.log(`图像已保存为: ${outputFile}`);
        console.log(`图像大小: ${Math.round(buffer.length / 1024)}KB`);
      }
    }
  } catch (error) {
    console.error("图像生成错误:", error.message);
    console.error("详细错误信息:", error);
  }
}

generateImage()
  .then(() => {
    console.log("测试完成");
  })
  .catch(err => {
    console.error("测试执行出错:", err);
    process.exit(1);
  }); 