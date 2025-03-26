import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';

// 创建Vue应用实例
const app = createApp(App);

// 注册Element Plus
app.use(ElementPlus);

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 注册路由
app.use(router);
// 挂载应用
app.mount('#app'); 