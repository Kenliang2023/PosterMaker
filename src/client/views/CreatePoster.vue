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
        <h3>提示词模板</h3>
        
        <div class="prompt-container">
          <div class="prompt-select">
            <el-select v-model="selectedPromptId" placeholder="选择提示词模板" style="width: 100%">
              <el-option
                v-for="prompt in prompts"
                :key="prompt.id"
                :label="prompt.name"
                :value="prompt.id"
              ></el-option>
            </el-select>
          </div>
          
          <div class="prompt-preview" v-if="selectedPrompt">
            <h4>提示词预览</h4>
            <div class="prompt-content">{{ renderedPrompt }}</div>
          </div>
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
      generatedPoster: '',
      isGenerating: false,
      isBackupPoster: false,
      posterLoadError: false,
      generationProgress: 0,
      generationStatus: '',
      progressMessage: '',
      progressInterval: null
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
    canGenerate() {
      const result = this.productInfo.name && 
             this.productInfo.features && 
             this.productInfo.image &&
             this.selectedPromptId;
      return result;
    }
  },
  mounted() {
    this.fetchPrompts();
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
          prompt: this.renderedPrompt,
          productInfo: {
            name: this.productInfo.name,
            features: this.productInfo.features.split('\n'),
            targetAudience: this.productInfo.targetAudience,
            imageUrl: this.productInfo.image
          },
          templateId: this.selectedPromptId
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
    }
  }
}
</script>

<style scoped>
.create-poster {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
  color: #1a56db;
}

.poster-creation-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (min-width: 768px) {
  .poster-creation-container {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.form-section, .prompt-section, .result-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 1.25rem;
  height: 100%;
}

.form-section h3, .prompt-section h3, .result-section h3 {
  margin-bottom: 1.25rem;
  color: #1a56db;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.75rem;
}

.product-image-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: 1.5rem 0;
}

.product-image-uploader:hover {
  border-color: #1a56db;
}

.uploaded-image {
  max-width: 100%;
  max-height: 200px;
  display: block;
  margin: 0 auto;
}

.prompt-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prompt-preview {
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.prompt-preview h4 {
  margin-bottom: 0.5rem;
  color: #4b5563;
  font-size: 0.9rem;
}

.prompt-content {
  white-space: pre-line;
  color: #1f2937;
  line-height: 1.4;
  font-size: 0.9rem;
}

.generate-btn {
  min-width: 120px;
}

.generation-progress {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 6px;
}

.progress-text {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #4b5563;
  text-align: center;
}

.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.poster-result {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-image {
  max-width: 100%;
  max-height: 350px;
  margin-bottom: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.poster-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.backup-notice {
  margin: 0.75rem 0;
  width: 100%;
}
</style> 