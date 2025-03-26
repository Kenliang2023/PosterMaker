<template>
  <div class="poster-history">
    <h2>海报历史记录</h2>
    
    <div v-if="loading" class="loading-state">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="posters.length === 0" class="empty-state">
      <el-empty description="暂无海报历史记录" />
      <el-button type="primary" @click="$router.push('/create')">创建海报</el-button>
    </div>
    
    <div v-else class="posters-grid">
      <div v-for="poster in posters" :key="poster.id" class="poster-item">
        <div class="poster-image-container">
          <img :src="poster.posterUrl" alt="海报" class="poster-image" @click="previewPoster(poster)" />
          <div class="poster-actions">
            <el-button type="primary" size="small" @click="downloadPoster(poster.posterUrl)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button type="danger" size="small" @click="confirmDelete(poster)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="poster-info">
          <h3 class="poster-title">{{ poster.productName || '未命名海报' }}</h3>
          <p class="poster-date">{{ formatDate(poster.createdAt) }}</p>
        </div>
      </div>
    </div>
    
    <!-- 海报预览对话框 -->
    <el-dialog v-model="previewVisible" :title="previewPoster.productName || '海报预览'" width="70%" class="poster-preview-dialog">
      <div class="preview-content">
        <img :src="previewPoster.posterUrl" alt="海报预览" class="preview-image" />
        <div class="preview-details">
          <h3>产品信息</h3>
          <p><strong>产品名称:</strong> {{ previewPoster.productName }}</p>
          <div v-if="previewPoster.features">
            <p><strong>产品特点:</strong></p>
            <ul>
              <li v-for="(feature, index) in getFeaturesList(previewPoster.features)" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>
          <p v-if="previewPoster.createdAt"><strong>创建时间:</strong> {{ formatDate(previewPoster.createdAt) }}</p>
          
          <div v-if="previewPoster.finalPrompt" class="prompt-section">
            <h3>使用的提示词</h3>
            <el-tooltip content="复制提示词" placement="top">
              <el-button 
                type="primary" 
                size="small" 
                icon="CopyDocument" 
                circle
                @click="copyPrompt(previewPoster.finalPrompt)"
                class="copy-button">
              </el-button>
            </el-tooltip>
            <el-input
              type="textarea"
              v-model="previewPoster.finalPrompt"
              :rows="6"
              readonly
              class="prompt-textarea"
            ></el-input>
          </div>
          
          <div class="preview-actions">
            <el-button type="primary" @click="downloadPoster(previewPoster.posterUrl)">下载海报</el-button>
            <el-button type="danger" @click="confirmDelete(previewPoster)">删除海报</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
    >
      <p>确定要删除这张海报吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deletePoster" :loading="isDeleting">确认删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Delete, Download, Loading, CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'PosterHistory',
  components: {
    Delete,
    Download,
    Loading,
    CopyDocument
  },
  data() {
    return {
      posters: [],
      loading: true,
      previewVisible: false,
      previewPoster: {},
      deleteDialogVisible: false,
      posterToDelete: null,
      isDeleting: false
    }
  },
  created() {
    this.fetchPosters();
  },
  methods: {
    async fetchPosters() {
      this.loading = true;
      try {
        const response = await fetch('/api/posters');
        const data = await response.json();
        
        if (data.success) {
          this.posters = data.posters.map(poster => {
            const processedPoster = {...poster};
            
            if (!processedPoster.posterUrl && processedPoster.imageUrl) {
              processedPoster.posterUrl = processedPoster.imageUrl;
            }
            
            if (processedPoster.posterUrl && processedPoster.posterUrl.startsWith('/public/')) {
              processedPoster.posterUrl = processedPoster.posterUrl.replace('/public/', '/');
            }
            
            return processedPoster;
          });
        } else {
          ElMessage.error('获取历史记录失败: ' + data.message);
        }
      } catch (error) {
        console.error('获取历史记录出错:', error);
        ElMessage.error('获取历史记录时发生错误');
      } finally {
        this.loading = false;
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '未知时间';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    getFeaturesList(features) {
      if (Array.isArray(features)) {
        return features;
      } else if (typeof features === 'string') {
        return features.split('、').filter(f => f.trim());
      }
      return [];
    },
    
    previewPoster(poster) {
      this.previewPoster = {...poster};
      
      if (this.previewPoster.imageUrl && !this.previewPoster.posterUrl) {
        this.previewPoster.posterUrl = this.previewPoster.imageUrl;
      }
      
      if (this.previewPoster.posterUrl && this.previewPoster.posterUrl.startsWith('/public/')) {
        this.previewPoster.posterUrl = this.previewPoster.posterUrl.replace('/public/', '/');
      }
      
      this.previewVisible = true;
    },
    
    downloadPoster(posterUrl) {
      const link = document.createElement('a');
      link.href = posterUrl;
      link.download = 'poster_' + Date.now() + '.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      ElMessage.success('海报下载已开始');
    },
    
    confirmDelete(poster) {
      this.posterToDelete = poster;
      this.deleteDialogVisible = true;
    },
    
    copyPrompt(prompt) {
      navigator.clipboard.writeText(prompt)
        .then(() => {
          ElMessage.success('提示词已复制到剪贴板');
        })
        .catch(() => {
          ElMessage.error('复制失败，请手动选择复制');
        });
    },
    
    async deletePoster() {
      if (!this.posterToDelete) return;
      
      this.isDeleting = true;
      try {
        const fileName = this.posterToDelete.imageUrl ? 
          this.posterToDelete.imageUrl.split('/').pop() : 
          this.posterToDelete.id;
        
        const response = await fetch(`/api/posters/delete/${fileName}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.posters = this.posters.filter(p => p.id !== this.posterToDelete.id);
          ElMessage.success('海报已成功删除');
          
          if (this.previewPoster.id === this.posterToDelete.id) {
            this.previewVisible = false;
          }
        } else {
          ElMessage.error('删除海报失败: ' + result.message);
        }
      } catch (error) {
        console.error('删除海报出错:', error);
        ElMessage.error('删除海报时发生错误');
      } finally {
        this.isDeleting = false;
        this.deleteDialogVisible = false;
        this.posterToDelete = null;
      }
    }
  }
}
</script>

<style scoped>
.poster-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.loading-icon {
  font-size: 32px;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

.posters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.poster-item {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.poster-item:hover {
  transform: translateY(-5px);
}

.poster-image-container {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.poster-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.poster-image-container:hover .poster-actions {
  opacity: 1;
}

.poster-info {
  padding: 1rem;
  background-color: #fff;
}

.poster-title {
  margin: 0;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-date {
  margin: 5px 0 0;
  font-size: 12px;
  color: #909399;
}

.preview-content {
  display: flex;
  gap: 2rem;
}

.preview-image {
  max-width: 50%;
  max-height: 70vh;
  object-fit: contain;
}

.preview-details {
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
}

.prompt-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  position: relative;
}

.prompt-textarea {
  margin-top: 0.5rem;
}

.copy-button {
  position: absolute;
  right: 0;
  top: 1rem;
}

.preview-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 