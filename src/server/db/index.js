const level = require('level');
const path = require('path');
const fs = require('fs');

// 确保数据库目录存在
const dbPath = path.join(__dirname, '../../../data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// 创建数据库子目录
const createSubDB = (name) => {
  const subPath = path.join(dbPath, name);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
  }
  return level(subPath, { valueEncoding: 'json' });
};

// 初始化数据库
const db = {
  posters: createSubDB('posters'),    // 存储生成的海报信息
  images: createSubDB('images'),      // 存储用户上传的图片信息
  prompts: createSubDB('prompts'),    // 存储系统预设和自定义提示词
  users: createSubDB('users'),        // 存储用户信息
  analytics: createSubDB('analytics') // 存储使用统计和分析数据
};

module.exports = db; 