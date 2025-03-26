const Database = require('better-sqlite3');
const { DB_CONFIG, ensureDir, DB_DIR, VERBOSE } = require('../config');

// 确保数据库目录存在
const dbDir = ensureDir(DB_DIR);

// 初始化数据库连接
console.log('数据库文件路径:', DB_CONFIG.file);

let db;
try {
  db = new Database(DB_CONFIG.file, {
    verbose: DB_CONFIG.verbose ? console.log : null
  });
  console.log('数据库连接成功');
} catch (error) {
  console.error('数据库连接失败:', error.message);
  console.warn('将使用内存数据库作为备用');
  // 使用内存数据库作为备用
  db = new Database(':memory:', {
    verbose: DB_CONFIG.verbose ? console.log : null
  });
}

// 创建数据表
const initDatabase = () => {
  const tables = {
    posters: `
      CREATE TABLE IF NOT EXISTS posters (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    images: `
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    prompts: `
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    analytics: `
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
  };

  try {
    for (const [tableName, schema] of Object.entries(tables)) {
      db.exec(schema);
      if (VERBOSE) {
        console.log(`确保数据表存在: ${tableName}`);
      }
    }
    return true;
  } catch (error) {
    console.error('初始化数据表失败:', error.message);
    return false;
  }
};

// 初始化数据库表
const dbInitialized = initDatabase();
if (!dbInitialized) {
  console.warn('数据库初始化失败，应用可能无法正常工作');
}

// 创建数据库操作接口
const createDbInterface = (tableName) => {
  const statements = {
    insert: db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`),
    get: db.prepare(`SELECT data FROM ${tableName} WHERE id = ?`),
    delete: db.prepare(`DELETE FROM ${tableName} WHERE id = ?`),
    all: db.prepare(`SELECT id, data FROM ${tableName}`)
  };

  return {
    async put(key, value) {
      try {
        statements.insert.run(key, JSON.stringify(value));
        return value;
      } catch (error) {
        console.error(`数据库写入错误 (${tableName}):`, error);
        throw error;
      }
    },

    async get(key) {
      try {
        const row = statements.get.get(key);
        if (!row) {
          const error = new Error('NotFound');
          error.notFound = true;
          error.status = 404;
          throw error;
        }
        return JSON.parse(row.data);
      } catch (error) {
        if (error.message === 'NotFound' || error.notFound) {
          const notFoundError = new Error('NotFound');
          notFoundError.notFound = true;
          notFoundError.status = 404;
          throw notFoundError;
        }
        console.error(`数据库读取错误 (${tableName}):`, error);
        throw error;
      }
    },

    async del(key) {
      try {
        const result = statements.delete.run(key);
        if (result.changes === 0) {
          const error = new Error('NotFound');
          error.notFound = true;
          error.status = 404;
          throw error;
        }
      } catch (error) {
        console.error(`数据库删除错误 (${tableName}):`, error);
        throw error;
      }
    },

    async *iterator() {
      try {
        const rows = statements.all.all();
        for (const row of rows) {
          yield {
            key: row.id,
            value: JSON.parse(row.data)
          };
        }
      } catch (error) {
        console.error(`数据库遍历错误 (${tableName}):`, error);
        throw error;
      }
    }
  };
};

// 导出数据库接口
const dbInterface = {
  posters: createDbInterface('posters'),
  images: createDbInterface('images'),
  prompts: createDbInterface('prompts'),
  users: createDbInterface('users'),
  analytics: createDbInterface('analytics')
};

console.log('数据库系统初始化完成');

module.exports = dbInterface; 