# LED灯带产品海报生成应用

一个帮助LED灯带产品制造商快速生成专业营销海报的应用工具。

## 项目概述

该应用通过一体化架构 (Express.js + Vue.js + LevelDB)，结合Gemini API的图像生成能力，为LED灯带厂商提供专业海报生成服务。

### 核心功能

- **产品图片上传**：上传LED灯带产品图片
- **产品信息输入**：添加产品特点和应用场景
- **智能海报生成**：基于专业提示词自动生成营销海报
- **历史记录管理**：保存和管理生成历史
- **管理员工具**：提示词优化与分析系统

## 技术架构

- **前端**：Vue.js 3 + Vite
- **后端**：Node.js + Express.js
- **数据库**：LevelDB
- **UI框架**：Element Plus + Tailwind CSS
- **AI接口**：Google Gemini API

## Gemini API 特性

我们使用 Google Gemini API 提供的两种图像生成能力：

### Gemini 2.0 Flash Experimental
- 支持文本与内联图像混合输出
- 可保持对话上下文进行图像编辑
- 生成的图像包含SynthID水印
- 最佳支持语言：英语、墨西哥西班牙语、日语、简体中文、印地语

### Imagen 3
- 谷歌最高质量的文本到图像模型
- 提供更高细节、更丰富光影和更少视觉缺陷
- 更好的文本渲染能力
- 支持多种图像格式和风格
- 注意：Imagen 3 仅在付费套餐中可用

### 已知限制
- 图像生成可能并非总是触发，有时模型可能只输出文本
- 不支持音频或视频输入
- 需要实现请求队列管理API限制

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

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