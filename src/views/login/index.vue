<template>
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <div class="login-logo">AI</div>
        <div>
          <div class="login-title">AI标书后台管理系统</div>
          <div class="login-subtitle">标书生成、招标公告、一键报备、知识库管理</div>
        </div>
      </div>

      <div class="feature-grid">
        <div class="feature-card">标书项目创建</div>
        <div class="feature-card">Prompt模板管理</div>
        <div class="feature-card">AI一键生成</div>
        <div class="feature-card">Word/Markdown导出</div>
      </div>
    </div>

    <div class="login-panel card">
      <div class="panel-title">账号登录</div>
      <div class="panel-sub">后端接口：/ai_bid/api/auth/login</div>

      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="account">
          <el-input v-model="form.account" size="large" placeholder="账号或手机号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="密码"
            :prefix-icon="Lock"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item prop="captchaCode">
          <div class="captcha-row">
            <el-input
              v-model="form.captchaCode"
              size="large"
              placeholder="验证码"
              :prefix-icon="Picture"
              @keyup.enter="submit"
            />
            <img
              v-if="captchaImage"
              class="captcha-img"
              :src="captchaImage"
              title="点击刷新验证码"
              @click="loadCaptcha"
            />
          </div>
        </el-form-item>

        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="submit">
          登录
        </el-button>
      </el-form>

      <div class="login-tip">
        登录需要验证码，验证码图片来自后端 /auth/captcha；token 保存到 localStorage。
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Picture, User } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const captchaImage = ref('')

const form = reactive({
  account: '',
  password: '',
  captchaKey: '',
  captchaCode: ''
})

const rules = {
  account: [{ required: true, message: '请输入账号或手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

onMounted(loadCaptcha)

async function loadCaptcha() {
  const res = await getCaptcha()
  form.captchaKey = res?.captchaKey || ''
  captchaImage.value = res?.captchaImage || ''
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    await auth.login(form)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect ? decodeURIComponent(route.query.redirect) : '/dashboard'
    router.replace(redirect)
  } catch (e) {
    // 验证码错误或密码错误后刷新验证码，避免重复提交旧验证码。
    await loadCaptcha()
    form.captchaCode = ''
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  min-height: 100vh;
  padding: 48px;
  gap: 36px;
  background:
    radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.18), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #edf4ff 100%);
}

.login-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-logo {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--aliyun-orange);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(37, 99, 235, .22);
}

.login-title {
  font-size: 34px;
  font-weight: 800;
}

.login-subtitle {
  margin-top: 10px;
  color: var(--text-sub);
  font-size: 15px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 180px);
  gap: 14px;
  margin-top: 46px;
}

.feature-card {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, .78);
  border: 1px solid rgba(226, 232, 240, .9);
  box-shadow: var(--shadow-soft);
  font-weight: 700;
}

.login-panel {
  align-self: center;
  padding: 28px;
}

.panel-title {
  font-size: 24px;
  font-weight: 800;
}

.panel-sub {
  margin-top: 8px;
  color: var(--text-sub);
}

.login-form {
  margin-top: 28px;
}

.captcha-row {
  display: flex;
  width: 100%;
  gap: 10px;
}

.captcha-img {
  width: 120px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
}

.login-btn {
  width: 100%;
}

.login-tip {
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-sub);
}

@media (max-width: 900px) {
  .login-page {
    display: block;
    padding: 24px;
  }

  .login-left {
    display: none;
  }

  .login-panel {
    margin: 8vh auto 0;
    max-width: 420px;
  }
}
</style>
