const { Level } = require('level');
const path = require('path');
const fs = require('fs');

// 确保数据库目录存在
const dbPath = path.join(__dirname, '../../../data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
  console.log(`创建数据库目录: ${dbPath}`);
}

// 创建数据库子目录
const createSubDB = (name) => {
  const subPath = path.join(dbPath, name);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
    console.log(`创建数据库子目录: ${subPath}`);
  }
  
  try {
    const db = new Level(subPath, { 
      valueEncoding: 'json',
      // 添加错误处理选项
      createIfMissing: true,
      errorIfExists: false,
      // 增加读写压缩性能
      compression: true
    });
    console.log(`成功初始化数据库: ${name}`);
    return db;
  } catch (error) {
    console.error(`初始化数据库失败: ${name}`, error);
    // 创建一个内存版备用数据库，防止系统崩溃
    console.warn(`将为 ${name} 创建内存备用数据库`);
    const memDB = {
      // 内存存储
      storage: new Map(),
      // 模拟LevelDB API
      async put(key, value) {
        this.storage.set(key, value);
        return value;
      },
      async get(key) {
        const value = this.storage.get(key);
        if (value === undefined) {
          const error = new Error('NotFound');
          error.notFound = true;
          error.status = 404;
          error.code = 'LEVEL_NOT_FOUND';
          throw error;
        }
        return value;
      },
      async del(key) {
        return this.storage.delete(key);
      }
    };
    return memDB;
  }
};

// 初始化数据库
const db = {
  posters: createSubDB('posters'),    // 存储生成的海报信息
  images: createSubDB('images'),      // 存储用户上传的图片信息
  prompts: createSubDB('prompts'),    // 存储系统预设和自定义提示词
  users: createSubDB('users'),        // 存储用户信息
  analytics: createSubDB('analytics') // 存储使用统计和分析数据
};

console.log('数据库系统初始化完成');

module.exports = db; 