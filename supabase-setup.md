# Supabase 设置指南

本文档指导您如何为PosterMaker项目设置Supabase数据库和存储。

## 步骤1: 创建Supabase项目

1. 访问 [Supabase](https://supabase.com/) 并登录您的账户
2. 点击 "New Project" 按钮
3. 填写项目详情并选择靠近您用户的地区
4. 等待数据库创建完成

## 步骤2: 获取API凭证

1. 在项目设置中找到 "API" 部分
2. 记录下 `URL` 和 `anon public` 密钥
3. 将这些信息添加到项目的 `.env` 文件中:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

## 步骤3: 创建数据库表

在Supabase SQL编辑器中执行以下SQL语句创建必要的表:

```sql
-- 创建海报表
CREATE TABLE posters (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建图片信息表
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建提示词表
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建分析数据表
CREATE TABLE analytics (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 可选：创建健康检查表
CREATE TABLE healthcheck (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
INSERT INTO healthcheck (status) VALUES ('ok');
```

## 步骤4: 设置存储桶

1. 在Supabase控制台中，导航到 "Storage" 部分
2. 点击 "Create new bucket" 按钮
3. 创建名为 `uploads` 的桶
4. 在桶设置中，选择 "Public" 访问权限，以便能够公开访问上传的图片

## 步骤5: 设置存储权限

在存储桶的 "Policies" 选项卡中，添加以下权限策略:

1. 对于匿名用户添加读取权限:
   - 点击 "Add Policy" 按钮
   - 选择预定义模板 "For anon or authenticated access"
   - 策略类型选择 "SELECT" (读取)
   - 保存策略

2. 对于匿名用户添加上传权限:
   - 点击 "Add Policy" 按钮 
   - 选择预定义模板 "For anon or authenticated access"
   - 策略类型选择 "INSERT" (上传)
   - 保存策略

## 步骤6: Vercel部署设置

1. 将您的项目推送到GitHub仓库
2. 在Vercel中导入项目
3. 在项目环境变量中添加:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `GEMINI_API_KEY` 
   - 其他必要的环境变量
4. 部署项目

## 注意事项

- 确保为生产环境使用适当的安全策略
- 考虑增加用户身份验证以保护您的应用
- 监控存储使用情况，避免超出免费层级限制 