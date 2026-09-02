<template>
  <div class="login-page" :class="{ 'is-reset-mode': pageMode === 'reset' }">
    <div class="login-bg-shape shape-one"></div>
    <div class="login-bg-shape shape-two"></div>
    <div class="login-bg-shape shape-three"></div>

    <header class="page-brand">
      <span class="brand-mark"><i></i><i></i><i></i></span>
      <strong>恒鼎·智慧AI</strong>
    </header>

    <main class="login-layout">
      <section v-if="pageMode === 'login'" class="brand-showcase">
        <div class="brand-copy">
          <h2>恒鼎·智慧<span>AI</span></h2>
          <p>智能决策 <i></i> 高效协同 <i></i> 价值创造</p>
          <div class="security-badge"><span>✓</span> 企业级安全防护 · 数据隐私保障</div>
        </div>
        <div class="ai-scene" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="scene-card card-chart">⌁</div>
          <div class="scene-card card-data">▥</div>
          <div class="ai-stage"><div class="ai-cube">AI</div></div>
          <span class="scene-dot dot-one"></span>
          <span class="scene-dot dot-two"></span>
          <span class="scene-dot dot-three"></span>
        </div>
      </section>

    <section v-if="pageMode === 'login'" class="login-card">

      <h1 class="welcome-title">欢迎使用恒鼎·智慧AI</h1>

      <el-alert
        v-if="loginExpiredTipVisible"
        class="login-expired-alert"
        title="登录已过期，请重新登录"
        type="warning"
        show-icon
        :closable="true"
        @close="loginExpiredTipVisible = false"
      />

      <div class="login-tabs">
        <button
          type="button"
          class="tab-item"
          :class="{ active: activeTab === 'sms' }"
          @click="switchTab('sms')"
        >
          短信登录
        </button>
        <button
          type="button"
          class="tab-item"
          :class="{ active: activeTab === 'password' }"
          @click="switchTab('password')"
        >
          密码登录
        </button>
      </div>

      <el-form
        v-show="activeTab === 'sms'"
        ref="smsFormRef"
        :model="smsForm"
        :rules="smsRules"
        class="login-form"
        @submit.prevent
      >
        <el-form-item prop="phone">
          <div class="phone-input-wrap">
            <div class="area-code">+86</div>
            <el-input
              v-model.trim="smsForm.phone"
              size="large"
              placeholder="请输入手机号"
              maxlength="11"
              @keyup.enter="submitSmsLogin"
            />
          </div>
        </el-form-item>

        <el-form-item prop="smsCode">
          <div class="sms-code-row">
            <el-input
              v-model.trim="smsForm.smsCode"
              size="large"
              placeholder="请输入验证码"
              maxlength="6"
              @keyup.enter="submitSmsLogin"
            />
            <el-button
              class="code-btn"
              type="primary"
              size="large"
              :loading="smsCodeLoading"
              :disabled="countdown > 0"
              @click="handleSendSmsCode"
            >
              {{ countdown > 0 ? `${countdown}s后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <div class="agreement-row">
          <el-checkbox v-model="smsForm.agreementAccepted" size="small" />
          <span>阅读并同意</span>
          <button type="button" class="link-btn" @click="openAgreement('user')">《用户协议》</button>
          <span>和</span>
          <button type="button" class="link-btn" @click="openAgreement('privacy')">《隐私协议》</button>
        </div>

        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="submitSmsLogin"
        >
          登录/注册
        </el-button>
      </el-form>

      <el-form
        v-show="activeTab === 'password'"
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        class="login-form"
        @submit.prevent
      >
        <el-form-item prop="phone">
          <div class="phone-input-wrap">
            <div class="area-code">+86</div>
            <el-input
              v-model.trim="passwordForm.phone"
              size="large"
              placeholder="请输入手机号"
              maxlength="11"
              @keyup.enter="submitPasswordLogin"
            />
          </div>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="passwordForm.password"
            size="large"
            type="password"
            show-password
            placeholder="请输入登录密码"
            @keyup.enter="submitPasswordLogin"
          />
        </el-form-item>

        <el-form-item prop="captchaCode">
          <div class="captcha-row">
            <el-input
              v-model.trim="passwordForm.captchaCode"
              size="large"
              placeholder="请输入图形验证码"
              maxlength="4"
              @keyup.enter="submitPasswordLogin"
            />
            <img
              v-if="captchaImage"
              class="captcha-img"
              :src="captchaImage"
              title="点击刷新验证码"
              alt="图形验证码"
              @click="loadCaptcha"
            />
          </div>
        </el-form-item>

        <div class="agreement-row">
          <el-checkbox v-model="passwordForm.agreementAccepted" size="small" />
          <span>阅读并同意</span>
          <button type="button" class="link-btn" @click="openAgreement('user')">《用户协议》</button>
          <span>和</span>
          <button type="button" class="link-btn" @click="openAgreement('privacy')">《隐私协议》</button>
        </div>

        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="submitPasswordLogin"
        >
          登录
        </el-button>
      </el-form>

      <button
        v-if="activeTab === 'password'"
        type="button"
        class="forget-btn"
        @click="handleForgetPassword"
      >
        忘记密码?
      </button>

    </section>

    <section v-else class="reset-page-card">
      <button type="button" class="reset-back-btn" aria-label="返回登录" @click="backToLogin">
        ←
      </button>

      <h1 class="reset-page-title">找回密码</h1>

      <el-form
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetRules"
        label-width="0"
        class="reset-page-form"
        @submit.prevent
      >
        <el-form-item prop="phone">
          <div class="phone-input-wrap">
            <div class="area-code">+86</div>
            <el-input
              v-model.trim="resetForm.phone"
              size="large"
              placeholder="请输入手机号"
              maxlength="11"
              @keyup.enter="handleSendResetSmsCode"
            />
          </div>
        </el-form-item>

        <el-form-item prop="smsCode">
          <div class="sms-code-row">
            <el-input
              v-model.trim="resetForm.smsCode"
              size="large"
              placeholder="请输入验证码"
              maxlength="6"
              @keyup.enter="submitResetPassword"
            />
            <el-button
              class="code-btn"
              type="primary"
              size="large"
              :loading="resetCodeLoading"
              :disabled="resetCountdown > 0"
              @click="handleSendResetSmsCode"
            >
              {{ resetCountdown > 0 ? `${resetCountdown}s后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item prop="newPassword">
          <el-input
            v-model="resetForm.newPassword"
            size="large"
            type="password"
            show-password
            placeholder="设置登录密码"
            @keyup.enter="submitResetPassword"
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="resetForm.confirmPassword"
            size="large"
            type="password"
            show-password
            placeholder="再次确认登录密码"
            @keyup.enter="submitResetPassword"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="submit-btn reset-submit-btn"
          :loading="resetLoading"
          @click="submitResetPassword"
        >
          设置密码
        </el-button>
      </el-form>
    </section>

    </main>

    <footer class="login-footer">
      <span>© 2026 恒鼎·智慧AI 版权所有</span>
      <i></i><button type="button" @click="openAgreement('user')">用户协议</button>
      <i></i><button type="button" @click="openAgreement('privacy')">隐私协议</button>
      <i></i><span>帮助中心</span>
      <i></i><span>推荐使用 Chrome、Edge 等现代浏览器</span>
    </footer>

    <el-dialog v-model="agreementVisible" :title="agreementTitle" width="520px">
      <div class="agreement-content">
        {{ agreementContent }}
      </div>
      <template #footer>
        <el-button type="primary" @click="agreementVisible = false">我知道了</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from '@/plugins/element-plus-api'
import { getCaptcha, resetPassword, sendResetPasswordSmsCode, sendSmsCode } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const pageMode = ref('login')
const activeTab = ref('password')
const smsFormRef = ref()
const passwordFormRef = ref()
const resetFormRef = ref()
const loading = ref(false)
const smsCodeLoading = ref(false)
const resetCodeLoading = ref(false)
const resetLoading = ref(false)
const captchaImage = ref('')
const countdown = ref(0)
const resetCountdown = ref(0)
const agreementVisible = ref(false)
const agreementType = ref('user')
const loginExpiredTipVisible = ref(false)

let countdownTimer = null
let resetCountdownTimer = null

const phoneReg = /^1[3-9]\d{9}$/

const smsForm = reactive({
  phone: '',
  smsCode: '',
  agreementAccepted: true
})

const passwordForm = reactive({
  phone: '',
  password: '',
  captchaKey: '',
  captchaCode: '',
  agreementAccepted: true
})

const resetForm = reactive({
  phone: '',
  smsCode: '',
  newPassword: '',
  confirmPassword: ''
})


const smsRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phoneReg, message: '手机号格式不正确', trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入短信验证码', trigger: 'blur' },
    { min: 4, max: 6, message: '验证码长度不正确', trigger: 'blur' }
  ]
}

const passwordRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phoneReg, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入图形验证码', trigger: 'blur' }]
}


const resetRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phoneReg, message: '手机号格式不正确', trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入短信验证码', trigger: 'blur' },
    { min: 4, max: 6, message: '验证码长度不正确', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, max: 32, message: '登录密码长度必须在 6 到 32 位之间', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入登录密码', trigger: 'blur' },
    { min: 6, max: 32, message: '确认密码长度必须在 6 到 32 位之间', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== resetForm.newPassword) {
          callback(new Error('两次输入的登录密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const agreementTitle = computed(() => agreementType.value === 'privacy' ? '隐私协议' : '用户协议')
const agreementContent = computed(() => {
  if (agreementType.value === 'privacy') {
    return '这里展示隐私协议内容。后续如果有正式协议页面，可以把这里改成跳转到正式页面或展示后端维护的协议内容。'
  }
  return '这里展示用户协议内容。后续如果有正式协议页面，可以把这里改成跳转到正式页面或展示后端维护的协议内容。'
})

watch(
  () => route.query.expired,
  (value) => {
    loginExpiredTipVisible.value = String(value || '') === '1'
  },
  { immediate: true }
)

onMounted(() => {
  loadCaptcha()
})

onBeforeUnmount(() => {
  clearCountdownTimer()
  clearResetCountdownTimer()
})

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'password' && !captchaImage.value) {
    loadCaptcha()
  }
}

async function loadCaptcha() {
  try {
    const res = await getCaptcha()
    passwordForm.captchaKey = res?.captchaKey || ''
    captchaImage.value = res?.captchaImage || ''
  } catch (e) {
    passwordForm.captchaKey = ''
    captchaImage.value = ''
  }
}

async function handleSendSmsCode() {
  await smsFormRef.value.validateField('phone')
  smsCodeLoading.value = true
  try {
    await sendSmsCode({ phone: smsForm.phone })
    ElMessage.success('验证码已发送')
    startCountdown()
  } finally {
    smsCodeLoading.value = false
  }
}

async function handleSendResetSmsCode() {
  await resetFormRef.value.validateField('phone')
  resetCodeLoading.value = true
  try {
    await sendResetPasswordSmsCode({ phone: resetForm.phone })
    ElMessage.success('验证码已发送')
    startResetCountdown()
  } finally {
    resetCodeLoading.value = false
  }
}

async function submitSmsLogin() {
  await smsFormRef.value.validate()
  if (!smsForm.agreementAccepted) {
    ElMessage.warning('请先阅读并同意用户协议和隐私协议')
    return
  }

  loading.value = true
  try {
    const res = await auth.smsLogin({
      phone: smsForm.phone,
      smsCode: smsForm.smsCode,
      agreementAccepted: smsForm.agreementAccepted
    })
    handleLoginSuccess(res)
  } finally {
    loading.value = false
  }
}

async function submitPasswordLogin() {
  await passwordFormRef.value.validate()
  if (!passwordForm.agreementAccepted) {
    ElMessage.warning('请先阅读并同意用户协议和隐私协议')
    return
  }

  loading.value = true
  try {
    const res = await auth.login({
      phone: passwordForm.phone,
      password: passwordForm.password,
      captchaKey: passwordForm.captchaKey,
      captchaCode: passwordForm.captchaCode
    })
    handleLoginSuccess(res)
  } catch (e) {
    passwordForm.captchaCode = ''
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

async function submitResetPassword() {
  await resetFormRef.value.validate()
  resetLoading.value = true
  try {
    await resetPassword({
      phone: resetForm.phone,
      smsCode: resetForm.smsCode,
      newPassword: resetForm.newPassword,
      confirmPassword: resetForm.confirmPassword
    })
    ElMessage.success('密码设置成功，请使用新密码登录')
    passwordForm.phone = resetForm.phone
    passwordForm.password = ''
    passwordForm.captchaCode = ''
    activeTab.value = 'password'
    backToLogin(false)
    await loadCaptcha()
  } finally {
    resetLoading.value = false
  }
}

function handleLoginSuccess() {
  ElMessage.success('登录成功')
  // 企业信息补全不在登录页处理。
  // 登录成功后先进入首页，由 AdminLayout 根据 auth.needCompleteEnterprise 弹出补全窗口。
  redirectAfterLogin()
}

function redirectAfterLogin() {
  const rawRedirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
  const redirect = rawRedirect || '/dashboard'
  router.replace(redirect)
}

function startCountdown() {
  clearCountdownTimer()
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearCountdownTimer()
    }
  }, 1000)
}

function startResetCountdown() {
  clearResetCountdownTimer()
  resetCountdown.value = 60
  resetCountdownTimer = window.setInterval(() => {
    resetCountdown.value -= 1
    if (resetCountdown.value <= 0) {
      clearResetCountdownTimer()
    }
  }, 1000)
}

function clearCountdownTimer() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function clearResetCountdownTimer() {
  if (resetCountdownTimer) {
    window.clearInterval(resetCountdownTimer)
    resetCountdownTimer = null
  }
}

function openAgreement(type) {
  agreementType.value = type
  agreementVisible.value = true
}

async function handleForgetPassword() {
  resetForm.phone = passwordForm.phone || smsForm.phone || ''
  resetForm.smsCode = ''
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  pageMode.value = 'reset'
  await nextTick()
  resetFormRef.value?.clearValidate?.()
}

function backToLogin(keepPhone = true) {
  pageMode.value = 'login'
  resetForm.smsCode = ''
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  resetLoading.value = false
  resetCodeLoading.value = false
  clearResetCountdownTimer()
  resetCountdown.value = 0
  if (!keepPhone) {
    resetForm.phone = ''
  }
}

</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  box-sizing: border-box;
  background:
    linear-gradient(116deg, rgba(246, 249, 255, 0.98) 0%, rgba(237, 244, 255, 0.95) 100%),
    radial-gradient(circle at 88% 14%, rgba(76, 139, 245, 0.16), transparent 28%);
}

.login-page::before,
.login-page::after {
  position: absolute;
  content: "";
  pointer-events: none;
}

.login-page::before {
  left: -9vw;
  bottom: -14vh;
  width: 72vw;
  height: 46vh;
  background: rgba(216, 230, 255, 0.46);
  clip-path: polygon(0 36%, 100% 0, 82% 100%, 0 100%);
}

.login-page::after {
  right: -4vw;
  top: -9vh;
  width: 54vw;
  height: 31vh;
  background: rgba(232, 240, 255, 0.74);
  clip-path: polygon(8% 0, 100% 0, 100% 100%, 38% 54%);
}

.login-bg-shape {
  position: absolute;
  pointer-events: none;
  background: rgba(228, 237, 254, 0.62);
}

.shape-one {
  left: 0;
  bottom: 7vh;
  width: 89vw;
  height: 30vh;
  clip-path: polygon(0 60%, 52% 0, 100% 100%, 0 100%);
}

.shape-two {
  right: 10vw;
  bottom: 15vh;
  width: 39vw;
  height: 23vh;
  background: rgba(218, 232, 255, 0.4);
  clip-path: polygon(0 0, 100% 55%, 18% 100%);
}

.shape-three {
  left: 7vw;
  top: 7vh;
  width: 22vw;
  height: 16vh;
  background: rgba(245, 248, 255, 0.62);
  clip-path: polygon(0 0, 100% 34%, 36% 100%);
}

.login-card {
  position: relative;
  z-index: 2;
  width: 526px;
  min-height: 710px;
  padding: 62px 62px 46px;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 18px 45px rgba(31, 56, 88, 0.08);
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-name {
  font-size: 39px;
  line-height: 1;
  color: #2f3238;
  font-weight: 900;
  letter-spacing: 2px;
}

.welcome-title {
  margin: 50px 0 32px;
  color: #050b17;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.35;
}

.login-expired-alert {
  margin: 0 0 18px;
}

.login-tabs {
  display: flex;
  align-items: flex-end;
  height: 50px;
  border-bottom: 1px solid #d9e2f4;
}

.tab-item {
  position: relative;
  height: 50px;
  margin-right: 28px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: #8b98ad;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}

.tab-item.active {
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.tab-item.active::after {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  content: "";
  background: #356df6;
  border-radius: 3px;
}

.login-form {
  margin-top: 43px;
}

.login-form :deep(.el-form-item),
.reset-page-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__wrapper),
.reset-page-form :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 4px;
  box-shadow: 0 0 0 1px #dce5f6 inset;
  background: #fff;
}

.login-form :deep(.el-input__wrapper.is-focus),
.reset-page-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3b6ff6 inset;
}

.phone-input-wrap {
  display: flex;
  width: 100%;
}

.area-code {
  width: 53px;
  height: 38px;
  flex: 0 0 53px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1d2939;
  font-size: 15px;
  font-weight: 600;
  background: #f8fbff;
  border: 1px solid #dce5f6;
  border-right: none;
  border-radius: 4px 0 0 4px;
  box-sizing: border-box;
}

.phone-input-wrap :deep(.el-input__wrapper) {
  border-radius: 0 4px 4px 0;
}

.sms-code-row,
.captcha-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.sms-code-row .el-input,
.captcha-row .el-input {
  flex: 1;
}

.code-btn {
  width: 122px;
  flex: 0 0 122px;
  border-radius: 4px;
  font-weight: 700;
}

.captcha-img {
  width: 122px;
  height: 38px;
  flex: 0 0 122px;
  border: 1px solid #dce5f6;
  border-radius: 4px;
  cursor: pointer;
  object-fit: cover;
  box-sizing: border-box;
}

.agreement-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin: 2px 0 38px;
  color: #6b778c;
  font-size: 14px;
  line-height: 22px;
}

.agreement-row :deep(.el-checkbox) {
  height: 22px;
  margin-right: 0;
}

.link-btn,
.forget-btn,
.reset-back-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.link-btn {
  color: #326cf6;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 38px;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 800;
  background: #356df6;
  border-color: #356df6;
}

.forget-btn {
  margin-top: 28px;
  color: #326cf6;
  font-size: 14px;
}

.agreement-content {
  color: #4b5563;
  line-height: 1.8;
}


.reset-page-card {
  position: relative;
  z-index: 2;
  width: 600px;
  min-height: 610px;
  padding: 66px 72px 62px;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 18px 45px rgba(31, 56, 88, 0.06);
}

.reset-back-btn {
  position: absolute;
  left: 72px;
  top: 67px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111827;
  font-size: 29px;
  line-height: 1;
  font-weight: 400;
}

.reset-page-title {
  margin: 26px 0 72px;
  text-align: center;
  color: #050b17;
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: 1px;
}

.reset-page-form {
  width: 456px;
  margin: 0 auto;
}

.reset-page-form :deep(.el-input__inner) {
  font-size: 14px;
}

.reset-submit-btn {
  margin-top: 25px;
}

@media (max-width: 760px) {
  .login-page {
    align-items: flex-start;
    padding: 28px 16px;
  }

  .login-card,
  .reset-page-card {
    width: 100%;
    min-height: auto;
    padding: 38px 24px 34px;
  }

  .brand-name {
    font-size: 32px;
  }

  .welcome-title {
    margin-top: 36px;
    font-size: 22px;
  }

  .tab-item.active {
    font-size: 20px;
  }

  .reset-back-btn {
    left: 24px;
    top: 38px;
  }

  .reset-page-title {
    margin: 20px 0 42px;
    font-size: 24px;
  }

  .reset-page-form {
    width: 100%;
  }

  .sms-code-row,
  .captcha-row {
    gap: 10px;
  }

  .code-btn,
  .captcha-img {
    width: 112px;
    flex-basis: 112px;
  }
}

/* 2026 登录页视觉升级：保留原有登录逻辑，仅调整布局与视觉 */
.login-page {
  display: block;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% 13%, rgba(120, 165, 255, .20), transparent 26%),
    radial-gradient(circle at 18% 58%, rgba(116, 166, 255, .12), transparent 28%),
    linear-gradient(125deg, #f9fbff 0%, #f1f6ff 50%, #edf4ff 100%);
}

.login-page::before {
  left: auto;
  right: -13vw;
  bottom: 58px;
  width: 72vw;
  height: 56vh;
  opacity: .82;
  background: linear-gradient(145deg, rgba(255,255,255,.8), rgba(205,221,255,.5));
  clip-path: polygon(26% 27%, 100% 0, 100% 100%, 0 100%);
}

.login-page::after {
  top: 74px;
  right: 0;
  width: 190px;
  height: 190px;
  opacity: .5;
  background-image: radial-gradient(#b8d0ff 1.6px, transparent 1.6px);
  background-size: 17px 17px;
  clip-path: none;
}

.shape-one {
  left: 0;
  bottom: 58px;
  width: 100%;
  height: 22vh;
  opacity: .48;
  background: linear-gradient(170deg, transparent 0 20%, #dfeaff 21% 45%, #edf3ff 46% 100%);
  clip-path: polygon(0 68%, 40% 8%, 68% 60%, 100% 6%, 100% 100%, 0 100%);
}

.shape-two {
  right: -7vw;
  bottom: 58px;
  width: 62vw;
  height: 36vh;
  opacity: .72;
  background: linear-gradient(150deg, rgba(255,255,255,.78), rgba(195,215,255,.30));
  clip-path: polygon(20% 38%, 100% 0, 100% 100%, 0 100%);
}

.shape-three {
  left: 30%;
  top: 12%;
  width: 35vw;
  height: 35vw;
  border-radius: 50%;
  opacity: .5;
  filter: blur(30px);
  background: rgba(255,255,255,.82);
  clip-path: none;
}

.page-brand {
  position: absolute;
  z-index: 5;
  left: clamp(34px, 4vw, 72px);
  top: 38px;
  display: flex;
  align-items: center;
  gap: 13px;
  color: #122039;
}

.page-brand strong {
  font-size: 25px;
  font-weight: 900;
  letter-spacing: .5px;
}

.brand-mark {
  position: relative;
  width: 32px;
  height: 30px;
  display: inline-block;
}

.brand-mark i {
  position: absolute;
  width: 9px;
  height: 27px;
  border-radius: 7px;
  transform: rotate(42deg);
  background: linear-gradient(180deg, #2f5cff, #3f92ff);
  box-shadow: 0 3px 9px rgba(47,93,255,.2);
}

.brand-mark i:nth-child(1) { left: 4px; top: 1px; }
.brand-mark i:nth-child(2) { left: 14px; top: -3px; }
.brand-mark i:nth-child(3) { left: 21px; top: 5px; height: 20px; background: linear-gradient(180deg, #6f7aff, #275eff); }

.login-layout {
  position: relative;
  z-index: 2;
  width: min(1460px, calc(100% - 80px));
  min-height: calc(100vh - 58px);
  margin: 0 auto;
  padding: 90px 0 72px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(430px, 1fr) minmax(530px, 600px);
  align-items: center;
  gap: clamp(40px, 6vw, 100px);
}

.brand-showcase {
  min-width: 0;
  padding: 42px 0 0 40px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-copy {
  position: relative;
  z-index: 2;
  padding-left: 38px;
}

.brand-copy h2 {
  margin: 0;
  color: #10213f;
  font-size: clamp(38px, 3vw, 56px);
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: 3px;
}

.brand-copy h2 span {
  margin-left: 12px;
  color: #3566f5;
  font-size: 1.08em;
}

.brand-copy p {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 20px 0 24px;
  color: #8292ad;
  font-size: 19px;
  letter-spacing: 2px;
}

.brand-copy p i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #aebbd0;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  color: #7588a8;
  font-size: 14px;
  border: 1px solid rgba(208,220,244,.8);
  border-radius: 22px;
  background: rgba(255,255,255,.72);
  box-shadow: 0 8px 20px rgba(81,112,172,.08);
  backdrop-filter: blur(8px);
}

.security-badge span {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4d7cff;
  border: 1px solid #7ca1ff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 900;
}

.ai-scene {
  position: relative;
  width: min(590px, 92%);
  height: 390px;
  margin-top: 14px;
  perspective: 900px;
}

.ai-stage {
  position: absolute;
  left: 19%;
  bottom: 22px;
  width: 315px;
  height: 116px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(248,251,255,.96), rgba(196,217,255,.82));
  box-shadow: 0 24px 34px rgba(78,119,205,.22), inset 0 0 0 12px rgba(255,255,255,.5);
  transform: rotateX(60deg);
}

.ai-stage::before,
.ai-stage::after {
  position: absolute;
  content: '';
  border-radius: 50%;
  inset: 18px 28px;
  border: 2px solid rgba(92,140,245,.28);
}

.ai-stage::after {
  inset: 34px 57px;
  background: rgba(255,255,255,.78);
  box-shadow: 0 0 34px rgba(74,129,255,.38);
}

.ai-cube {
  position: absolute;
  z-index: 3;
  left: 88px;
  top: -115px;
  width: 142px;
  height: 142px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4280f4;
  font-size: 55px;
  font-weight: 800;
  border: 1px solid rgba(255,255,255,.9);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255,255,255,.95), rgba(185,211,255,.68));
  box-shadow: 22px 24px 42px rgba(67,117,211,.18), inset -18px -16px 34px rgba(97,145,235,.18);
  transform: rotateX(-60deg) rotateZ(-5deg);
  text-shadow: 0 6px 14px rgba(51,111,238,.2);
}

.orbit {
  position: absolute;
  left: 7%;
  top: 92px;
  width: 420px;
  height: 190px;
  border: 2px solid rgba(89,137,244,.28);
  border-radius: 50%;
  transform: rotate(-9deg);
}

.orbit-two {
  left: 16%;
  top: 116px;
  width: 350px;
  height: 142px;
  opacity: .6;
  transform: rotate(22deg);
}

.scene-card {
  position: absolute;
  width: 58px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #78a2f7;
  font-size: 31px;
  border: 1px solid rgba(214,226,251,.9);
  border-radius: 10px;
  background: rgba(247,251,255,.72);
  box-shadow: 0 12px 28px rgba(71,116,198,.1);
  backdrop-filter: blur(8px);
}

.card-chart { left: 3%; top: 150px; transform: rotate(-4deg); }
.card-data { right: 11%; top: 74px; transform: rotate(5deg); }

.scene-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff, #8ab4ff);
  box-shadow: 0 4px 11px rgba(51,105,214,.25);
}

.dot-one { left: 18%; top: 82px; }
.dot-two { right: 8%; top: 192px; width: 21px; height: 21px; }
.dot-three { left: 9%; bottom: 42px; width: 10px; height: 10px; }

.login-card {
  width: 100%;
  min-height: 700px;
  padding: 46px 68px 34px;
  border: 10px solid rgba(255,255,255,.48);
  border-radius: 24px;
  background: rgba(255,255,255,.90);
  box-shadow: 0 22px 56px rgba(52,84,143,.14), inset 0 0 0 1px rgba(228,235,247,.84);
  backdrop-filter: blur(16px);
}

.welcome-title {
  margin: 0 0 25px;
  color: #122039;
  font-size: 31px;
  letter-spacing: .2px;
}

.login-expired-alert {
  margin-bottom: 16px;
  border: none;
  border-radius: 9px;
  background: #fff3e5;
}

.login-tabs {
  height: 46px;
  justify-content: center;
  border-bottom-color: #dce4f2;
}

.tab-item {
  width: 50%;
  height: 46px;
  margin: 0;
  padding: 0;
  font-size: 16px;
}

.tab-item.active {
  color: #152039;
  font-size: 17px;
  font-weight: 800;
}

.tab-item.active::after {
  left: 17%;
  right: 17%;
  height: 2px;
  background: #3b6df6;
}

.login-form { margin-top: 30px; }

.login-form :deep(.el-form-item),
.reset-page-form :deep(.el-form-item) { margin-bottom: 20px; }

.login-form :deep(.el-input__wrapper),
.reset-page-form :deep(.el-input__wrapper) {
  min-height: 50px;
  padding: 1px 16px;
  border-radius: 7px;
  box-shadow: 0 0 0 1px #d6dfed inset;
}

.login-form :deep(.el-input__inner),
.reset-page-form :deep(.el-input__inner) { font-size: 14px; }

.area-code {
  width: 88px;
  height: 52px;
  flex-basis: 88px;
  border-color: #d6dfed;
  border-radius: 7px 0 0 7px;
  background: #fff;
}

.area-code::after {
  content: '⌄';
  margin-left: 12px;
  color: #63738c;
}

.phone-input-wrap :deep(.el-input__wrapper) { border-radius: 0 7px 7px 0; }
.sms-code-row,.captcha-row { gap: 14px; }

.code-btn,
.captcha-img {
  width: 142px;
  height: 52px;
  flex-basis: 142px;
  border-radius: 7px;
}

.code-btn { background: #3a6df6; border-color: #3a6df6; }

.agreement-row {
  margin: 1px 0 25px;
  color: #6f7d91;
  font-size: 13px;
}

.link-btn,.forget-btn { color: #386ef6; }

.submit-btn {
  height: 48px;
  border-radius: 6px;
  background: linear-gradient(90deg, #3479f5, #4157f4);
  border: none;
  box-shadow: 0 9px 22px rgba(57,104,244,.2);
}

.forget-btn { margin-top: 18px; }

.reset-page-card {
  grid-column: 1 / -1;
  justify-self: center;
  width: 600px;
  min-height: 620px;
  border: 10px solid rgba(255,255,255,.48);
  border-radius: 24px;
  background: rgba(255,255,255,.92);
  box-shadow: 0 22px 56px rgba(52,84,143,.14);
}

.login-footer {
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 58px;
  padding: 12px 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  color: #8390a5;
  font-size: 13px;
  background: rgba(255,255,255,.68);
  border-top: 1px solid rgba(218,227,242,.7);
  backdrop-filter: blur(10px);
}

.login-footer i { width: 1px; height: 15px; background: #d4dce9; }
.login-footer button { padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.login-footer button:hover { color: #3b6df6; }

@media (max-width: 1180px) {
  .login-layout {
    width: min(1040px, calc(100% - 48px));
    grid-template-columns: minmax(350px, 1fr) 520px;
    gap: 28px;
  }
  .brand-showcase { padding-left: 0; }
  .brand-copy { padding-left: 10px; }
  .brand-copy h2 { font-size: 40px; }
  .brand-copy p { font-size: 16px; gap: 12px; }
  .ai-scene { transform: scale(.86); transform-origin: left top; }
  .login-card { padding-left: 52px; padding-right: 52px; }
}

@media (max-width: 900px) {
  .page-brand { position: relative; left: 24px; top: 24px; width: max-content; }
  .login-layout {
    width: min(560px, calc(100% - 32px));
    min-height: auto;
    padding: 56px 0 105px;
    display: block;
  }
  .brand-showcase { display: none; }
  .login-card { min-height: auto; }
  .login-footer { position: absolute; gap: 10px 14px; }
  .login-footer span:last-child,.login-footer i:last-of-type { display: none; }
}

@media (max-width: 600px) {
  .page-brand strong { font-size: 21px; }
  .login-layout { padding-top: 48px; padding-bottom: 125px; }
  .login-card,.reset-page-card {
    width: 100%;
    padding: 34px 24px 30px;
    border-width: 6px;
    border-radius: 18px;
  }
  .welcome-title { font-size: 23px; }
  .code-btn,.captcha-img { width: 112px; flex-basis: 112px; }
  .login-footer { font-size: 12px; }
}

/* 按参考图再次校准桌面端比例 */
@media (min-width: 1501px) {
  .login-layout {
    width: min(1340px, calc(100% - 160px));
    margin-left: clamp(80px, 6vw, 120px);
    margin-right: auto;
    grid-template-columns: 470px 520px;
    gap: 40px;
  }

  .brand-showcase {
    padding-left: 0;
  }

  .brand-copy {
    padding-left: 0;
  }

  .login-card {
    width: 520px;
    padding-left: 56px;
    padding-right: 56px;
  }
}

.login-card {
  min-height: 650px;
  padding-top: 48px;
  padding-bottom: 34px;
}

.welcome-title {
  font-size: 33px;
  margin-bottom: 22px;
}

.ai-scene {
  height: 410px;
  margin-top: 18px;
}

.ai-stage {
  left: 16%;
  bottom: 25px;
  width: 355px;
  height: 92px;
  transform: none;
  border: 10px solid rgba(255,255,255,.58);
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(228,239,255,.96), rgba(163,195,255,.7));
  box-shadow: 0 25px 38px rgba(68,110,193,.22), inset 0 0 0 2px rgba(95,142,235,.24);
}

.ai-stage::before {
  inset: 12px 24px;
  border: 2px solid rgba(74,127,239,.35);
  background: rgba(245,249,255,.82);
}

.ai-stage::after {
  inset: 25px 57px;
  background: #f9fbff;
  box-shadow: 0 0 32px rgba(74,129,255,.3);
}

.ai-cube {
  left: 103px;
  top: -150px;
  width: 150px;
  height: 150px;
  border-radius: 18px;
  transform: rotate(-4deg);
  background:
    linear-gradient(135deg, rgba(255,255,255,.96), rgba(200,220,255,.84));
  box-shadow: 22px 24px 42px rgba(67,117,211,.22), inset -22px -18px 38px rgba(97,145,235,.2);
}

.ai-cube::before {
  position: absolute;
  content: '';
  left: 17px;
  top: -22px;
  width: 123px;
  height: 31px;
  border-radius: 8px;
  transform: skewX(-43deg);
  background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(183,208,252,.8));
  box-shadow: 0 -3px 12px rgba(83,129,215,.08);
}

.orbit {
  left: 2%;
  top: 105px;
  width: 470px;
  height: 205px;
}

.orbit-two {
  left: 10%;
  top: 125px;
  width: 405px;
  height: 160px;
}

.card-chart { left: 0; top: 168px; }
.card-data { right: 5%; top: 75px; }

@media (min-width: 1181px) and (max-width: 1500px) {
  .login-layout {
    width: calc(100% - 72px);
    grid-template-columns: minmax(390px, 470px) 520px;
    justify-content: start;
    gap: 40px;
  }
  .login-card {
    width: 520px;
    padding-left: 54px;
    padding-right: 54px;
  }
}

/* 严格限制为一屏展示，不产生横向或纵向滚动条 */
.login-page {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

.login-layout {
  height: calc(100vh - 58px);
  height: calc(100dvh - 58px);
  min-height: 0;
  padding-top: clamp(38px, 6vh, 72px);
  padding-bottom: clamp(24px, 4vh, 48px);
  overflow: hidden;
}

.login-card {
  min-height: 0;
  height: min(620px, calc(100dvh - 105px));
  max-height: 100%;
  padding-top: clamp(28px, 4.6vh, 48px);
  padding-bottom: clamp(24px, 3.4vh, 34px);
}

.brand-showcase {
  min-height: 0;
  overflow: hidden;
}

.ai-scene {
  height: clamp(300px, 43vh, 410px);
}

@media (max-height: 820px) and (min-width: 901px) {
  .page-brand { top: 24px; }
  .login-layout {
    padding-top: 25px;
    padding-bottom: 20px;
  }
  .login-card {
    padding: 28px 54px 24px;
    border-width: 7px;
  }
  .welcome-title { margin-bottom: 14px; font-size: 27px; }
  .login-tabs,.tab-item { height: 40px; }
  .login-form { margin-top: 20px; }
  .login-form :deep(.el-form-item) { margin-bottom: 14px; }
  .login-form :deep(.el-input__wrapper) { min-height: 43px; }
  .area-code { height: 45px; }
  .code-btn,.captcha-img { height: 45px; }
  .agreement-row { margin-bottom: 16px; }
  .submit-btn { height: 43px; }
  .forget-btn { margin-top: 12px; }
  .brand-copy h2 { font-size: 40px; }
  .brand-copy p { margin: 14px 0 18px; }
  .ai-scene {
    margin-top: 0;
    transform: scale(.82);
    transform-origin: left top;
  }
}

@media (max-height: 680px) and (min-width: 901px) {
  .login-layout { padding-top: 25px; padding-bottom: 20px; }
  .login-card { padding-top: 20px; padding-bottom: 18px; }
  .welcome-title { font-size: 23px; margin-bottom: 8px; }
  .login-tabs,.tab-item { height: 35px; }
  .login-form { margin-top: 13px; }
  .login-form :deep(.el-form-item) { margin-bottom: 9px; }
  .agreement-row { margin-bottom: 10px; line-height: 18px; }
  .forget-btn { margin-top: 8px; }
}

@media (max-width: 900px) {
  .page-brand {
    position: absolute;
    left: 22px;
    top: 18px;
  }
  .login-layout {
    width: min(560px, calc(100% - 28px));
    height: calc(100vh - 58px);
    height: calc(100dvh - 58px);
    padding: 68px 0 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .login-card,.reset-page-card {
    width: min(520px, 100%);
    max-height: 100%;
    overflow: hidden;
  }
}

@media (max-width: 600px) {
  .page-brand { top: 12px; transform: scale(.9); transform-origin: left top; }
  .login-layout { padding-top: 50px; padding-bottom: 10px; }
  .login-card,.reset-page-card {
    padding: 20px 20px 16px;
    border-width: 5px;
  }
  .welcome-title { margin-bottom: 10px; font-size: 22px; }
  .login-tabs,.tab-item { height: 36px; }
  .login-form { margin-top: 14px; }
  .login-form :deep(.el-form-item),
  .reset-page-form :deep(.el-form-item) { margin-bottom: 10px; }
  .login-form :deep(.el-input__wrapper),
  .reset-page-form :deep(.el-input__wrapper) { min-height: 40px; }
  .area-code { height: 42px; }
  .code-btn,.captcha-img { height: 42px; }
  .agreement-row { margin-bottom: 10px; line-height: 18px; }
  .submit-btn { height: 40px; }
  .forget-btn { margin-top: 8px; }
  .login-footer { min-height: 58px; padding: 7px 10px; }
}
</style>

