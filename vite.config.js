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
          changeOrigin: true
        }
      }
    }
  }
})
