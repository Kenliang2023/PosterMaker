<template>
  <div class="home-container">
    <div class="welcome-card">
      <h2 class="title">欢迎使用LED灯带产品海报生成应用</h2>
      <p class="description">
        这是一个帮助LED灯带产品制造商快速生成专业营销海报的应用工具
      </p>
      
      <div class="action-buttons">
        <button class="primary-button" @click="startUsing">开始使用</button>
      </div>
    </div>
    
    <div class="features-section">
      <div class="feature-card">
        <h3>快速生成</h3>
        <p>几分钟内生成高质量LED产品营销海报</p>
      </div>
      
      <div class="feature-card">
        <h3>专业模板</h3>
        <p>多种专业设计模板，针对不同LED产品优化</p>
      </div>
      
      <div class="feature-card">
        <h3>AI驱动</h3>
        <p>Gemini AI提供强大的图像生成能力</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  methods: {
    startUsing() {
      this.$router.push('/create');
    }
  }
}
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.welcome-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #1a56db;
}

.description {
  font-size: 1.1rem;
  color: #4b5563;
  margin-bottom: 2rem;
}

.action-buttons {
  margin-top: 1.5rem;
}

.primary-button {
  background-color: #1a56db;
  color: white;
  font-weight: bold;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: #1e429f;
}

.features-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  text-align: center;
}

.feature-card h3 {
  color: #1a56db;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
}

.feature-card p {
  color: #6b7280;
}
</style> 