<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-container">
        <img src="/RSLOGO.png" alt="RSLOGO" class="app-logo" />
        <h1>LED灯带产品海报生成</h1>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/create" class="nav-link">创建海报</router-link>
        <router-link to="/history" class="nav-link">历史记录</router-link>
        <router-link v-if="isAdmin" to="/admin/templates" class="nav-link">模板管理</router-link>
      </div>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <p>&copy; {{ new Date().getFullYear() }} LED灯带产品海报生成工具 - 版权所有</p>
    </footer>
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    'el-icon-plus': Plus
  },
  data() {
    return {
      isAdmin: false,
      username: 'admin' // 默认用户，实际项目中应该从登录状态获取
    }
  },
  mounted() {
    this.checkAdminStatus();
  },
  methods: {
    async checkAdminStatus() {
      try {
        const response = await fetch(`/api/admin/check-auth?username=${this.username}`);
        const result = await response.json();
        
        if (result.success) {
          this.isAdmin = result.isAdmin;
        }
      } catch (error) {
        console.error('检查管理员状态失败:', error);
      }
    }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #1a56db;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 4px;
}

.logo-container h1 {
  color: #1a56db;
  font-size: 1.2rem;
  margin: 0;
}

.app-logo {
  height: 30px;
  margin-right: 1rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.app-main {
  flex: 1;
  padding: 2rem;
}

.app-footer {
  background-color: #f3f4f6;
  padding: 1rem;
  text-align: center;
  margin-top: auto;
}
</style> 