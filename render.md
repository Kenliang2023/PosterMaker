# Render 部署指南

本文档提供在 Render 上部署本应用的详细步骤。

## 前置条件

1. 一个 Render 账号
2. 一个 GitHub 仓库，包含本应用代码
3. Gemini API 密钥（用于AI生成功能）

## 部署步骤

### 1. 准备代码

确保您的代码仓库中包含以下文件：
- `package.json` 含有正确的脚本（特别是 `build:render` 脚本）
- `src/server/config.js` 有正确的环境变量处理
- 所有必要的源代码文件

### 2. 配置 Web Service

1. 登录 Render 账号，点击 "New +" 按钮，选择 "Web Service"
2. 连接您的 GitHub 仓库
3. 配置以下参数：
   - **Name**: 您喜欢的名称，如 `postermaker`
   - **Region**: 选择 `Singapore` 以获得更好的亚洲访问速度
   - **Branch**: `main` 或 `master`（您的主分支）
   - **Root Directory**: 留空
   - **Runtime**: `Node`
   - **Build Command**: `npm run build:render`
   - **Start Command**: `node src/server/server.js`
   - **Instance Type**: 选择免费计划(`Free`)

### 3. 环境变量配置

在 Render 的 "Environment" 部分添加以下环境变量：

```
NODE_ENV=production
RENDER=true
GEMINI_API_KEY=您的GEMINI_API密钥
JWT_SECRET=长随机字符串（用于保护JWT令牌）
SESSION_SECRET=另一个长随机字符串（用于会话安全）
```

注意：无需设置 `STORAGE_DIR`，应用会自动在 Render 环境中使用 `/tmp` 目录。

### 4. 持久化存储

Render 免费计划不支持持久化存储，应用数据将存储在 `/tmp` 目录，这意味着：
- 服务重启时数据会丢失
- 每次部署后需要重新创建管理员账户
- 上传的文件在服务重启后会丢失

如果需要持久化存储，可以考虑：
- 升级到付费计划
- 使用外部数据库服务
- 使用云存储服务（如AWS S3、七牛云等）

### 5. 故障排除

#### 构建错误

如果遇到构建失败，请检查以下内容：

1. **vite 命令不可用**：
   - 确保 `package.json` 中有 `"build:render": "npm install && vite build"` 
   - 确保 `vite` 已在 devDependencies 中

2. **Node.js 版本问题**：
   - 在 `package.json` 中添加 `"engines": { "node": ">=16.0.0" }`

3. **权限问题**：
   - 检查构建日志中的权限错误
   - 确保路径配置和临时目录使用正确

#### 运行时错误

1. **500 服务器错误**：
   - 查看 Render 日志查找具体错误
   - 检查数据库连接和路径配置
   - 验证环境变量是否设置正确

2. **重启后数据丢失**：
   - 这是预期行为 - 免费计划使用非持久化存储
   - 考虑升级到付费计划或使用外部存储

### 6. 最佳实践

1. **保持代码向下兼容**：
   - 设计代码时考虑多环境支持
   - 使用环境配置模块统一管理配置

2. **环境变量管理**：
   - 本地开发时使用 `.env` 文件
   - 生产环境使用 Render 环境变量

3. **日志记录**：
   - 生产环境中减少冗余日志
   - 记录关键操作和错误信息

4. **监控应用**：
   - 定期检查 Render 仪表盘
   - 设置健康检查和告警

## 其他说明

- 免费计划有使用限制，仅适合个人或小规模项目
- 服务会在15分钟不活动后休眠，首次访问会有延迟
- 考虑设置定期 ping 以保持服务活跃 