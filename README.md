# LED灯带产品海报生成应用

一个帮助LED灯带产品制造商快速生成专业营销海报的应用工具。

## 项目概述

该应用通过一体化架构 (Express.js + Vue.js + LevelDB)，结合Gemini API的图像生成能力，为LED灯带厂商提供专业海报生成服务。

### 核心功能

- **产品图片上传**：上传LED灯带产品图片
- **产品信息输入**：添加产品特点和应用场景
- **智能方案生成**：基于AI结构化输出的多样化海报设计方案
- **海报方案选择**：选择不同设计风格和布局方案
- **提示词优化转换**：元提示词到最终提示词的智能转换
- **海报智能生成**：结合产品图片和优化提示词自动生成
- **历史记录管理**：保存和管理生成历史
- **管理员工具**：提示词优化与分析系统

### 项目状态

目前项目处于开发阶段，已实现的功能包括:

- ✅ 基础架构搭建完成
- ✅ 前端页面基本框架
- ✅ 产品信息输入表单
- ✅ 图片上传功能 
- ✅ 提示词模板系统
- ✅ Gemini API结构化调用
- ✅ 多方案智能生成与选择
- ✅ 元提示词到最终提示词转换
- ✅ 多模态API生成(文本+图片)
- ✅ 海报生成与下载功能
- ✅ 优化的用户界面与交互体验
- ⬜ 中英文提示词转换（开发中）
- ⬜ 管理员控制台（计划中）

## 技术架构

- **前端**：Vue.js 3 + Vue Router + Vite
- **UI框架**：Element Plus + Tailwind CSS
- **后端**：Node.js + Express.js
- **数据库**：LevelDB
- **文件处理**：Multer + UUID
- **AI接口**：Google Gemini API (2.0 Flash & Exp-Image-Generation)

## 功能预览

应用包含以下主要页面:

1. **首页**: 应用介绍和功能入口
2. **创建海报页面**: 
   - 产品信息表单（名称、特点、产品使用场景）
   - 图片上传区域
   - AI生成的海报设计方案选择（多种风格方案）
   - 方案详情预览与结构化展示
   - 提示词预览和格式化展示
   - 生成海报按钮与进度显示
3. **结果展示**:
   - 生成的海报预览
   - 下载选项
   - 重新生成功能
4. **历史记录**:
   - 已生成海报浏览
   - 海报下载
   - 删除历史记录

## Gemini API 特性

我们使用 Google Gemini API 提供的两种模型能力：

### Gemini 2.0 Flash
- 快速理解和处理文本请求
- 生成符合JSON Schema的结构化海报设计方案
- 智能分析产品特性，提供匹配的设计风格
- 优化提示词格式和内容
- 支持中文高质量处理

### Gemini 2.0 Flash Experimental Image Generation
- 支持多模态输入（文本+图片）
- 将用户上传的产品图片与生成海报结合
- 根据结构化提示词生成高质量商业海报
- 保留原始产品图片特性，增强视觉效果

### 已知限制
- 海报生成速度受限于API响应时间（平均15-20秒）
- 海报内文字可能存在小错误
- 区域限制可能影响API访问（需使用代理解决）

## 快速开始

### 环境准备

确保您有Node.js环境（v16+）和npm包管理器。

### 安装依赖

```bash
npm install
```

### 配置环境变量

1. 创建或编辑项目根目录中的`.env`文件
2. 设置必要的环境变量:
   ```
   PORT=3000
   NODE_ENV=development
   GEMINI_API_KEY=your_api_key_here
   GEMINI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent
   ```

### 开发环境运行

Windows PowerShell:
```bash
npm run dev
```

### 浏览器访问

访问 http://localhost:5173 开始使用应用

### 构建生产版本

```bash
npm run build
```

### 生产环境运行

```bash
npm start
```

## 部署说明

本应用设计为在企业内部局域网环境部署：

1. 在公司服务器上安装Node.js
2. 克隆应用代码到服务器
3. 运行npm安装和构建
4. 启动应用（可配置为系统服务自动启动）
5. 局域网用户通过服务器IP/主机名访问

## 系统要求

- Node.js 16.x或更高版本
- 现代浏览器支持 (Chrome, Firefox, Edge, Safari)
- 最小服务器配置：2GB RAM, 10GB存储空间
- Gemini API密钥（需在[Google AI Studio](https://ai.google.dev/)获取）

## 数据管理

- 所有数据以键值对形式存储在LevelDB中
- 包括用户上传的图片、生成的海报、提示词模板等
- 建议定期备份`./data`目录

## 许可证

[MIT License](LICENSE)

## 更新日志

查看 [logs.md](logs.md) 获取详细的项目开发日志和更新记录。 