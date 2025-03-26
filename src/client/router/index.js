import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/create',
    name: 'Create',
    // 使用懒加载以提高初始加载性能
    component: () => import('../views/CreatePoster.vue')
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/PosterHistory.vue')
  },
  {
    path: '/admin/templates',
    name: 'TemplateManager',
    component: () => import('../views/TemplateManager.vue'),
    meta: {
      requiresAdmin: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 添加全局前置守卫检查管理员权限
router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    // 检查用户是否为管理员
    try {
      const response = await fetch('/api/admin/check-auth');
      const result = await response.json();
      
      if (result.success && result.isAdmin) {
        next();
      } else {
        next('/');
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      next('/');
    }
  } else {
    next();
  }
});

export default router; 