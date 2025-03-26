/**
 * 统一的环境配置模块
 * 根据不同环境提供不同的配置
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

// 确定当前环境
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isRenderEnv = process.env.RENDER === 'true';

// 根目录
const ROOT_DIR = path.resolve(__dirname, '../../');

// 存储目录配置
const getStorageDir = () => {
  // Render环境使用/tmp目录
  if (isRenderEnv) {
    return '/tmp';
  }
  
  // 生产环境但非Render
  if (isProduction && !isRenderEnv) {
    return process.env.STORAGE_DIR || path.join(ROOT_DIR, 'data');
  }
  
  // 开发环境
  return path.join(ROOT_DIR, 'data');
};

// 存储路径
const STORAGE_DIR = getStorageDir();

// 各种目录路径
const DB_DIR = path.join(STORAGE_DIR, 'db');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const POSTERS_DIR = path.join(UPLOADS_DIR, 'posters');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// 确保目录存在
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`创建目录成功: ${dirPath}`);
    } catch (error) {
      console.error(`创建目录失败: ${dirPath}`, error.message);
      // 如果是权限问题，尝试使用系统临时目录
      if (error.code === 'EACCES' && dirPath.startsWith(ROOT_DIR)) {
        const tmpDir = path.join(os.tmpdir(), 'postermaker', path.relative(ROOT_DIR, dirPath));
        console.warn(`尝试使用系统临时目录: ${tmpDir}`);
        try {
          fs.mkdirSync(tmpDir, { recursive: true });
          return tmpDir;
        } catch (tmpError) {
          console.error(`无法创建临时目录: ${tmpDir}`, tmpError.message);
        }
      }
    }
  }
  return dirPath;
};

// 初始化所有需要的目录
const initDirs = () => {
  try {
    console.log('====== 环境信息 ======');
    console.log(`NODE_ENV: ${NODE_ENV}`);
    console.log(`是否生产环境: ${isProduction}`);
    console.log(`是否Render环境: ${isRenderEnv}`);
    console.log(`存储根目录: ${STORAGE_DIR}`);
    console.log('=====================');
    
    ensureDir(DB_DIR);
    ensureDir(UPLOADS_DIR);
    ensureDir(IMAGES_DIR);
    ensureDir(POSTERS_DIR);
    
    // 测试目录可写性
    const testFile = path.join(DB_DIR, '.write_test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('存储目录可写性测试通过');
    } catch (error) {
      console.error('警告: 存储目录可能不可写!', error.message);
    }
  } catch (error) {
    console.error('初始化目录失败:', error);
    console.error('应用可能无法正常运行，请检查权限和路径配置');
  }
};

// 数据库配置
const DB_CONFIG = {
  file: path.join(DB_DIR, 'postermaker.sqlite'),
  verbose: process.env.DB_VERBOSE === 'true' || (!isProduction && process.env.VERBOSE === 'true')
};

// 导出配置
module.exports = {
  // 环境变量
  NODE_ENV,
  isProduction,
  isRenderEnv,
  
  // 目录路径
  ROOT_DIR,
  STORAGE_DIR,
  DB_DIR,
  UPLOADS_DIR,
  IMAGES_DIR,
  POSTERS_DIR,
  PUBLIC_DIR,
  DIST_DIR,
  
  // 数据库配置
  DB_CONFIG,
  
  // 工具函数
  ensureDir,
  initDirs,
  
  // 服务器配置
  PORT: process.env.PORT || 3001,
  
  // API密钥
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_URL: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent',
  
  // 是否输出详细日志
  VERBOSE: process.env.VERBOSE === 'true' || !isProduction
}; 