<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="520px"
    destroy-on-close
    :close-on-click-modal="false"
    @closed="resetForms"
  >
    <el-tabs v-model="activeMode" class="password-tabs">
      <el-tab-pane label="旧密码验证" name="oldPassword">
        <el-form
          ref="oldPasswordFormRef"
          :model="oldPasswordForm"
          :rules="oldPasswordRules"
          label-width="96px"
          status-icon
        >
          <el-form-item label="旧密码" prop="oldPassword">
            <el-input
              v-model="oldPasswordForm.oldPassword"
              type="password"
              show-password
              autocomplete="current-password"
              placeholder="请输入当前登录密码"
            />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="oldPasswordForm.newPassword"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="请输入6到32位新密码"
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="oldPasswordForm.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="请再次输入新密码"
              @keyup.enter="submit"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="手机验证码" name="sms">
        <el-alert
          v-if="!normalizedPhone"
          title="当前账号未绑定有效手机号，请使用旧密码修改或联系管理员处理。"
          type="warning"
          :closable="false"
          show-icon
          class="phone-alert"
        />
        <el-form
          ref="smsFormRef"
          :model="smsForm"
          :rules="smsRules"
          label-width="96px"
          status-icon
        >
          <el-form-item label="绑定手机">
            <el-input :model-value="maskedPhone" disabled />
          </el-form-item>
          <el-form-item label="验证码" prop="smsCode">
            <div class="sms-code-row">
              <el-input
                v-model.trim="smsForm.smsCode"
                maxlength="8"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="请输入短信验证码"
              />
              <el-button
                :disabled="!normalizedPhone || countdown > 0"
                :loading="sendingCode"
                @click="sendCode"
              >
                {{ countdown > 0 ? `${countdown}秒后重发` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="smsForm.newPassword"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="请输入6到32位新密码"
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="smsForm.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="请再次输入新密码"
              @keyup.enter="submit"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div class="password-tip">密码修改成功后，系统将退出当前登录，请使用新密码重新登录。</div>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from '@/plugins/element-plus-api'
import {
  changePassword,
  changePasswordBySms,
  sendChangePasswordSmsCode
} from '@/api/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const oldPasswordFormRef = ref()
const smsFormRef = ref()
const activeMode = ref('oldPassword')
const submitting = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer = null

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const normalizedPhone = computed(() => String(props.phone || '').trim())
const maskedPhone = computed(() => {
  const phone = normalizedPhone.value
  if (!phone) return '未绑定手机号'
  if (/^1\d{10}$/.test(phone)) return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  if (phone.length <= 5) return phone
  return `${phone.slice(0, 2)}***${phone.slice(-2)}`
})

const oldPasswordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const smsForm = reactive({
  smsCode: '',
  newPassword: '',
  confirmPassword: ''
})

function validatePassword(rule, value, callback) {
  const text = String(value || '').trim()
  if (!text) {
    callback(new Error('请输入新密码'))
    return
  }
  if (text.length < 6 || text.length > 32) {
    callback(new Error('新密码长度必须在6到32位之间'))
    return
  }
  callback()
}

function validateOldConfirm(rule, value, callback) {
  if (!value) {
    callback(new Error('请再次输入新密码'))
    return
  }
  if (value !== oldPasswordForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }
  callback()
}

function validateSmsConfirm(rule, value, callback) {
  if (!value) {
    callback(new Error('请再次输入新密码'))
    return
  }
  if (value !== smsForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }
  callback()
}

const oldPasswordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateOldConfirm, trigger: 'blur' }]
}

const smsRules = {
  smsCode: [{ required: true, message: '请输入短信验证码', trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateSmsConfirm, trigger: 'blur' }]
}

function startCountdown(seconds = 60) {
  clearCountdown()
  countdown.value = seconds
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearCountdown()
  }, 1000)
}

function clearCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (countdown.value < 0) countdown.value = 0
}

async function sendCode() {
  if (!normalizedPhone.value || sendingCode.value || countdown.value > 0) return
  sendingCode.value = true
  try {
    await sendChangePasswordSmsCode()
    startCountdown(60)
    ElMessage.success(`验证码已发送至 ${maskedPhone.value}`)
  } finally {
    sendingCode.value = false
  }
}

async function submit() {
  if (submitting.value) return

  const formRef = activeMode.value === 'oldPassword' ? oldPasswordFormRef.value : smsFormRef.value
  if (!formRef) return
  if (activeMode.value === 'sms' && !normalizedPhone.value) {
    ElMessage.warning('当前账号未绑定有效手机号')
    return
  }

  const valid = await formRef.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (activeMode.value === 'oldPassword') {
      await changePassword({
        oldPassword: oldPasswordForm.oldPassword,
        newPassword: oldPasswordForm.newPassword,
        confirmPassword: oldPasswordForm.confirmPassword
      })
    } else {
      await changePasswordBySms({
        smsCode: smsForm.smsCode,
        newPassword: smsForm.newPassword,
        confirmPassword: smsForm.confirmPassword
      })
    }
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

function resetForms() {
  oldPasswordForm.oldPassword = ''
  oldPasswordForm.newPassword = ''
  oldPasswordForm.confirmPassword = ''
  smsForm.smsCode = ''
  smsForm.newPassword = ''
  smsForm.confirmPassword = ''
  oldPasswordFormRef.value?.clearValidate?.()
  smsFormRef.value?.clearValidate?.()
  activeMode.value = 'oldPassword'
}

watch(() => props.modelValue, (value) => {
  if (value) {
    oldPasswordFormRef.value?.clearValidate?.()
    smsFormRef.value?.clearValidate?.()
  }
})

onBeforeUnmount(clearCountdown)
</script>

<style scoped>
.password-tabs {
  min-height: 286px;
}

.phone-alert {
  margin-bottom: 16px;
}

.sms-code-row {
  display: flex;
  width: 100%;
  gap: 10px;
}

.sms-code-row .el-input {
  flex: 1;
}

.sms-code-row .el-button {
  width: 118px;
}

.password-tip {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
</style>
