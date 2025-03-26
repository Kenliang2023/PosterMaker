import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/create',
    name: 'Create',
    // 使用懒加载以提高初始加载性能
    component: () => import('../views/CreatePoster.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/PosterHistory.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/admin/templates',
    name: 'TemplateManager',
    component: () => import('../views/TemplateManager.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/console',
    name: 'AdminConsole',
    component: () => import('../views/AdminConsole.vue'),
    meta: {
      requiresAuth: true,
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

// 添加全局前置守卫检查登录状态和管理员权限
router.beforeEach((to, from, next) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isLoggedIn = !!user;
  const isAdmin = user && user.role === 'admin';
  
  // 检查是否需要登录
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      // 未登录，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      });
      return;
    }
    
    // 检查是否需要管理员权限
    if (to.matched.some(record => record.meta.requiresAdmin) && !isAdmin) {
      // 不是管理员，跳转到首页
      next('/');
      return;
    }
  }
  
  // 如果已登录且尝试访问登录页，重定向到首页
  if (to.path === '/login' && isLoggedIn) {
    next('/');
    return;
  }
  
  next();
});

export default router; 