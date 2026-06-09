import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE || '/ai_bid/api'
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      proxy: {
        // 后端 application.yml 里 app.api-prefix 是 /ai_bid/api。
        // 开发环境前端请求 /ai_bid/api/** 时，会被代理到 Spring Boot。
        [apiBase]: {
          target: proxyTarget,
          changeOrigin: true,
          // AI生成接口可能持续数分钟甚至更久，开发代理不主动断开。
          timeout: 0,
          proxyTimeout: 0
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@element-plus/icons-vue')) return 'vendor-icons'
            if (id.includes('element-plus')) return 'vendor-element-plus'
            if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue'
            if (id.includes('axios')) return 'vendor-http'
            return 'vendor'
          }
        }
      }
    }
  }
})
