<template>
  <div class="login-page" :class="{ 'is-reset-mode': pageMode === 'reset' }">
    <div class="login-bg-shape shape-one"></div>
    <div class="login-bg-shape shape-two"></div>
    <div class="login-bg-shape shape-three"></div>

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

      <div class="other-login">
        <div class="line-title">
          <span></span>
          <em>其他</em>
          <span></span>
        </div>
        <button type="button" class="app-login" @click="handleAppLogin">
          <span class="mini-logo">AI</span>
          <strong>APP登录</strong>
        </button>
      </div>
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

function handleAppLogin() {
  ElMessage.info('APP登录功能暂未开放')
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
.app-login,
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

.other-login {
  margin-top: 28px;
}

.line-title {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #a0a9b8;
  font-size: 13px;
}

.line-title span {
  height: 1px;
  flex: 1;
  background: #e6ebf3;
}

.line-title em {
  font-style: normal;
}

.app-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 26px auto 0;
  color: #111827;
  font-size: 13px;
}

.mini-logo {
  width: 25px;
  height: 25px;
  margin-bottom: 10px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #356df6;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
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
</style>

