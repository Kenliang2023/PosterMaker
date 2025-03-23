const levelup = require('levelup');
const leveldown = require('leveldown');
const sublevel = require('level-sublevel');
const path = require('path');
require('dotenv').config();

// 数据库路径
const dbPath = path.resolve(process.env.DB_PATH || './data');

// 创建并配置数据库
function createDatabase() {
  try {
    // 创建基础数据库
    const db = levelup(leveldown(dbPath));
    
    // 使用sublevel创建命名空间
    const subDb = sublevel(db);
    
    // 创建各个子数据库
    const users = subDb.sublevel('users');
    const images = subDb.sublevel('images');
    const posters = subDb.sublevel('posters');
    const prompts = subDb.sublevel('prompts');
    const analytics = subDb.sublevel('analytics');
    
    console.log('数据库连接成功');
    
    return {
      db,
      users,
      images,
      posters, 
      prompts,
      analytics
    };
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}

// 导出数据库实例
const database = createDatabase();
module.exports = database; 