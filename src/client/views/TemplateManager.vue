<template>
  <div class="template-manager">
    <h2 class="page-title">海报提示词模板管理</h2>
    
    <div class="template-manager-container">
      <!-- 过滤和操作区域 -->
      <div class="filter-actions">
        <div class="filters">
          <el-select v-model="filterProductType" placeholder="产品类型" clearable @change="filterTemplates">
            <el-option v-for="type in productTypes" :key="type" :label="type" :value="type"></el-option>
          </el-select>
          
          <el-select v-model="filterScene" placeholder="应用场景" clearable @change="filterTemplates">
            <el-option v-for="scene in applicationScenes" :key="scene" :label="scene" :value="scene"></el-option>
          </el-select>
          
          <el-select v-model="filterStyle" placeholder="风格类型" clearable @change="filterTemplates">
            <el-option v-for="style in styleTypes" :key="style" :label="style" :value="style"></el-option>
          </el-select>

          <el-input 
            v-model="searchKeyword" 
            placeholder="搜索关键词" 
            clearable 
            @input="filterTemplates"
            style="width: 200px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="actions">
          <el-button type="primary" @click="showAddDialog">新建模板</el-button>
          <el-button @click="refreshTemplates">刷新</el-button>
        </div>
      </div>

      <!-- 模板列表 -->
      <div class="templates-list">
        <el-table 
          :data="filteredTemplates" 
          style="width: 100%" 
          border 
          v-loading="loading"
          @row-click="handleRowClick"
        >
          <el-table-column prop="templateId" label="模板ID" width="180"></el-table-column>
          <el-table-column prop="productType" label="产品类型" width="120"></el-table-column>
          <el-table-column prop="applicationScene" label="应用场景" width="120"></el-table-column>
          <el-table-column prop="styleType" label="风格类型" width="120"></el-table-column>
          <el-table-column prop="description" label="描述"></el-table-column>
          <el-table-column label="评分" width="120">
            <template #default="scope">
              <el-rate 
                v-model="scope.row.score" 
                disabled 
                text-color="#ff9900"
                show-score
              ></el-rate>
            </template>
          </el-table-column>
          <el-table-column label="使用次数" width="100" prop="usageCount"></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button size="small" @click.stop="editTemplate(scope.row)">编辑</el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click.stop="confirmDelete(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 模板详情对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogType === 'add' ? '新建模板' : '编辑模板'"
      width="80%"
      destroy-on-close
    >
      <el-form :model="currentTemplate" label-position="top" :rules="formRules" ref="templateForm">
        <div class="form-grid">
          <el-form-item label="模板ID" prop="templateId">
            <el-input v-model="currentTemplate.templateId" :disabled="dialogType === 'edit'"></el-input>
          </el-form-item>
          
          <el-form-item label="产品类型" prop="productType">
            <el-select v-model="currentTemplate.productType" style="width: 100%">
              <el-option v-for="type in productTypes" :key="type" :label="type" :value="type"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="应用场景" prop="applicationScene">
            <el-select v-model="currentTemplate.applicationScene" style="width: 100%">
              <el-option v-for="scene in applicationScenes" :key="scene" :label="scene" :value="scene"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="风格类型" prop="styleType">
            <el-select v-model="currentTemplate.styleType" style="width: 100%">
              <el-option v-for="style in styleTypes" :key="style" :label="style" :value="style"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="位置" prop="position">
            <el-input v-model="currentTemplate.position"></el-input>
          </el-form-item>
          
          <el-form-item label="特点文字位置" prop="featurePosition">
            <el-input v-model="currentTemplate.featurePosition"></el-input>
          </el-form-item>
          
          <el-form-item label="海报尺寸" prop="posterSize">
            <el-select v-model="currentTemplate.posterSize" style="width: 100%">
              <el-option label="1:1 (正方形)" value="1:1"></el-option>
              <el-option label="4:3 (标准)" value="4:3"></el-option>
              <el-option label="16:9 (宽屏)" value="16:9"></el-option>
              <el-option label="9:16 (垂直)" value="9:16"></el-option>
              <el-option label="3:4 (垂直)" value="3:4"></el-option>
            </el-select>
          </el-form-item>
        </div>
        
        <el-form-item label="前景描述" prop="foreground">
          <el-input type="textarea" v-model="currentTemplate.foreground" rows="3"></el-input>
        </el-form-item>
        
        <el-form-item label="背景" prop="background">
          <el-input type="textarea" v-model="currentTemplate.background" rows="3"></el-input>
        </el-form-item>
        
        <div class="form-grid">
          <el-form-item label="整体布局" prop="layout">
            <el-input type="textarea" v-model="currentTemplate.layout" rows="2"></el-input>
          </el-form-item>
          
          <el-form-item label="背景描述" prop="backgroundDesc">
            <el-input type="textarea" v-model="currentTemplate.backgroundDesc" rows="2"></el-input>
          </el-form-item>
        </div>
        
        <div class="form-grid">
          <el-form-item label="光影要求" prop="lightingRequirements">
            <el-input type="textarea" v-model="currentTemplate.lightingRequirements" rows="2"></el-input>
          </el-form-item>
          
          <el-form-item label="文字要求" prop="textRequirements">
            <el-input type="textarea" v-model="currentTemplate.textRequirements" rows="2"></el-input>
          </el-form-item>
        </div>
        
        <div class="form-grid">
          <el-form-item label="色调要求" prop="colorTone">
            <el-input type="textarea" v-model="currentTemplate.colorTone" rows="2"></el-input>
          </el-form-item>
          
          <el-form-item label="整体风格" prop="overallStyle">
            <el-input type="textarea" v-model="currentTemplate.overallStyle" rows="2"></el-input>
          </el-form-item>
        </div>
        
        <el-form-item label="描述" prop="description">
          <el-input type="textarea" v-model="currentTemplate.description" rows="2"></el-input>
        </el-form-item>
      </el-form>
      
      <div class="preview-section">
        <h3>最终提示词预览</h3>
        <div class="preview-content">
          <div class="preview-text">{{ generatedPrompt }}</div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveTemplate" :loading="saving">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 模板详情查看对话框 -->
    <el-dialog 
      v-model="viewDialogVisible" 
      title="模板详情"
      width="80%"
    >
      <div class="template-view" v-if="currentTemplate">
        <div class="template-header">
          <h2>{{ currentTemplate.productType }} - {{ currentTemplate.styleType }}</h2>
          <div class="template-meta">
            <div class="meta-item">
              <span class="label">模板ID:</span>
              <span class="value">{{ currentTemplate.templateId }}</span>
            </div>
            <div class="meta-item">
              <span class="label">评分:</span>
              <span class="value">
                <el-rate v-model="currentTemplate.score" disabled text-color="#ff9900"></el-rate>
                ({{ currentTemplate.score.toFixed(1) }})
              </span>
            </div>
            <div class="meta-item">
              <span class="label">使用次数:</span>
              <span class="value">{{ currentTemplate.usageCount }}</span>
            </div>
            <div class="meta-item">
              <span class="label">创建时间:</span>
              <span class="value">{{ formatDate(currentTemplate.createdAt) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">更新时间:</span>
              <span class="value">{{ formatDate(currentTemplate.updatedAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="content-columns">
          <div class="content-column">
            <h3>基本信息</h3>
            <div class="detail-item">
              <div class="detail-label">产品类型</div>
              <div class="detail-value">{{ currentTemplate.productType }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">应用场景</div>
              <div class="detail-value">{{ currentTemplate.applicationScene }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">风格类型</div>
              <div class="detail-value">{{ currentTemplate.styleType }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">位置</div>
              <div class="detail-value">{{ currentTemplate.position }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">特点文字位置</div>
              <div class="detail-value">{{ currentTemplate.featurePosition }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">海报尺寸</div>
              <div class="detail-value">{{ currentTemplate.posterSize }}</div>
            </div>
            
            <h3>描述</h3>
            <div class="detail-text">{{ currentTemplate.description }}</div>
          </div>
          
          <div class="content-column">
            <h3>元素描述</h3>
            <div class="detail-item">
              <div class="detail-label">前景描述</div>
              <div class="detail-value">{{ currentTemplate.foreground }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">背景</div>
              <div class="detail-value">{{ currentTemplate.background }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">整体布局</div>
              <div class="detail-value">{{ currentTemplate.layout }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">背景描述</div>
              <div class="detail-value">{{ currentTemplate.backgroundDesc }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">光影要求</div>
              <div class="detail-value">{{ currentTemplate.lightingRequirements }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">文字要求</div>
              <div class="detail-value">{{ currentTemplate.textRequirements }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">色调要求</div>
              <div class="detail-value">{{ currentTemplate.colorTone }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">整体风格</div>
              <div class="detail-value">{{ currentTemplate.overallStyle }}</div>
            </div>
          </div>
        </div>
        
        <div class="preview-section">
          <h3>最终提示词预览</h3>
          <div class="preview-content">
            <div class="preview-text">{{ viewGeneratedPrompt }}</div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="editTemplate(currentTemplate)">
            编辑模板
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Search } from '@element-plus/icons-vue';

export default {
  name: 'TemplateManager',
  components: {
    Search
  },
  data() {
    return {
      // 过滤条件
      filterProductType: '',
      filterScene: '',
      filterStyle: '',
      searchKeyword: '',
      
      // 数据
      templates: [],
      filteredTemplates: [],
      loading: false,
      
      // 选项数据
      productTypes: ['LED灯带', 'LED面板灯', 'LED射灯', 'LED灯管', 'LED路灯'],
      applicationScenes: ['商业空间', '家居空间', '办公空间', '户外景观', '工业环境', '通用'],
      styleTypes: ['科技未来', '温馨', '现代商务', '自然', '简约', '现代'],
      
      // 弹窗控制
      dialogVisible: false,
      viewDialogVisible: false,
      dialogType: 'add', // 'add' 或 'edit'
      saving: false,
      
      // 当前编辑的模板
      currentTemplate: this.getEmptyTemplate(),
      
      // 表单校验规则
      formRules: {
        templateId: [
          { required: true, message: '请输入模板ID', trigger: 'blur' },
          { pattern: /^[a-z0-9-]+$/, message: '模板ID只能包含小写字母、数字和连字符', trigger: 'blur' }
        ],
        productType: [
          { required: true, message: '请选择产品类型', trigger: 'change' }
        ],
        foreground: [
          { required: true, message: '请输入前景描述', trigger: 'blur' }
        ],
        background: [
          { required: true, message: '请输入背景描述', trigger: 'blur' }
        ]
      }
    };
  },
  computed: {
    generatedPrompt() {
      if (!this.currentTemplate) return '';
      
      const template = this.currentTemplate;
      return this.generatePromptFromTemplate(template, '示例产品名称', '特点1、特点2、特点3');
    },
    viewGeneratedPrompt() {
      if (!this.currentTemplate) return '';
      
      const template = this.currentTemplate;
      return this.generatePromptFromTemplate(template, '示例产品名称', '特点1、特点2、特点3');
    }
  },
  mounted() {
    this.fetchTemplates();
  },
  methods: {
    // 获取所有模板
    async fetchTemplates() {
      this.loading = true;
      try {
        const response = await fetch('/api/prompts/product-templates');
        const result = await response.json();
        
        if (result.success) {
          this.templates = result.templates;
          this.filterTemplates();
        } else {
          this.$message.error('获取模板列表失败: ' + (result.message || '未知错误'));
        }
      } catch (error) {
        console.error('获取模板列表出错:', error);
        this.$message.error('获取模板列表失败，请检查网络连接');
      } finally {
        this.loading = false;
      }
    },
    
    // 刷新模板列表
    refreshTemplates() {
      this.fetchTemplates();
    },
    
    // 筛选模板
    filterTemplates() {
      if (!this.templates.length) return;
      
      this.filteredTemplates = this.templates.filter(template => {
        let match = true;
        
        // 根据产品类型筛选
        if (this.filterProductType && template.productType !== this.filterProductType) {
          match = false;
        }
        
        // 根据应用场景筛选
        if (this.filterScene && template.applicationScene !== this.filterScene) {
          match = false;
        }
        
        // 根据风格类型筛选
        if (this.filterStyle && template.styleType !== this.filterStyle) {
          match = false;
        }
        
        // 根据关键词搜索
        if (this.searchKeyword) {
          const keyword = this.searchKeyword.toLowerCase();
          const searchText = (
            template.templateId.toLowerCase() + ' ' +
            template.productType.toLowerCase() + ' ' +
            template.applicationScene.toLowerCase() + ' ' +
            template.styleType.toLowerCase() + ' ' +
            template.foreground.toLowerCase() + ' ' +
            template.background.toLowerCase() + ' ' +
            template.description.toLowerCase()
          );
          
          if (!searchText.includes(keyword)) {
            match = false;
          }
        }
        
        return match;
      });
    },
    
    // 创建新模板
    showAddDialog() {
      this.dialogType = 'add';
      this.currentTemplate = this.getEmptyTemplate();
      this.dialogVisible = true;
    },
    
    // 编辑模板
    editTemplate(template) {
      this.dialogType = 'edit';
      this.currentTemplate = JSON.parse(JSON.stringify(template)); // 深拷贝
      this.viewDialogVisible = false; // 先关闭查看对话框（如果打开了）
      this.dialogVisible = true;
    },
    
    // 查看模板详情
    handleRowClick(row) {
      this.currentTemplate = JSON.parse(JSON.stringify(row)); // 深拷贝
      this.viewDialogVisible = true;
    },
    
    // 保存模板
    async saveTemplate() {
      this.$refs.templateForm.validate(async (valid) => {
        if (!valid) {
          return false;
        }
        
        this.saving = true;
        try {
          const response = await fetch('/api/prompts/product-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.currentTemplate)
          });
          
          const result = await response.json();
          
          if (result.success) {
            this.$message.success(this.dialogType === 'add' ? '创建模板成功' : '更新模板成功');
            this.dialogVisible = false;
            this.fetchTemplates(); // 刷新模板列表
          } else {
            this.$message.error((this.dialogType === 'add' ? '创建' : '更新') + '模板失败: ' + (result.message || '未知错误'));
          }
        } catch (error) {
          console.error('保存模板失败:', error);
          this.$message.error('保存模板失败，请检查网络连接');
        } finally {
          this.saving = false;
        }
      });
    },
    
    // 确认删除
    confirmDelete(template) {
      this.$confirm(`确定要删除模板 "${template.templateId}" 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.deleteTemplate(template.templateId);
      }).catch(() => {});
    },
    
    // 删除模板
    async deleteTemplate(templateId) {
      this.loading = true;
      try {
        const response = await fetch(`/api/prompts/product-template/${templateId}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.$message.success('删除模板成功');
          this.fetchTemplates(); // 刷新模板列表
        } else {
          this.$message.error('删除模板失败: ' + (result.message || '未知错误'));
        }
      } catch (error) {
        console.error('删除模板失败:', error);
        this.$message.error('删除模板失败，请检查网络连接');
      } finally {
        this.loading = false;
      }
    },
    
    // 获取空模板对象
    getEmptyTemplate() {
      return {
        templateId: '',
        productType: 'LED灯带',
        applicationScene: '商业空间',
        styleType: '科技未来',
        position: '中央',
        foreground: '',
        background: '',
        featurePosition: '底部',
        layout: '',
        backgroundDesc: '',
        lightingRequirements: '',
        textRequirements: '',
        colorTone: '',
        posterSize: '1:1',
        overallStyle: '',
        description: '',
        score: 0,
        usageCount: 0
      };
    },
    
    // 从模板生成最终提示词
    generatePromptFromTemplate(template, productName, features) {
      return `一张${productName}商业海报。

产品位于海报${template.position}，前景描述：${template.foreground}，和海报背景无缝组成完整海报。

海报的背景是：${template.background}。

产品特点文字位于${template.featurePosition}，写着"${features}"。

整体布局：${template.layout || '产品居中，背景环绕，文字简洁'}。

背景描述：${template.backgroundDesc || '材质+光线+质感'}。

光影要求：${template.lightingRequirements || '从产品投射柔和光线'}。

文字要求：${template.textRequirements || '中等大小，清晰易读'}。

色调要求：${template.colorTone || '根据产品特点选择和谐色调'}。

海报尺寸：${template.posterSize}。

海报整体风格：${template.overallStyle || template.styleType}。

左上角品牌 LOGO 写着："RS-LED"，右下角公司网址写着"www.rs-led.com"，左下角是很小的公司二维码。`;
    },
    
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString();
    }
  }
};
</script>

<style scoped>
.template-manager {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
  color: #1a56db;
}

.template-manager-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 1.25rem;
}

.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.templates-list {
  margin-top: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.preview-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 6px;
}

.preview-section h3 {
  margin-bottom: 0.75rem;
  color: #1a56db;
}

.preview-content {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 1rem;
}

.preview-text {
  white-space: pre-line;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* 模板详情视图样式 */
.template-header {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
}

.template-header h2 {
  margin-bottom: 0.75rem;
  color: #1a56db;
}

.template-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-item .label {
  font-weight: bold;
  color: #4b5563;
}

.content-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .content-columns {
    grid-template-columns: 1fr;
  }
}

.content-column h3 {
  color: #1a56db;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.detail-item {
  margin-bottom: 1rem;
}

.detail-label {
  font-weight: bold;
  margin-bottom: 0.25rem;
  color: #4b5563;
}

.detail-value {
  white-space: pre-line;
}

.detail-text {
  white-space: pre-line;
  margin-bottom: 1.5rem;
}
</style> 