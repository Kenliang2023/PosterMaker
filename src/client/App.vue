<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-container">
        <h1>LED灯带产品海报生成</h1>
      </div>
      <div v-if="isLoggedIn" class="nav-links">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/create" class="nav-link">创建海报</router-link>
        <router-link to="/history" class="nav-link">历史记录</router-link>
        <router-link v-if="isAdmin" to="/admin/templates" class="nav-link">模板管理</router-link>
        <router-link v-if="isAdmin" to="/admin/console" class="nav-link">管理控制台</router-link>
        <div class="user-info">
          <span>{{ currentUser.name || currentUser.username }}</span>
          <el-dropdown @command="handleCommand">
            <el-icon class="user-icon"><User /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div v-else class="login-button-container">
        <router-link to="/login" class="login-button">登录</router-link>
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
import { Plus, User } from '@element-plus/icons-vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'App',
  components: {
    'el-icon-plus': Plus,
    User
  },
  setup() {
    const router = useRouter()
    const isLoggedIn = ref(false)
    const isAdmin = ref(false)
    const currentUser = ref({})
    
    // 检查登录状态
    const checkLoginStatus = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          currentUser.value = user
          isLoggedIn.value = true
          isAdmin.value = user.role === 'admin'
        } catch (e) {
          // 解析异常，清除失效的存储
          localStorage.removeItem('user')
          isLoggedIn.value = false
          isAdmin.value = false
        }
      } else {
        isLoggedIn.value = false
        isAdmin.value = false
      }
    }
    
    // 处理下拉菜单命令
    const handleCommand = (command) => {
      if (command === 'logout') {
        ElMessageBox.confirm(
          '确定要退出登录吗？',
          '退出确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          // 清除登录状态
          localStorage.removeItem('user')
          isLoggedIn.value = false
          isAdmin.value = false
          currentUser.value = {}
          ElMessage.success('已成功退出登录')
          
          // 跳转到首页
          router.push('/')
        }).catch(() => {
          // 用户取消操作
        })
      }
    }
    
    onMounted(() => {
      checkLoginStatus()
    })
    
    return {
      isLoggedIn,
      isAdmin,
      currentUser,
      handleCommand
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

.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
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

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
}

.user-icon {
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.user-icon:hover {
  transform: scale(1.1);
}

.login-button-container {
  display: flex;
  align-items: center;
}

.login-button {
  color: white;
  text-decoration: none;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style> 