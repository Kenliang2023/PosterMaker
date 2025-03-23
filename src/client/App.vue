<template>
  <div class="app-container">
    <header class="bg-led-primary text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">LED灯带产品海报生成</h1>
        <div>
          <!-- 后续添加用户状态 -->
        </div>
      </div>
    </header>
    
    <main class="container mx-auto p-4">
      <div class="card max-w-4xl mx-auto my-8">
        <h2 class="text-xl mb-4 text-center">欢迎使用LED灯带产品海报生成应用</h2>
        <p class="text-center mb-8">
          这是一个帮助LED灯带产品制造商快速生成专业营销海报的应用工具
        </p>
        
        <div class="text-center">
          <button class="btn-primary">开始使用</button>
        </div>
      </div>
    </main>
    
    <footer class="bg-led-dark text-white p-4 mt-auto">
      <div class="container mx-auto text-center">
        <p>© {{ new Date().getFullYear() }} LED灯带产品海报生成应用</p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      // 应用状态数据
    }
  }
}
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style> 