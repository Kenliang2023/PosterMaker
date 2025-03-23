import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client')
    }
  },
  server: {
    proxy: {
      // 将API请求代理到Express服务器
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // 构建输出到Express的静态资源目录
  build: {
    outDir: 'public',
    emptyOutDir: true
  }
}); 