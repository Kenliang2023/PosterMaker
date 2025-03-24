<template>
  <div class="create-poster">
    <div class="poster-creation-container">
      <!-- 第一栏：产品信息 -->
      <div class="form-section">
        <h3>产品信息</h3>
        
        <el-form :model="productInfo" label-position="top" class="input-form">
          <div class="input-card">
            <div class="input-card-title">产品名称</div>
            <el-input v-model="productInfo.name" placeholder="例如：RGB智能LED灯带"></el-input>
            <div class="quick-product-select">
              <el-button size="small" @click="selectProduct('灯带')">灯带</el-button>
              <el-button size="small" @click="selectProduct('直条灯')">直条灯</el-button>
              <el-button size="small" @click="selectProduct('广告发光模组')">广告发光模组</el-button>
            </div>
          </div>
          
          <div class="input-card">
            <div class="input-card-title">产品特点</div>
            <el-input
              type="textarea"
              v-model="productInfo.features"
              :rows="4"
              placeholder="每行输入一个产品特点，例如：&#10;防水IP67&#10;兼容智能家居系统&#10;16百万色可调&#10;低功耗设计"
            ></el-input>
          </div>

          <div class="input-card">
            <div class="input-card-title">产品使用场景</div>
            <div class="scene-selectors-row">
              <el-select v-model="productInfo.targetAudience" placeholder="选择使用场景" class="half-width-select">
                <el-option label="工程项目" value="工程项目"></el-option>
                <el-option label="家居装饰" value="家居装饰"></el-option>
                <el-option label="商业照明" value="商业照明"></el-option>
                <el-option label="户外景观" value="户外景观"></el-option>
              </el-select>
              
              <el-select v-model="productInfo.posterSize" placeholder="选择画幅比例" class="half-width-select">
                <el-option label="横版 (16:9)" value="16:9"></el-option>
                <el-option label="竖版 (9:16)" value="9:16"></el-option>
                <el-option label="方形 (1:1)" value="1:1"></el-option>
              </el-select>
            </div>
          </div>
          
          <div class="input-card">
            <div class="input-card-title">使用场景详细描述</div>
            <el-input
              type="textarea"
              v-model="productInfo.sceneDescription"
              :rows="3"
              placeholder="描述产品的具体使用场景，例如：'智能办公室照明系统'"
            ></el-input>
          </div>
          
          <div class="input-card">
            <div class="input-card-title">产品图片</div>
            <el-upload
              class="product-image-uploader"
              action="/api/posters/upload-image"
              :on-success="handleImageSuccess"
              :before-upload="beforeImageUpload"
              :show-file-list="false"
              name="product_image"
            >
              <img v-if="productInfo.imageUrl" :src="productInfo.imageUrl" class="uploaded-image" />
              <div v-else>
                <el-icon><Plus /></el-icon>
                <div class="el-upload__text">
                  拖拽图片到此处，或<em>点击上传</em>
                </div>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  建议上传产品实物图，JPG/PNG格式，大小不超过5MB
                </div>
              </template>
            </el-upload>
          </div>

          <div class="form-buttons">
            <el-button type="primary" @click="generateProposals" :loading="isGeneratingProposals" :disabled="!canGenerateProposals" class="generate-btn">
              {{ isGeneratingProposals ? '正在生成方案...' : '生成海报方案' }}
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </el-form>
      </div>
      
      <!-- 第二栏：设计方案选择 -->
      <div class="prompt-section">
        <h3>设计方案选择</h3>
        
        <!-- 方案选择部分 -->
        <div v-if="proposals.length === 0 && !isGeneratingProposals" class="empty-proposals">
          <el-empty description="填写产品信息并点击生成海报方案按钮"></el-empty>
        </div>
        
        <div v-if="proposals.length > 0" class="proposals-container">
          <h4>选择设计方案</h4>
          
          <div class="proposals-list">
            <div
              v-for="proposal in proposals"
              :key="proposal.proposalId"
              :class="['proposal-card', selectedProposal && selectedProposal.proposalId === proposal.proposalId ? 'selected' : '']"
              @click="showProposalDetails(proposal)"
            >
              <div class="proposal-header">
                <span class="proposal-title">{{ proposal.styleName }}</span>
              </div>
              <div class="proposal-description">
                {{ proposal.styleDescription }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 第三栏：生成结果 -->
      <div class="result-section">
        <h3>生成结果</h3>
        
        <div class="result-container">
          <!-- 主结果显示区域 -->
          <div class="main-result-area">
            <div v-if="!generatedPoster && !isGenerating" class="empty-result">
              <el-empty description="选择设计方案并点击生成海报按钮"></el-empty>
            </div>
            
            <div v-if="generatedPoster" class="poster-result">
              <img :src="displayedPoster || generatedPoster" class="poster-image" @error="handlePosterImageError" @click="enlargeImage(displayedPoster || generatedPoster)" />
              <div v-if="isBackupPoster && !displayedPoster" class="backup-notice">
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
          
          <!-- 历史记录区域 -->
          <div class="history-records" v-if="posterHistory.length > 0">
            <h4>历史记录</h4>
            <div class="history-images">
              <div 
                v-for="(item, index) in posterHistory" 
                :key="index" 
                class="history-image-item"
                @click="showHistoryImage(item.url)"
              >
                <img :src="item.url" :alt="`历史海报 ${index + 1}`" class="history-image" />
                <div class="history-image-time">{{ formatHistoryTime(item.time) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 方案详情弹窗 -->
    <el-dialog
      v-model="proposalDialogVisible"
      title="设计方案详情"
      width="500px"
    >
      <div v-if="currentProposalDetails" class="proposal-details-full">
        <div class="proposal-detail-item">
          <strong>产品位置:</strong> {{ currentProposalDetails.position }}
        </div>
        <div class="proposal-detail-item">
          <strong>背景描述:</strong> {{ currentProposalDetails.background }}
        </div>
        <div class="proposal-detail-item">
          <strong>特点位置:</strong> {{ currentProposalDetails.featurePosition }}
        </div>
        <div class="proposal-detail-item">
          <strong>整体布局:</strong> {{ currentProposalDetails.layout }}
        </div>
        <div class="proposal-detail-item">
          <strong>背景质感:</strong> {{ currentProposalDetails.backgroundDesc }}
        </div>
        <div class="proposal-detail-item">
          <strong>光影设计:</strong> {{ currentProposalDetails.lightingRequirements }}
        </div>
        <div class="proposal-detail-item">
          <strong>文字设计:</strong> {{ currentProposalDetails.textRequirements }}
        </div>
        <div class="proposal-detail-item">
          <strong>色调:</strong> {{ currentProposalDetails.colorTone }}
        </div>
        <div class="proposal-detail-item">
          <strong>海报尺寸:</strong> {{ currentProposalDetails.posterSize }}
        </div>
        
        <!-- 新增的产品与背景环境协调的展示部分 -->
        <div v-if="currentProposalDetails.integrationElements" class="proposal-section">
          <h4 class="section-title">产品与环境协调</h4>
          <div class="proposal-detail-item">
            <strong>光线融合:</strong> {{ currentProposalDetails.integrationElements.lightIntegration }}
          </div>
          <div class="proposal-detail-item">
            <strong>安装位置:</strong> {{ currentProposalDetails.integrationElements.installationContext }}
          </div>
          <div class="proposal-detail-item">
            <strong>视觉和谐:</strong> {{ currentProposalDetails.integrationElements.visualHarmony }}
          </div>
        </div>
        
        <!-- 新增的海报文字内容展示部分 -->
        <div v-if="currentProposalDetails.displayedText" class="proposal-section">
          <h4 class="section-title">海报文字内容</h4>
          <div class="proposal-detail-item">
            <strong>主标题:</strong> {{ currentProposalDetails.displayedText.headline }}
          </div>
          <div class="proposal-detail-item">
            <strong>特点:</strong> {{ Array.isArray(currentProposalDetails.displayedText.features) ? currentProposalDetails.displayedText.features.join(', ') : currentProposalDetails.displayedText.features }}
          </div>
          <div class="proposal-detail-item">
            <strong>标语:</strong> {{ currentProposalDetails.displayedText.tagline }}
          </div>
        </div>
      </div>
      <div class="prompt-actions" v-if="finalPrompt && selectedProposal">
        <el-button 
          type="primary" 
          size="small" 
          @click="showOriginalPrompt"
        >
          查看元提示词
        </el-button>
        <el-button 
          type="success" 
          size="small" 
          @click="showOptimizedPrompt"
          :disabled="!finalPrompt"
        >
          查看Gemini提示词
        </el-button>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="proposalDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="selectProposalFromDialog">选择此方案</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 生成进度对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      :title="progressDialogTitle"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="progress-dialog-content">
        <el-progress :percentage="dialogProgress" :status="dialogProgressStatus"></el-progress>
        <div class="progress-dialog-text">{{ dialogProgressMessage }}</div>
      </div>
    </el-dialog>

    <!-- 提示词对话框 -->
    <el-dialog
      v-model="promptDialogVisible"
      :title="dialogPromptTitle"
      width="800px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :show-close="true"
    >
      <div class="prompt-dialog-content">
        <div class="prompt-dialog-text">{{ dialogPromptContent }}</div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="promptDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 图片放大弹窗 -->
    <el-dialog
      v-model="enlargeDialogVisible"
      :title="enlargeDialogTitle"
      width="80%"
      center
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :show-close="true"
    >
      <div class="enlarge-image-container">
        <img :src="enlargeImageSrc" class="enlarged-image" />
      </div>
    </el-dialog>
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
        name: "LED灯带",
        features: `高亮度
高光效
高性价比`,
        targetAudience: "工程项目",
        posterSize: "16:9",
        sceneDescription: "桑拿房氛围照明", // 设置默认值
        imageUrl: ""
      },
      // 新增方案相关数据
      proposals: [],
      selectedProposal: null,
      proposalsSessionId: '',
      isGeneratingProposals: false,
      proposalsProgress: 0,
      proposalsStatus: '',
      proposalsMessage: '',
      proposalsInterval: null,
      
      // 保留原有数据
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
      proposalDialogVisible: false,
      currentProposalDetails: null,
      progressDialogVisible: false,
      progressDialogTitle: '',
      dialogProgress: 0,
      dialogProgressStatus: '',
      dialogProgressMessage: '',
      promptDialogVisible: false,
      dialogPromptTitle: '',
      dialogPromptContent: '',
      displayedPoster: null,
      posterHistory: [],
      enlargeDialogVisible: false,
      enlargeDialogTitle: '',
      enlargeImageSrc: '',
    }
  },
  mounted() {
    // 加载历史记录
    this.loadHistory();
  },
  computed: {
    // 能否生成方案的判断条件
    canGenerateProposals() {
      return this.productInfo.name && 
             this.productInfo.features && 
             this.productInfo.imageUrl;
    },
    
    // 能否生成海报的判断条件
    canGenerate() {
      return this.selectedProposal && this.productInfo.imageUrl;
    }
  },
  methods: {
    // 添加快速选择产品类型的方法
    selectProduct(productName) {
      this.productInfo.name = 'LED' + productName;
    },
    
    // 生成方案相关方法
    async generateProposals() {
      if (!this.canGenerateProposals) {
        this.$message.warning('请完善产品信息');
        return;
      }
      
      this.isGeneratingProposals = true;
      this.startProposalsSimulation();
      this.proposals = []; // 清空现有方案
      this.selectedProposal = null;
      
      try {
        // 准备产品信息
        const productInfoForRequest = {
          name: this.productInfo.name,
          features: this.productInfo.features.split('\n'),
          targetAudience: this.productInfo.targetAudience,
          sceneDescription: this.productInfo.sceneDescription,
          imageUrl: this.productInfo.imageUrl,
          posterSize: this.productInfo.posterSize // 添加海报画幅信息
        };
        
        // 请求生成方案
        const response = await fetch('/api/prompts/generate-poster-proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productInfo: productInfoForRequest })
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.proposals = result.proposals;
          this.proposalsSessionId = result.sessionId;
          this.stopProposalsSimulation(true);
          this.$message.success('成功生成海报设计方案');
        } else {
          this.stopProposalsSimulation(false);
          this.$message.error('生成方案失败: ' + result.message);
        }
      } catch (error) {
        console.error('生成方案出错:', error);
        this.stopProposalsSimulation(false);
        this.$message.error('生成方案时发生错误，请重试');
      }
    },
    
    // 选择方案
    selectProposal(proposal) {
      this.selectedProposal = proposal;
      this.finalPrompt = ''; // 清空之前的提示词
    },
    
    // 获取背景简短描述
    getBriefBackground(background) {
      if (!background) return '';
      return background.length > 20 ? background.substring(0, 20) + '...' : background;
    },
    
    // 获取色调简短描述
    getBriefColorTone(colorTone) {
      if (!colorTone) return '';
      return colorTone.length > 20 ? colorTone.substring(0, 20) + '...' : colorTone;
    },
    
    // 基于选定方案生成海报的方法
    async generatePosterFromProposal() {
      if (!this.selectedProposal) {
        this.$message.warning('请选择一个设计方案');
        return;
      }
      
      if (!this.productInfo.imageUrl) {
        this.$message.warning('请上传产品图片');
        return;
      }
      
      this.isGenerating = true;
      this.posterLoadError = false;
      this.startProgressSimulation();
      
      try {
        console.log('基于方案生成海报:', {
          sessionId: this.proposalsSessionId,
          proposalId: this.selectedProposal.proposalId,
          productInfo: this.productInfo
        });
        
        // 直接调用海报生成接口，传递会话ID和方案ID
        const response = await fetch('/api/posters/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: this.proposalsSessionId,
            proposalId: this.selectedProposal.proposalId,
            proposal: this.selectedProposal, // 直接传递整个提案对象作为备份
            productInfo: {
              name: this.productInfo.name,
              features: this.productInfo.features.split('\n'),
              targetAudience: this.productInfo.targetAudience,
              sceneDescription: this.productInfo.sceneDescription,
              imageUrl: this.productInfo.imageUrl,
              posterSize: this.productInfo.posterSize
            }
          })
        });
        
        const result = await response.json();
        
        // 停止进度模拟
        this.stopProgressSimulation(true);
        
        if (result.success) {
          this.generatedPoster = result.posterUrl;
          this.isBackupPoster = result.useBackup || false;
          this.generationProgress = 100;
          this.progressMessage = '海报生成完成!';
          
          // 添加到历史记录
          this.addToHistory(result.posterUrl);
          
          // 更新最终使用的提示词，用于参考
          if (result.finalPrompt) {
            this.finalPrompt = result.finalPrompt;
          }
          
          this.$message.success('海报生成成功');
        } else {
          throw new Error(result.message || '海报生成失败');
        }
      } catch (error) {
        console.error('生成海报失败:', error);
        this.posterLoadError = true;
        this.progressMessage = `生成失败: ${error.message || '未知错误'}`;
        this.$message.error(`海报生成失败: ${error.message || '未知错误'}`);
        
        // 停止进度模拟
        this.stopProgressSimulation(false);
      } finally {
        this.isGenerating = false;
      }
    },
    
    // 方案生成进度模拟
    startProposalsSimulation() {
      this.proposalsProgress = 0;
      this.proposalsStatus = '';
      this.proposalsMessage = '正在准备生成方案...';
      
      // 同时更新对话框进度
      this.progressDialogVisible = true;
      this.progressDialogTitle = '正在生成设计方案';
      this.dialogProgress = 0;
      this.dialogProgressStatus = '';
      this.dialogProgressMessage = '正在准备生成方案...';
      
      // 清除可能存在的旧计时器
      if (this.proposalsInterval) {
        clearInterval(this.proposalsInterval);
      }
      
      // 模拟生成进度
      const progressSteps = [
        { progress: 15, message: '分析产品信息...' },
        { progress: 30, message: '生成设计概念...' },
        { progress: 50, message: '创建多风格方案...' },
        { progress: 70, message: '优化方案细节...' },
        { progress: 85, message: '准备展示方案...' }
      ];
      
      let currentStep = 0;
      
      this.proposalsInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          this.proposalsProgress = step.progress;
          this.proposalsMessage = step.message;
          // 同步更新对话框进度
          this.dialogProgress = step.progress;
          this.dialogProgressMessage = step.message;
          currentStep++;
        } else {
          // 中间步骤保持在85%，等待实际完成
          this.proposalsProgress = 85;
          this.proposalsMessage = '即将完成，请稍候...';
          // 同步更新对话框进度
          this.dialogProgress = 85;
          this.dialogProgressMessage = '即将完成，请稍候...';
        }
      }, 1500); // 每1.5秒更新一次进度
    },
    
    stopProposalsSimulation(success = true) {
      if (this.proposalsInterval) {
        clearInterval(this.proposalsInterval);
        this.proposalsInterval = null;
      }
      
      // 设置最终状态
      this.proposalsProgress = 100;
      this.proposalsStatus = success ? 'success' : 'exception';
      this.proposalsMessage = success ? '方案生成完成!' : '生成过程中出现错误';
      
      // 同步更新对话框进度
      this.dialogProgress = 100;
      this.dialogProgressStatus = success ? 'success' : 'exception';
      this.dialogProgressMessage = success ? '方案生成完成!' : '生成过程中出现错误';
      
      // 短暂延迟后隐藏进度条和对话框
      setTimeout(() => {
        this.isGeneratingProposals = false;
        this.progressDialogVisible = false;
      }, 1000);
    },
    
    // 添加显示优化后提示词的方法
    showOptimizedPrompt() {
      if (!this.finalPrompt) {
        this.$message.warning('还没有生成最终提示词');
        return;
      }
      
      // 格式化提示词，每个部分加上换行，使其更易读
      const formattedPrompt = this.formatPrompt(this.finalPrompt);
      
      this.dialogPromptTitle = '最终生成提示词';
      this.dialogPromptContent = formattedPrompt;
      this.promptDialogVisible = true;
    },
    
    // 添加显示原始提示词的方法
    showOriginalPrompt() {
      if (!this.selectedProposal) {
        this.$message.warning('还没有选择设计方案');
        return;
      }
      
      // 获取场景描述，如果有的话
      const sceneDesc = this.productInfo.sceneDescription 
        ? `\n\n产品使用场景：${this.productInfo.sceneDescription}。`
        : '';
      
      // 根据选择的方案构建原始提示词
      const originalPrompt = `一张"${this.productInfo.name}"商业海报。

产品位于海报${this.selectedProposal.position}，保留图片原样，作为海报的主体。

海报的背景是：${this.selectedProposal.background}。

产品特点文字位于${this.selectedProposal.featurePosition}，写着"${this.productInfo.features.split('\n').join('、')}"。${sceneDesc}

整体布局：${this.selectedProposal.layout}。

背景描述：${this.selectedProposal.backgroundDesc}。

光影要求：${this.selectedProposal.lightingRequirements}。

文字要求：${this.selectedProposal.textRequirements}。

色调要求：${this.selectedProposal.colorTone}。

海报尺寸：${this.selectedProposal.posterSize}。

海报整体风格：${this.selectedProposal.overallStyle}。

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
      
      // 格式化提示词使其更易读
      const formattedPrompt = this.formatPrompt(originalPrompt);
      
      this.dialogPromptTitle = '原始提示词';
      this.dialogPromptContent = formattedPrompt;
      this.promptDialogVisible = true;
    },

    // 格式化提示词使其更易读的辅助方法
    formatPrompt(prompt) {
      if (!prompt) return '';
      
      // 拆分提示词到行，并处理每行
      return prompt.split('\n')
        .map(line => {
          // 对每个主要部分进行处理
          if (line.includes('：') || line.includes(':')) {
            const parts = line.split(/[：:]/);
            if (parts.length >= 2) {
              const label = parts[0].trim();
              const content = parts.slice(1).join(':').trim();
              // 加粗标签部分
              return `${label}：\n  ${content}`;
            }
          }
          return line;
        })
        .join('\n\n')
        .replace(/\n\n\n+/g, '\n\n'); // 移除过多的空行
    },

    // 以下为保留的原有方法
    handleImageSuccess(response) {
      console.log('图片上传响应:', response);
      if (response.success) {
        this.productInfo.imageUrl = response.url;
        this.$message.success('图片上传成功');
      } else {
        this.$message.error('图片上传失败: ' + (response.message || '未知错误'));
      }
    },
    
    beforeImageUpload(file) {
      const isValidFormat = ['image/jpeg', 'image/png'].includes(file.type);
      const isValidSize = file.size / 1024 / 1024 < 5;
      
      if (!isValidFormat) {
        this.$message.error('只能上传JPG或PNG图片!');
        return false;
      }
      
      if (!isValidSize) {
        this.$message.error('图片大小不能超过5MB!');
        return false;
      }
      
      return true;
    },
    
    startProgressSimulation() {
      this.generationProgress = 0;
      this.generationStatus = '';
      this.progressMessage = '正在准备生成...';
      
      // 同时更新对话框进度
      this.progressDialogVisible = true;
      this.progressDialogTitle = '正在生成海报';
      this.dialogProgress = 0;
      this.dialogProgressStatus = '';
      this.dialogProgressMessage = '正在准备生成...';
      
      // 清除可能存在的旧计时器
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
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
          // 同步更新对话框进度
          this.dialogProgress = step.progress;
          this.dialogProgressMessage = step.message;
          currentStep++;
        } else {
          // 保持在90%，等待实际完成
          this.generationProgress = 90;
          this.progressMessage = '即将完成，请稍候...';
          // 同步更新对话框进度
          this.dialogProgress = 90;
          this.dialogProgressMessage = '即将完成，请稍候...';
        }
      }, 2000); // 每2秒更新一次进度
    },
    
    stopProgressSimulation(success = true) {
      // 确保清除计时器
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      
      // 设置最终状态
      this.generationProgress = 100;
      this.generationStatus = success ? 'success' : 'exception';
      this.progressMessage = success ? '海报生成完成!' : '生成过程中出现错误';
      
      // 同步更新对话框进度
      this.dialogProgress = 100;
      this.dialogProgressStatus = success ? 'success' : 'exception';
      this.dialogProgressMessage = success ? '海报生成完成!' : '生成过程中出现错误';
      
      // 短暂延迟后隐藏进度条和对话框
      setTimeout(() => {
        this.isGenerating = false;
        this.progressDialogVisible = false;
      }, 1000);
    },
    
    resetForm() {
      this.productInfo = {
        name: "LED灯带",
        features: `高亮度
高光效
高性价比`,
        targetAudience: "工程项目",
        posterSize: "16:9",
        sceneDescription: "桑拿房氛围照明", // 设置默认值
        imageUrl: ""
      };
      this.proposals = [];
      this.selectedProposal = null;
      this.finalPrompt = '';
      this.generatedPoster = '';
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
      // 使用相同的方案重新生成
      this.generatePosterFromProposal();
    },
    
    handlePosterImageError() {
      console.error('海报图片加载失败:', this.generatedPoster);
      this.posterLoadError = true;
      this.$message.error('海报图片加载失败，请重试');
    },

    showProposalDetails(proposal) {
      this.currentProposalDetails = proposal;
      this.proposalDialogVisible = true;
    },

    selectProposalFromDialog() {
      if (this.currentProposalDetails) {
        this.selectedProposal = this.currentProposalDetails;
        this.finalPrompt = ''; // 清空之前的提示词
        this.proposalDialogVisible = false;
        // 添加选择成功的提示
        this.$message.success(`已选择"${this.currentProposalDetails.styleName}"方案`);
        // 直接开始生成海报
        this.generatePosterFromProposal();
      }
    },

    enlargeImage(imageUrl) {
      this.enlargeImageSrc = imageUrl;
      this.enlargeDialogVisible = true;
    },

    showHistoryImage(imageUrl) {
      this.displayedPoster = imageUrl;
      this.$message.info('显示历史海报');
    },

    formatHistoryTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    },

    // 添加到历史记录
    addToHistory(url) {
      if (!url) return;
      
      // 添加新的历史记录
      this.posterHistory.unshift({
        url: url,
        time: new Date().getTime()
      });
      
      // 限制历史记录最多显示10条
      if (this.posterHistory.length > 10) {
        this.posterHistory = this.posterHistory.slice(0, 10);
      }
      
      // 保存到本地存储
      try {
        localStorage.setItem('posterHistory', JSON.stringify(this.posterHistory));
      } catch (e) {
        console.error('保存历史记录失败:', e);
      }
    },

    // 加载历史记录
    loadHistory() {
      try {
        const history = localStorage.getItem('posterHistory');
        if (history) {
          this.posterHistory = JSON.parse(history);
        }
      } catch (e) {
        console.error('加载历史记录失败:', e);
      }
    },
  }
}
</script>

<style>
/* 添加卡片样式和动态效果 */
.el-form-item {
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.el-form-item:hover {
  transform: translateY(-2px);
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.input-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.input-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  transform: translateY(-3px);
}

.input-card-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1a56db;
  margin-bottom: 0.8rem;
}

.form-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.el-input,
.el-textarea__inner,
.el-select,
.product-image-uploader {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border-radius: 8px !important;
  transition: all 0.3s ease;
}

.el-input:hover,
.el-textarea__inner:hover,
.el-select:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.el-input:focus,
.el-textarea__inner:focus,
.el-select:focus {
  box-shadow: 0 4px 12px rgba(26, 86, 219, 0.15);
  border-color: #1a56db !important;
}

/* 修改下拉选择框样式 */
.scene-selectors-row {
  display: flex;
  gap: 15px;
  width: 100%;
}

.half-width-select {
  flex: 1;
  width: 100% !important;
}

.el-select {
  width: 100%;
}

.el-select__tags {
  max-width: calc(100% - 30px);
}

.el-select-dropdown {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.el-select-dropdown__item {
  padding: 10px 20px;
}

.el-select-dropdown__item.selected {
  color: #1a56db;
  font-weight: 600;
  background-color: #f0f5ff;
}

/* 卡片式布局 */
.form-section,
.prompt-section,
.result-section {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.form-section:hover,
.prompt-section:hover,
.result-section:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

/* 添加方案选择相关样式 */
.quick-product-select {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.proposals-container {
  margin-bottom: 1.5rem;
}

.proposals-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1rem;
  max-width: 300px;
  margin: 0 auto;
}

.proposal-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.proposal-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  transform: translateY(-3px);
}

.proposal-card.selected {
  border-color: #3b82f6;
  background-color: #ebf4ff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.proposal-header {
  margin-bottom: 0.4rem;
}

.proposal-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1a56db;
}

.proposal-description {
  color: #4a5568;
  margin-bottom: 0;
  font-size: 0.85rem;
  line-height: 1.3;
}

.proposal-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.proposal-detail {
  color: #4a5568;
}

.proposal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.proposal-details-full {
  background-color: #f8fafc;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
}

.proposal-detail-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #4a5568;
}

.proposal-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed #e2e8f0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.75rem;
}

.empty-proposals {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 进度对话框样式 */
.progress-dialog-content {
  padding: 16px;
  text-align: center;
}

.progress-dialog-text {
  margin-top: 12px;
  font-size: 0.95rem;
  color: #4b5563;
}

/* 保留和修改原有样式 */
.create-poster {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.5rem;
}

.poster-creation-container {
  display: grid;
  grid-template-columns: 0.9fr 0.9fr 2fr;
  gap: 1.2rem;
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

.prompt-preview {
  margin-top: 1rem;
}

.prompt-preview h4 {
  margin-bottom: 0.5rem;
  color: #444;
  font-size: 1rem;
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

.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 260px;
}

.poster-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-image {
  max-width: 100%;
  max-height: 500px;
  width: auto;
  object-fit: contain;
  margin-bottom: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.poster-image:hover {
  transform: scale(1.02);
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

.prompt-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.prompt-dialog-content {
  padding: 16px;
}

.prompt-dialog-text {
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  line-height: 1.6;
  background-color: #f9fafb;
  border-radius: 4px;
  text-align: left;
  font-size: 0.9rem;
  color: #374151;
}

.result-container {
  display: flex;
  gap: 1.5rem;
  min-height: 500px;
}

.main-result-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.history-records {
  flex: 0 0 200px;
  border-left: 1px solid #e2e8f0;
  padding-left: 1rem;
}

.history-records h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #2d3748;
  text-align: center;
}

.history-images {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.history-image-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f8fafc;
}

.history-image-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
  transform: translateY(-2px);
}

.history-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.history-image-time {
  font-size: 0.75rem;
  color: #718096;
  text-align: center;
}

.enlarge-image-container {
  padding: 16px;
  text-align: center;
}

.enlarged-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1200px) {
  .result-container {
    flex-direction: column;
  }
  
  .history-records {
    flex: none;
    border-left: none;
    border-top: 1px solid #e2e8f0;
    padding-left: 0;
    padding-top: 1rem;
    margin-top: 1rem;
  }
  
  .history-images {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    max-height: none;
    overflow-x: auto;
  }
  
  .history-image-item {
    width: calc(25% - 0.6rem);
  }
}

@media (max-width: 768px) {
  .history-image-item {
    width: calc(33.333% - 0.6rem);
  }
}

@media (max-width: 480px) {
  .history-image-item {
    width: calc(50% - 0.6rem);
  }
}
</style> 