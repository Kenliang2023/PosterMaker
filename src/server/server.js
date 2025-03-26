const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
require('dotenv').config();

// 加载配置
const config = require('./config');
config.initDirs(); // 初始化所有目录

// 初始化数据库连接
const db = require('./db');

// 创建Express应用
const app = express();
const PORT = config.PORT;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// 配置静态文件服务
app.use('/uploads', express.static(config.UPLOADS_DIR));
app.use('/public', express.static(config.PUBLIC_DIR));

// API路由
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 静态文件服务 - 前端应用
if (fs.existsSync(config.DIST_DIR)) {
  app.use(express.static(config.DIST_DIR));
  
  // 所有其他请求返回Vue应用
  app.get('*', (req, res) => {
    res.sendFile(path.join(config.DIST_DIR, 'index.html'));
  });
} else {
  console.warn('警告: dist目录不存在，前端资源可能未构建');
  // 开发环境下，返回一个临时页面
  app.get('*', (req, res) => {
    res.send('应用正在构建中，请稍后刷新页面...');
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: config.isProduction ? undefined : err.message
  });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('环境:', config.NODE_ENV);
  console.log('存储目录:', config.STORAGE_DIR);
  
  // 初始化默认模板
  try {
    // 检查是否已经初始化
    let initStatus;
    let needInit = false;
    
    try {
      initStatus = await db.prompts.get('prompt-template:init-status');
      console.log('模板初始化状态:', initStatus.initialized ? '已初始化' : '未初始化');
    } catch (error) {
      if (error.notFound) {
        console.log('未找到模板初始化状态，将进行初始化');
        needInit = true;
      } else {
        console.error('检查模板初始化状态时出错:', error.message);
        // 继续执行，默认需要初始化
        needInit = true;
      }
    }

    if (needInit || (initStatus && !initStatus.initialized)) {
      console.log('开始初始化默认模板...');
      
      // 初始化产品海报模板
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
          score: 5,
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
          score: 5,
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
          score: 5,
          usageCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      let successCount = 0;
      // 保存默认模板
      for (const template of defaultTemplates) {
        try {
          await db.prompts.put(`product-template:${template.templateId}`, template);
          successCount++;
        } catch (error) {
          console.error(`保存模板失败 (${template.templateId}):`, error.message);
        }
      }
      
      // 更新初始化状态
      try {
        await db.prompts.put('prompt-template:init-status', { 
          initialized: true,
          count: successCount,
          timestamp: new Date().toISOString()
        });
        console.log(`默认模板初始化完成，成功添加${successCount}个模板`);
      } catch (error) {
        console.error('更新模板初始化状态失败:', error.message);
      }
    } else {
      console.log('默认模板已初始化，跳过');
    }
  } catch (error) {
    console.error('初始化默认模板过程中发生错误:', error);
    // 模板初始化失败不应该影响服务器启动
    console.log('继续启动服务器...');
  }
  
  console.log('服务器初始化完成，等待接收请求...');
});

module.exports = app; 