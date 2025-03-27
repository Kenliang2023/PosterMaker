const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 确保环境变量正确设置
if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 未找到Supabase配置。请确保SUPABASE_URL和SUPABASE_KEY环境变量已设置。');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 测试数据库连接
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('healthcheck').select('*').limit(1);
    if (error) throw error;
    console.log('Supabase连接成功!');
  } catch (error) {
    console.warn('Supabase连接测试失败:', error.message);
    console.warn('这可能是因为healthcheck表不存在，或者其他连接问题。');
    console.warn('将继续启动应用，但某些功能可能不可用。');
  }
};

// 封装Supabase操作以模拟原先的LevelDB接口
const createDBInterface = (tableName) => {
  return {
    async put(key, value) {
      // 如果键存在，则更新；否则插入
      const { data, error } = await supabase
        .from(tableName)
        .upsert({ 
          id: key, 
          data: value,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return value;
    },
    
    async get(key) {
      const { data, error } = await supabase
        .from(tableName)
        .select('data')
        .eq('id', key)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // PostgreSQL "not found" error
          const notFoundError = new Error('NotFound');
          notFoundError.notFound = true;
          notFoundError.status = 404;
          notFoundError.code = 'LEVEL_NOT_FOUND';
          throw notFoundError;
        }
        throw error;
      }
      
      return data.data;
    },
    
    async del(key) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', key);
        
      if (error) throw error;
      return true;
    }
  };
};

// 初始化数据库接口
const db = {
  posters: createDBInterface('posters'),
  images: createDBInterface('images'),
  prompts: createDBInterface('prompts'),
  users: createDBInterface('users'),
  analytics: createDBInterface('analytics')
};

// 导出模块
console.log('Supabase数据库系统初始化完成');
testConnection();

module.exports = db; 