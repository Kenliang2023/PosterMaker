<template>
  <div class="not-found">
    <h2>404 - 页面未找到</h2>
    <p>抱歉，您请求的页面不存在。</p>
    <button class="back-button" @click="goBack">返回首页</button>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  methods: {
    goBack() {
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
.not-found {
  max-width: 600px;
  margin: 4rem auto;
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h2 {
  color: #d32f2f;
  font-size: 2rem;
  margin-bottom: 1rem;
}

p {
  margin-bottom: 2rem;
  color: #666;
}

.back-button {
  background-color: #1a56db;
  color: white;
  font-weight: bold;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #1e429f;
}
</style> 