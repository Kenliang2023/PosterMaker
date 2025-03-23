<template>
  <div class="create-poster">
    <h2 class="page-title">创建LED灯带产品海报</h2>
    
    <div class="poster-creation-container">
      <!-- 第一栏：产品信息 -->
      <div class="form-section">
        <h3>产品信息</h3>
        
        <el-form :model="productInfo" label-position="top">
          <el-form-item label="产品名称">
            <el-input v-model="productInfo.name" placeholder="例如：RGB智能LED灯带"></el-input>
          </el-form-item>
          
          <el-form-item label="产品特点">
            <el-input
              type="textarea"
              v-model="productInfo.features"
              :rows="4"
              placeholder="每行输入一个产品特点，例如：&#10;防水IP67&#10;兼容智能家居系统&#10;16百万色可调&#10;低功耗设计"
            ></el-input>
          </el-form-item>

          <el-form-item label="目标客户群体">
            <el-select v-model="productInfo.targetAudience" placeholder="选择目标客户群体">
              <el-option label="家庭用户" value="家庭用户"></el-option>
              <el-option label="商业场所" value="商业场所"></el-option>
              <el-option label="办公环境" value="办公环境"></el-option>
              <el-option label="工程项目" value="工程项目"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="产品图片">
            <el-upload
              class="product-image-uploader"
              action="/api/posters/upload-image"
              :on-success="handleImageSuccess"
              :before-upload="beforeImageUpload"
              :show-file-list="false"
              name="product_image"
            >
              <img v-if="productInfo.image" :src="productInfo.image" class="uploaded-image" />
              <el-icon v-else><Plus /></el-icon>
              <div class="el-upload__text">
                拖拽图片到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  建议上传产品实物图，JPG/PNG格式，大小不超过5MB
                </div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="generatePoster" :loading="isGenerating" :disabled="!canGenerate" class="generate-btn">
              {{ isGenerating ? '正在生成...' : '生成海报' }}
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 第二栏：提示词模板 -->
      <div class="prompt-section">
        <h3>提示词设置</h3>
        
        <!-- 模板选择部分 -->
        <div class="template-selection-section">
          <h4>选择模板</h4>
          <div class="template-carousel">
            <div class="template-cards">
              <div 
                v-for="template in templates" 
                :key="template.templateId"
                :class="['template-card-compact', selectedTemplate && selectedTemplate.templateId === template.templateId ? 'selected' : '']"
                @click="selectTemplate(template)"
              >
                <div class="template-header">
                  <span class="template-title">{{ template.productType }} - {{ template.styleType }}</span>
                  <el-rate 
                    v-model="template.score"
                    disabled
                    text-color="#ff9900"
                    show-score
                    :size="'small'"
                  ></el-rate>
                </div>
                <div class="template-footer">
                  <span class="template-scene">{{ template.applicationScene }}</span>
                  <span class="template-size">{{ template.posterSize }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="prompt-preview">
          <h4>海报生成提示词预览</h4>
          <el-input
            type="textarea"
            :rows="5"
            placeholder="选择模板后将显示生成的提示词"
            v-model="finalPrompt"
            readonly
          ></el-input>
        </div>
        
        <!-- 生成进度区域 -->
        <div v-if="isGenerating" class="generation-progress">
          <el-progress :percentage="generationProgress" :status="generationStatus"></el-progress>
          <div class="progress-text">{{ progressMessage }}</div>
        </div>
      </div>
      
      <!-- 第三栏：生成结果 -->
      <div class="result-section">
        <h3>生成结果</h3>
        
        <div v-if="!generatedPoster && !isGenerating" class="empty-result">
          <el-empty description="填写产品信息并点击生成海报按钮"></el-empty>
        </div>
        
        <div v-if="generatedPoster" class="poster-result">
          <img :src="generatedPoster" class="poster-image" @error="handlePosterImageError" />
          <div v-if="isBackupPoster" class="backup-notice">
            <el-alert
              title="使用备用方案"
              type="warning"
              :closable="false"
              description="AI海报生成失败，显示的是原始图片。您可以尝试重新生成或调整提示词。"
            >
            </el-alert>
          </div>
          <div class="poster-actions">
            <el-button type="success" @click="downloadPoster" icon="Download">下载海报</el-button>
            <el-button type="info" @click="regeneratePoster" icon="RefreshRight">重新生成</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue';

export default {
  name: 'CreatePoster',
  components: {
    Plus
  },
  data() {
    return {
      productInfo: {
        name: 'LED灯管',
        features: '高亮度\n高光效\n高性价比',
        targetAudience: '工程项目',
        image: ''
      },
      prompts: [],
      selectedPromptId: '',
      productType: 'LED灯带',
      applicationScene: '商业空间',
      styleType: '科技未来',
      productTemplates: [],
      selectedTemplateId: '',
      finalPrompt: '',
      finalPromptEn: '',
      generatedPoster: '',
      isGenerating: false,
      isBackupPoster: false,
      posterLoadError: false,
      generationProgress: 0,
      generationStatus: '',
      progressMessage: '',
      progressInterval: null,
      templates: [],
      selectedTemplate: null
    }
  },
  computed: {
    selectedPrompt() {
      return this.prompts.find(p => p.id === this.selectedPromptId);
    },
    renderedPrompt() {
      if (!this.selectedPrompt) return '';
      
      let template = this.selectedPrompt.template;
      template = template.replace('{productName}', this.productInfo.name || '产品名称');
      
      const featuresText = this.productInfo.features ? 
        this.productInfo.features.split('\n').join('、') : 
        '产品特点';
      
      template = template.replace('{features}', featuresText);
      
      return template;
    },
    selectedTemplate() {
      return this.productTemplates.find(t => t.templateId === this.selectedTemplateId);
    },
    canGenerate() {
      const result = this.productInfo.name && 
             this.productInfo.features && 
             this.productInfo.image &&
             this.selectedTemplateId;
      return result;
    }
  },
  watch: {
    selectedTemplateId: {
      handler(newVal) {
        if (newVal) {
          this.generateFinalPrompt();
        }
      }
    }
  },
  mounted() {
    this.fetchPrompts();
    this.fetchProductTemplates();
    this.fetchTemplates();
  },
  methods: {
    async fetchPrompts() {
      try {
        const response = await fetch('/api/prompts');
        const data = await response.json();
        
        if (data.success) {
          this.prompts = data.prompts;
          // 默认选择第一个提示词
          if (this.prompts.length > 0) {
            this.selectedPromptId = this.prompts[0].id;
          }
        }
      } catch (error) {
        console.error('获取提示词失败:', error);
        this.$message.error('获取提示词模板失败，请刷新页面重试');
      }
    },
    
    async fetchProductTemplates() {
      try {
        let url = '/api/prompts/product-templates';
        const queryParams = [];
        
        if (this.productType) {
          queryParams.push(`productType=${encodeURIComponent(this.productType)}`);
        }
        
        if (this.applicationScene) {
          queryParams.push(`applicationScene=${encodeURIComponent(this.applicationScene)}`);
        }
        
        if (this.styleType) {
          queryParams.push(`styleType=${encodeURIComponent(this.styleType)}`);
        }
        
        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          this.productTemplates = data.templates;
          
          // 如果存在模板，默认选择第一个
          if (this.productTemplates.length > 0) {
            this.selectedTemplateId = this.productTemplates[0].templateId;
          } else {
            this.selectedTemplateId = '';
            this.finalPrompt = '';
            this.finalPromptEn = '';
          }
        }
      } catch (error) {
        console.error('获取产品模板失败:', error);
        this.$message.error('获取产品海报模板失败，请刷新页面重试');
      }
    },
    
    async generateFinalPrompt() {
      if (!this.selectedTemplateId || !this.productInfo.name) {
        return;
      }
      
      try {
        const featuresText = this.productInfo.features ? 
          this.productInfo.features.split('\n').join('、') : 
          '产品特点';
        
        const response = await fetch('/api/prompts/generate-final-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateId: this.selectedTemplateId,
            productName: this.productInfo.name,
            features: featuresText
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.finalPrompt = data.finalPrompt;
          this.finalPromptEn = data.finalPromptEn;
        } else {
          this.$message.error('生成提示词失败: ' + data.message);
        }
      } catch (error) {
        console.error('生成最终提示词失败:', error);
        this.$message.error('生成提示词失败，请重试');
      }
    },
    
    handleImageSuccess(response) {
      if (response.success) {
        this.productInfo.image = response.url;
        this.$message.success('图片上传成功');
      } else {
        this.$message.error('图片上传失败: ' + response.message);
      }
    },
    
    beforeImageUpload(file) {
      const isValidFormat = ['image/jpeg', 'image/png'].includes(file.type);
      const isValidSize = file.size / 1024 / 1024 < 5;
      
      if (!isValidFormat) {
        this.$message.error('只能上传JPG或PNG图片!');
      }
      
      if (!isValidSize) {
        this.$message.error('图片大小不能超过5MB!');
      }
      
      return isValidFormat && isValidSize;
    },
    
    startProgressSimulation() {
      this.generationProgress = 0;
      this.generationStatus = '';
      this.progressMessage = '正在准备生成...'
      
      // 清除可能存在的旧计时器
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      
      // 模拟生成进度
      const progressSteps = [
        { progress: 10, message: '正在分析产品信息...' },
        { progress: 25, message: '正在处理产品图片...' },
        { progress: 40, message: '将产品特点转换为创意要素...' },
        { progress: 60, message: '正在创建海报布局...' },
        { progress: 75, message: '正在生成海报图像...' },
        { progress: 90, message: '优化海报细节...' }
      ];
      
      let currentStep = 0;
      
      this.progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          this.generationProgress = step.progress;
          this.progressMessage = step.message;
          currentStep++;
        } else {
          // 保持在90%，等待实际完成
          this.generationProgress = 90;
          this.progressMessage = '即将完成，请稍候...';
        }
      }, 2000); // 每2秒更新一次进度
    },
    
    stopProgressSimulation(success = true) {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      
      // 设置最终状态
      this.generationProgress = 100;
      this.generationStatus = success ? 'success' : 'exception';
      this.progressMessage = success ? '海报生成完成!' : '生成过程中出现错误';
      
      // 短暂延迟后隐藏进度条
      setTimeout(() => {
        this.isGenerating = false;
      }, 1000);
    },
    
    async generatePoster() {
      if (!this.canGenerate) {
        this.$message.warning('请完善产品信息并选择提示词模板');
        return;
      }
      
      this.isGenerating = true;
      this.posterLoadError = false;
      this.startProgressSimulation();
      
      try {
        // 构造请求数据
        const requestData = {
          prompt: this.finalPrompt,
          productInfo: {
            name: this.productInfo.name,
            features: this.productInfo.features.split('\n'),
            targetAudience: this.productInfo.targetAudience,
            imageUrl: this.productInfo.image
          },
          templateId: this.selectedTemplateId
        };
        
        // 请求生成海报
        const response = await fetch('/api/posters/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.generatedPoster = result.posterUrl + '?t=' + new Date().getTime(); // 添加时间戳防止缓存
          this.isBackupPoster = result.useBackup;
          this.stopProgressSimulation(true);
          this.$message.success(
            this.isBackupPoster 
              ? '海报生成失败，已使用原图作为海报' 
              : '海报生成成功!'
          );
          
          // 提交模板评分提示
          if (!this.isBackupPoster) {
            setTimeout(() => {
              this.$confirm('海报生成完成，您对这个结果满意吗？', '海报评分', {
                confirmButtonText: '满意，评5星',
                cancelButtonText: '一般',
                type: 'info'
              }).then(() => {
                this.rateTemplate(10); // 满意评10分
              }).catch(() => {
                this.rateTemplate(7); // 一般评7分
              });
            }, 1500);
          }
        } else {
          this.stopProgressSimulation(false);
          this.$message.error('海报生成失败: ' + result.message);
        }
      } catch (error) {
        console.error('生成海报出错:', error);
        this.stopProgressSimulation(false);
        this.$message.error('生成海报时发生错误，请重试');
      }
    },
    
    async rateTemplate(score) {
      if (!this.selectedTemplateId) return;
      
      try {
        const response = await fetch(`/api/prompts/product-template/${this.selectedTemplateId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ score })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.$message.success('感谢您的评分！');
          // 更新本地模板评分
          const template = this.productTemplates.find(t => t.templateId === this.selectedTemplateId);
          if (template) {
            template.score = data.template.score;
          }
        }
      } catch (error) {
        console.error('评分失败:', error);
      }
    },
    
    resetForm() {
      this.productInfo = {
        name: 'LED灯管',
        features: '高亮度\n高光效\n高性价比',
        targetAudience: '工程项目',
        image: ''
      };
      // 保持选中的模板不变
    },
    
    downloadPoster() {
      if (!this.generatedPoster) return;
      
      // 创建一个临时链接用于下载
      const link = document.createElement('a');
      link.href = this.generatedPoster;
      link.download = `${this.productInfo.name}-海报.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    
    regeneratePoster() {
      // 使用相同的产品信息重新生成
      this.generatePoster();
    },
    
    handlePosterImageError() {
      console.error('海报图片加载失败:', this.generatedPoster);
      this.posterLoadError = true;
      this.$message.error('海报图片加载失败，请重试');
    },
    
    // 获取模板列表
    async fetchTemplates() {
      try {
        const response = await fetch('/api/prompts/product-templates');
        const result = await response.json();
        
        if (result.success) {
          this.templates = result.templates;
          
          // 如果有模板，默认选择第一个
          if (this.templates.length > 0) {
            this.selectedTemplate = this.templates[0];
          }
        } else {
          this.$message.error('获取模板列表失败: ' + (result.message || '未知错误'));
        }
      } catch (error) {
        console.error('获取模板列表出错:', error);
        this.$message.error('获取模板列表失败，请检查网络连接');
      }
    },
    
    // 选择模板
    selectTemplate(template) {
      this.selectedTemplate = template;
      this.selectedTemplateId = template.templateId;
      
      // 根据模板生成提示词
      if (template) {
        this.generateFinalPrompt();
      }
    },
    
    // 从模板生成提示词
    generatePromptFromTemplate(template) {
      return `一张${this.productName || '产品名称'}商业海报。

产品位于海报${template.position}，前景描述：${template.foreground}，和海报背景无缝组成完整海报。

海报的背景是：${template.background}。

产品特点文字位于${template.featurePosition}，写着"${this.productFeatures || '产品特点'}"。

整体布局：${template.layout || '产品居中，背景环绕，文字简洁'}。

背景描述：${template.backgroundDesc || '材质+光线+质感'}。

光影要求：${template.lightingRequirements || '从产品投射柔和光线'}。

文字要求：${template.textRequirements || '中等大小，清晰易读'}。

色调要求：${template.colorTone || '根据产品特点选择和谐色调'}。

海报尺寸：${template.posterSize}。

海报整体风格：${template.overallStyle || template.styleType}。

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
    },
    
    // 提交生成
    async submitGeneration() {
      if (!this.prompt || !this.prompt.trim()) {
        this.$message.error('请输入提示词');
        return;
      }

      this.isGenerating = true;
      this.generationError = false;
      this.posterUrl = '';
      this.generatedPosterId = '';
      this.generationStatus = '准备中...';
      this.progressMessage = '正在准备生成请求...';

      // 启动进度更新
      this.startProgressUpdate();

      // 准备表单数据
      const formData = new FormData();
      formData.append('prompt', this.prompt);
      formData.append('productName', this.productInfo.name || '');
      formData.append('productFeatures', this.productInfo.features || '');
      
      // 添加选定的模板ID
      if (this.selectedTemplate) {
        formData.append('templateId', this.selectedTemplate.templateId);
      }
      
      // 如果有选择图片，添加到表单
      if (this.productInfo.image) {
        formData.append('image', this.productInfo.image);
      }

      try {
        this.generationStatus = '生成中...';
        this.progressMessage = '正在发送请求到AI服务...';
        
        const response = await fetch('/api/posters/generate', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`服务器返回错误: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          this.generationStatus = '完成';
          this.progressMessage = '海报生成完成！';
          this.posterUrl = result.posterUrl;
          this.generatedPosterId = result.posterId;
          
          // 如果有选择模板，则更新模板使用次数和评分
          if (this.selectedTemplate) {
            try {
              await fetch(`/api/prompts/product-template/${this.selectedTemplate.templateId}/rate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ score: 5 }) // 默认评分为5
              });
            } catch (error) {
              console.error('更新模板评分失败:', error);
            }
          }
          
          // 滚动到结果区域
          this.$nextTick(() => {
            const resultSection = this.$el.querySelector('.result-section');
            if (resultSection) {
              resultSection.scrollIntoView({ behavior: 'smooth' });
            }
          });
        } else {
          throw new Error(result.message || '生成失败');
        }
      } catch (error) {
        console.error('生成海报失败:', error);
        this.generationError = true;
        this.generationStatus = '失败';
        this.progressMessage = `生成失败: ${error.message}`;
        this.$message.error(`生成失败: ${error.message}`);
      } finally {
        this.isGenerating = false;
        this.stopProgressUpdate();
      }
    },
  }
}
</script>

<style scoped>
.create-poster {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-title {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #1a56db;
}

.poster-creation-container {
  display: grid;
  grid-template-columns: 0.7fr 0.8fr 1.5fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 1200px) {
  .poster-creation-container {
    grid-template-columns: 1fr 1fr;
  }
  
  .result-section {
    grid-column: span 2;
  }
  
  .prompt-section {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .poster-creation-container {
    grid-template-columns: 1fr;
  }
  
  .prompt-section,
  .result-section {
    grid-column: span 1;
  }
}

.form-section,
.prompt-section,
.result-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.form-section h3,
.prompt-section h3,
.result-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.product-image-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px dashed #cbd5e0;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.3s;
  text-align: center;
  background-color: #f8fafc;
}

.product-image-uploader:hover {
  border-color: #1a56db;
  background-color: #f0f5ff;
}

.product-image-uploader .el-icon {
  font-size: 2rem;
  color: #1a56db;
  margin-bottom: 0.5rem;
}

.el-upload__text {
  color: #4a5568;
  font-weight: 500;
  font-size: 1rem;
  margin: 0.5rem 0;
}

.el-upload__text em {
  color: #1a56db;
  font-style: normal;
  font-weight: 600;
}

.el-upload__tip {
  color: #718096;
  font-size: 0.8rem;
  text-align: center;
}

/* 模板选择区域样式优化 */
.template-selection-section h4 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #4a5568;
}

.template-carousel {
  width: 100%;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.template-cards {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
}

/* 添加紧凑型模板卡片样式 */
.template-card-compact {
  min-width: 150px;
  max-width: 180px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  padding: 0.5rem;
  background-color: #f7fafc;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.template-card-compact:before {
  content: "点击选择";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(26, 86, 219, 0.1);
  color: #1a56db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 4px;
}

.template-card-compact:hover:before {
  opacity: 1;
}

.template-card-compact.selected:before {
  content: "已选择";
  background-color: rgba(26, 86, 219, 0.15);
  opacity: 1;
}

.template-card-compact .template-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.3rem;
}

.template-card-compact .template-title {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card-compact .template-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  margin-top: 0.3rem;
}

.template-card-compact .template-scene {
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 0.7rem;
  background-color: #e5e7eb;
  color: #4b5563;
}

.template-card-compact .template-size {
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 0.7rem;
  background-color: #dbeafe;
  color: #1e40af;
}

/* 提示词预览区域优化 */
.prompt-preview {
  margin-top: 1rem;
}

.prompt-preview h4 {
  margin-bottom: 0.5rem;
  color: #444;
  font-size: 1rem;
}

/* 减少提示词文本区域高度 */
.prompt-preview .el-textarea textarea {
  max-height: 120px;
}

.generate-btn {
  min-width: 120px;
}

.generation-progress {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 6px;
}

.progress-text {
  margin-top: 0.3rem;
  font-size: 0.85rem;
  color: #4b5563;
  text-align: center;
}

/* 海报结果区域优化 */
.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 260px;
}

.poster-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-height: 600px;
  width: 100%;
}

.poster-image {
  max-width: 100%;
  min-height: 400px;
  max-height: 600px;
  width: auto;
  object-fit: contain;
  margin-bottom: 0.75rem;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.08);
}

.poster-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.backup-notice {
  margin: 0.5rem 0;
  width: 100%;
}

.uploaded-image {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}

.template-card-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.template-card-compact.selected {
  border-color: #1a56db;
  background-color: #ebf4ff;
}
</style> 