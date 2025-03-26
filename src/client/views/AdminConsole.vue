<template>
  <div class="admin-console">
    <div class="page-header">
      <h2>管理员控制台</h2>
    </div>
    
    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="元提示词管理" name="meta-prompts">
        <div class="tab-content">
          <div class="meta-prompt-editor">
            <div class="meta-prompt-list">
              <h3>元提示词列表</h3>
              <div class="list-actions">
                <el-button type="primary" size="small" @click="createNewMetaPrompt">
                  <el-icon><Plus /></el-icon> 新建元提示词
                </el-button>
                <el-input 
                  v-model="searchQuery" 
                  placeholder="搜索元提示词" 
                  prefix-icon="Search"
                  clearable
                  @input="filterMetaTemplates"
                  size="small"
                  class="search-input"
                />
              </div>
              
              <el-table
                v-loading="loading"
                :data="filteredMetaTemplates"
                style="width: 100%"
                :header-cell-style="{background:'#f5f7fa', color: '#606266'}"
                @row-click="selectMetaTemplate"
                highlight-current-row
              >
                <el-table-column prop="templateId" label="ID" width="120" />
                <el-table-column prop="description" label="描述" />
                <el-table-column prop="updatedAt" label="更新时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.updatedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="scope">
                    <el-button 
                      type="primary" 
                      size="small" 
                      circle
                      :icon="Edit"
                      @click.stop="editMetaTemplate(scope.row)"
                    />
                    <el-button 
                      type="danger" 
                      size="small" 
                      circle
                      :icon="Delete"
                      @click.stop="confirmDeleteMetaTemplate(scope.row.templateId)"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>
            
            <div class="meta-prompt-form" v-if="selectedMetaTemplate">
              <h3>{{ isEditMode ? '编辑元提示词' : '新建元提示词' }}</h3>
              
              <el-form :model="metaTemplateForm" label-position="top">
                <el-form-item label="模板ID">
                  <el-input 
                    v-model="metaTemplateForm.templateId"
                    :disabled="isEditMode"
                    placeholder="唯一标识符，如meta-template-001"
                  />
                </el-form-item>
                
                <el-form-item label="描述">
                  <el-input 
                    v-model="metaTemplateForm.description"
                    placeholder="元提示词的用途描述"
                  />
                </el-form-item>
                
                <el-form-item label="元提示词内容">
                  <el-input 
                    v-model="metaTemplateForm.template"
                    type="textarea"
                    :rows="12"
                    placeholder="输入元提示词内容，支持变量占位符如 {{productName}}, {{features}}等"
                  />
                </el-form-item>
                
                <div class="form-actions">
                  <el-button @click="cancelEdit">取消</el-button>
                  <el-button type="primary" @click="saveMetaTemplate">保存</el-button>
                </div>
              </el-form>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="提示词查看" name="prompt-history">
        <div class="tab-content">
          <div class="prompt-history">
            <h3>历史提示词记录</h3>
            
            <div class="search-filter">
              <el-input 
                v-model="promptSearchQuery" 
                placeholder="搜索提示词" 
                prefix-icon="Search"
                clearable
                @input="filterPromptHistory"
                class="search-input"
              />
            </div>
            
            <el-table
              v-loading="promptLoading"
              :data="filteredPromptHistory"
              style="width: 100%"
              :header-cell-style="{background:'#f5f7fa', color: '#606266'}"
              @row-click="selectPromptHistory"
            >
              <el-table-column prop="promptId" label="ID" width="180" />
              <el-table-column prop="username" label="用户" width="120" />
              <el-table-column prop="templateId" label="模板ID" width="150" />
              <el-table-column prop="createdAt" label="创建时间" width="180">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
            
            <el-dialog
              v-model="promptDialogVisible"
              title="提示词详情"
              width="80%"
              :before-close="closePromptDialog"
            >
              <template v-if="selectedPrompt">
                <h4>基本信息</h4>
                <p><strong>提示词ID:</strong> {{ selectedPrompt.promptId }}</p>
                <p><strong>用户:</strong> {{ selectedPrompt.username }}</p>
                <p><strong>模板ID:</strong> {{ selectedPrompt.templateId }}</p>
                <p><strong>创建时间:</strong> {{ formatDate(selectedPrompt.createdAt) }}</p>
                
                <el-divider />
                
                <h4>产品信息</h4>
                <div v-if="selectedPrompt.productInfo">
                  <p><strong>产品名称:</strong> {{ selectedPrompt.productInfo.productName || '无' }}</p>
                  <p><strong>产品特点:</strong> {{ selectedPrompt.productInfo.features || '无' }}</p>
                </div>
                
                <el-divider />
                
                <h4>最终提示词</h4>
                <el-input
                  type="textarea"
                  :rows="10"
                  :modelValue="selectedPrompt.prompt"
                  readonly
                />
              </template>
            </el-dialog>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="版本管理" name="version-control">
        <div class="tab-content">
          <div class="version-control">
            <h3>元提示词版本管理</h3>
            
            <div class="version-selector">
              <el-select v-model="selectedTemplateId" placeholder="选择元提示词模板" @change="loadTemplateVersions">
                <el-option
                  v-for="template in metaTemplates"
                  :key="template.templateId"
                  :label="`${template.templateId} - ${template.description}`"
                  :value="template.templateId"
                />
              </el-select>
            </div>
            
            <div v-if="selectedTemplateId" class="version-history">
              <div class="version-list">
                <h4>版本历史</h4>
                <el-timeline>
                  <el-timeline-item
                    v-for="(version, index) in templateVersions"
                    :key="index"
                    :timestamp="formatDate(version.updatedAt)"
                    :type="index === 0 ? 'primary' : ''"
                  >
                    <el-card>
                      <h4>版本 {{ templateVersions.length - index }}</h4>
                      <p>更新者: {{ version.createdBy }}</p>
                      <p>{{ version.description }}</p>
                      <div class="version-actions">
                        <el-button 
                          type="primary" 
                          size="small" 
                          @click="viewVersionDetail(version)"
                        >查看</el-button>
                        <el-button 
                          type="success" 
                          size="small" 
                          @click="restoreVersion(version)"
                          :disabled="index === 0"
                        >恢复此版本</el-button>
                      </div>
                    </el-card>
                  </el-timeline-item>
                </el-timeline>
              </div>
              
              <el-dialog
                v-model="versionDialogVisible"
                title="版本详情"
                width="70%"
              >
                <template v-if="selectedVersion">
                  <h4>元提示词: {{ selectedVersion.templateId }}</h4>
                  <p><strong>描述:</strong> {{ selectedVersion.description }}</p>
                  <p><strong>更新时间:</strong> {{ formatDate(selectedVersion.updatedAt) }}</p>
                  <p><strong>更新者:</strong> {{ selectedVersion.createdBy }}</p>
                  
                  <el-divider />
                  
                  <h4>模板内容</h4>
                  <el-input
                    type="textarea"
                    :rows="12"
                    :modelValue="selectedVersion.template"
                    readonly
                  />
                </template>
              </el-dialog>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search } from '@element-plus/icons-vue'

export default {
  name: 'AdminConsole',
  setup() {
    // 通用状态
    const activeTab = ref('meta-prompts')
    const loading = ref(false)
    
    // 日期格式化函数
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // ===== 元提示词管理 =====
    const metaTemplates = ref([])
    const filteredMetaTemplates = ref([])
    const selectedMetaTemplate = ref(null)
    const searchQuery = ref('')
    const isEditMode = ref(false)
    
    const metaTemplateForm = reactive({
      templateId: '',
      description: '',
      template: ''
    })
    
    // 获取元提示词列表
    const fetchMetaTemplates = async () => {
      loading.value = true
      try {
        const response = await fetch('/api/prompts/meta-templates')
        const result = await response.json()
        
        if (result.success) {
          metaTemplates.value = result.metaTemplates
          filteredMetaTemplates.value = [...metaTemplates.value]
        } else {
          ElMessage.error('获取元提示词列表失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('获取元提示词列表出错:', error)
        ElMessage.error('获取元提示词失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
    
    // 筛选元提示词
    const filterMetaTemplates = () => {
      if (!searchQuery.value.trim()) {
        filteredMetaTemplates.value = [...metaTemplates.value]
        return
      }
      
      const query = searchQuery.value.toLowerCase()
      filteredMetaTemplates.value = metaTemplates.value.filter(template => 
        template.templateId.toLowerCase().includes(query) || 
        template.description.toLowerCase().includes(query)
      )
    }
    
    // 选择元提示词
    const selectMetaTemplate = (row) => {
      selectedMetaTemplate.value = row
      isEditMode.value = true
      
      // 填充表单
      metaTemplateForm.templateId = row.templateId
      metaTemplateForm.description = row.description
      metaTemplateForm.template = row.template
    }
    
    // 新建元提示词
    const createNewMetaPrompt = () => {
      isEditMode.value = false
      selectedMetaTemplate.value = {}
      
      // 重置表单
      metaTemplateForm.templateId = ''
      metaTemplateForm.description = ''
      metaTemplateForm.template = ''
    }
    
    // 编辑元提示词
    const editMetaTemplate = (template) => {
      selectMetaTemplate(template)
    }
    
    // 保存元提示词
    const saveMetaTemplate = async () => {
      if (!metaTemplateForm.templateId || !metaTemplateForm.template) {
        ElMessage.warning('模板ID和元提示词内容不能为空')
        return
      }
      
      loading.value = true
      try {
        const response = await fetch('/api/prompts/meta-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateId: metaTemplateForm.templateId,
            template: metaTemplateForm.template,
            description: metaTemplateForm.description
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          ElMessage.success(isEditMode.value ? '更新元提示词成功' : '创建元提示词成功')
          fetchMetaTemplates()
          selectedMetaTemplate.value = null
        } else {
          ElMessage.error((isEditMode.value ? '更新' : '创建') + '元提示词失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('保存元提示词失败:', error)
        ElMessage.error('保存失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
    
    // 取消编辑
    const cancelEdit = () => {
      selectedMetaTemplate.value = null
      metaTemplateForm.templateId = ''
      metaTemplateForm.description = ''
      metaTemplateForm.template = ''
    }
    
    // 确认删除元提示词
    const confirmDeleteMetaTemplate = (templateId) => {
      ElMessageBox.confirm(
        '确定要删除此元提示词吗？此操作不可恢复。',
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        deleteMetaTemplate(templateId)
      }).catch(() => {
        // 用户取消
      })
    }
    
    // 删除元提示词
    const deleteMetaTemplate = async (templateId) => {
      loading.value = true
      try {
        const response = await fetch(`/api/prompts/meta-template/${templateId}`, {
          method: 'DELETE'
        })
        
        const result = await response.json()
        
        if (result.success) {
          ElMessage.success('删除元提示词成功')
          fetchMetaTemplates()
          if (selectedMetaTemplate.value && selectedMetaTemplate.value.templateId === templateId) {
            selectedMetaTemplate.value = null
          }
        } else {
          ElMessage.error('删除元提示词失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('删除元提示词失败:', error)
        ElMessage.error('删除失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
    
    // ===== 提示词查看 =====
    const promptHistory = ref([])
    const filteredPromptHistory = ref([])
    const promptSearchQuery = ref('')
    const promptLoading = ref(false)
    const selectedPrompt = ref(null)
    const promptDialogVisible = ref(false)
    
    // 获取提示词历史
    const fetchPromptHistory = async () => {
      promptLoading.value = true
      try {
        const response = await fetch('/api/prompts/generated-list')
        const result = await response.json()
        
        if (result.success) {
          promptHistory.value = result.prompts
          filteredPromptHistory.value = [...promptHistory.value]
        } else {
          ElMessage.error('获取提示词历史失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('获取提示词历史出错:', error)
        ElMessage.error('获取历史失败，请检查网络连接')
      } finally {
        promptLoading.value = false
      }
    }
    
    // 筛选提示词历史
    const filterPromptHistory = () => {
      if (!promptSearchQuery.value.trim()) {
        filteredPromptHistory.value = [...promptHistory.value]
        return
      }
      
      const query = promptSearchQuery.value.toLowerCase()
      filteredPromptHistory.value = promptHistory.value.filter(prompt => 
        prompt.promptId.toLowerCase().includes(query) || 
        prompt.username.toLowerCase().includes(query) || 
        prompt.templateId.toLowerCase().includes(query) ||
        (prompt.productInfo && prompt.productInfo.productName && 
         prompt.productInfo.productName.toLowerCase().includes(query))
      )
    }
    
    // 选择提示词历史
    const selectPromptHistory = (row) => {
      selectedPrompt.value = row
      promptDialogVisible.value = true
    }
    
    // 关闭提示词详情对话框
    const closePromptDialog = () => {
      promptDialogVisible.value = false
      selectedPrompt.value = null
    }
    
    // ===== 版本管理 =====
    const selectedTemplateId = ref('')
    const templateVersions = ref([])
    const selectedVersion = ref(null)
    const versionDialogVisible = ref(false)
    
    // 加载模板版本
    const loadTemplateVersions = async () => {
      if (!selectedTemplateId.value) return
      
      loading.value = true
      try {
        const response = await fetch(`/api/prompts/meta-template-versions/${selectedTemplateId.value}`)
        const result = await response.json()
        
        if (result.success) {
          templateVersions.value = result.versions
        } else {
          ElMessage.error('获取版本历史失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('获取版本历史出错:', error)
        ElMessage.error('获取版本历史失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
    
    // 查看版本详情
    const viewVersionDetail = (version) => {
      selectedVersion.value = version
      versionDialogVisible.value = true
    }
    
    // 恢复版本
    const restoreVersion = async (version) => {
      ElMessageBox.confirm(
        '确定要恢复到此版本吗？当前版本将被覆盖。',
        '恢复确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        loading.value = true
        try {
          const response = await fetch('/api/prompts/restore-meta-template-version', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              templateId: version.templateId,
              versionId: version.versionId
            })
          })
          
          const result = await response.json()
          
          if (result.success) {
            ElMessage.success('恢复版本成功')
            loadTemplateVersions()
            fetchMetaTemplates()
          } else {
            ElMessage.error('恢复版本失败: ' + (result.message || '未知错误'))
          }
        } catch (error) {
          console.error('恢复版本失败:', error)
          ElMessage.error('恢复失败，请检查网络连接')
        } finally {
          loading.value = false
        }
      }).catch(() => {
        // 用户取消
      })
    }
    
    // 初始化
    onMounted(() => {
      fetchMetaTemplates()
      fetchPromptHistory()
    })
    
    return {
      // 图标
      Plus,
      Delete,
      Edit,
      Search,
      
      // 通用
      activeTab,
      loading,
      formatDate,
      
      // 元提示词管理
      metaTemplates,
      filteredMetaTemplates,
      selectedMetaTemplate,
      searchQuery,
      isEditMode,
      metaTemplateForm,
      fetchMetaTemplates,
      filterMetaTemplates,
      selectMetaTemplate,
      createNewMetaPrompt,
      editMetaTemplate,
      saveMetaTemplate,
      cancelEdit,
      confirmDeleteMetaTemplate,
      deleteMetaTemplate,
      
      // 提示词查看
      promptHistory,
      filteredPromptHistory,
      promptSearchQuery,
      promptLoading,
      selectedPrompt,
      promptDialogVisible,
      fetchPromptHistory,
      filterPromptHistory,
      selectPromptHistory,
      closePromptDialog,
      
      // 版本管理
      selectedTemplateId,
      templateVersions,
      selectedVersion,
      versionDialogVisible,
      loadTemplateVersions,
      viewVersionDetail,
      restoreVersion
    }
  }
}
</script>

<style scoped>
.admin-console {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h2 {
  font-size: 1.8rem;
  color: #1a56db;
}

.admin-tabs {
  width: 100%;
}

.tab-content {
  padding: 1rem 0;
}

.meta-prompt-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

.meta-prompt-list,
.meta-prompt-form {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.list-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  align-items: center;
}

.search-input {
  width: 250px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  gap: 1rem;
}

.prompt-history {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.search-filter {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.version-control {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.version-selector {
  margin: 1.5rem 0;
  width: 100%;
}

.version-selector .el-select {
  width: 100%;
}

.version-history {
  margin-top: 2rem;
}

.version-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .meta-prompt-editor {
    grid-template-columns: 1fr;
  }
}
</style> 