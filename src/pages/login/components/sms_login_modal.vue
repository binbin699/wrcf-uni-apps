<template>
  <!-- 短信登录弹窗 -->
  <view v-if="visible" class="password-modal-overlay" @click="handleClose">
    <view class="password-modal" @click.stop>
      <view class="modal-header">
        <text class="modal-title">{{ $t('login.sms_login') }}</text>
        <text class="close-btn" @click="handleClose">×</text>
      </view>

      <view class="modal-content">
        <view class="form-item">
          <text class="label">{{ $t('login.phone_label') }}</text>
          <input
            class="input"
            type="number"
            inputmode="tel"
            :placeholder="$t('login.phone_placeholder')"
            v-model="smsForm.phone"
            maxlength="11" />
        </view>

        <view class="form-item">
          <text class="label">{{ $t('login.sms_code_label') }}</text>
          <view class="sms-code-input">
            <input
              class="input sms-input"
              type="number"
              inputmode="numeric"
              :placeholder="$t('login.sms_code_placeholder')"
              v-model="smsForm.code"
              maxlength="6" />
            <button
              class="send-code-btn"
              :class="{ disabled: isCountingDown || !smsForm.phone }"
              :disabled="isCountingDown || !smsForm.phone"
              @click="sendVerificationCode">
              {{ countdownText }}
            </button>
          </view>
        </view>
      </view>

      <view class="modal-actions">
        <button class="cancel-btn" @click="handleClose">{{ $t('login.cancel') }}</button>
        <button
          class="confirm-btn primary"
          @click="submitSmsLogin"
          :disabled="isLoading">
          {{ isLoading ? $t('login.logging_in') : $t('login.login') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/uni_modules/wot-design-uni';
import loginApi from '@/api/login';
import { isRequestHandledError } from '@/utils/request-feedback';

// Props
const props = withDefaults(
  defineProps<{
    visible?: boolean;
    isLoading?: boolean;
  }>(),
  {
    visible: false,
    isLoading: false
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'onSubmit', data: { phone: string; ticket: string; code: string }): void;
}>();

const { t: $t } = useI18n();
const toast = useToast();

// 短信登录表单
const smsForm = ref({
  phone: '',
  ticket: '',
  code: ''
});

// 倒计时
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// 计算属性：是否正在倒计时
const isCountingDown = computed(() => countdown.value > 0);

// 计算属性：倒计时文本
const countdownText = computed(() => {
  if (countdown.value > 0) {
    return countdown.value + 's'; // todo: i18n插值有问题，暂时这样处理
  }
  return $t('login.send_code');
});

/**
 * 清理定时器
 */
function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

/**
 * 关闭弹窗
 */
function handleClose() {
  emit('update:visible', false);
  emit('close');
  smsForm.value.phone = '';
  smsForm.value.ticket = '';
  smsForm.value.code = '';
  // 不重置倒计时，避免用户关闭弹窗后重新打开可以立即发送验证码
}

/**
 * 组件销毁时清理定时器
 */
onUnmounted(() => {
  clearCountdownTimer();
});

/**
 * 发送验证码
 * 发送后开始60秒倒计时
 */
async function sendVerificationCode() {
  // 验证手机号
  if (!smsForm.value.phone) {
    toast.warning({ msg: $t('login.phone_required'), duration: 3000 });
    return;
  }

  // 简单的手机号格式验证（中国大陆11位手机号）
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(smsForm.value.phone)) {
    toast.warning({ msg: $t('login.phone_invalid'), duration: 3000 });
    return;
  }

  // 如果正在倒计时中，不允许重复发送
  if (countdown.value > 0) {
    return;
  }

  try {
    // 调用后端发送验证码接口
    const response = await loginApi.sendSmsCode(smsForm.value.phone);
    console.log('response ticket', response.data.ticket);
    smsForm.value.ticket = response.data.ticket;

    // 发送成功
    toast.success({ msg: $t('login.code_sent'), duration: 2000 });

    // 清除旧的定时器（如果存在）
    clearCountdownTimer();

    // 开始60秒倒计时
    countdown.value = 60;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearCountdownTimer();
      }
    }, 1000);
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    if (!isRequestHandledError(error)) {
      toast.warning({ msg: $t('login.code_send_failed'), duration: 3000 });
    }
  }
}

/**
 * 提交短信登录
 */
async function submitSmsLogin() {
  // 验证手机号
  if (!smsForm.value.phone) {
    toast.warning({ msg: $t('login.phone_required'), duration: 3000 });
    return;
  }

  // 验证ticket, ticket 为发送验证码接口返回的ticket，若无ticket，则认为验证码未发送
  if (!smsForm.value.ticket) {
    toast.warning({ msg: $t('login.sms_code_required'), duration: 3000 });
    return;
  }

  // 验证验证码
  if (!smsForm.value.code) {
    toast.warning({ msg: $t('login.sms_code_required'), duration: 3000 });
    return;
  }

  // 发射成功事件，由父组件处理登录逻辑
  emit('onSubmit', {
    phone: smsForm.value.phone,
    ticket: smsForm.value.ticket,
    code: smsForm.value.code
  });
}
</script>

<style lang="scss" scoped>
/* 弹窗遮罩层 */
.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

/* 弹窗容器 */
.password-modal {
  width: 90%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

/* 弹窗头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #262626;
}

.close-btn {
  font-size: 48rpx;
  color: #999999;
  cursor: pointer;
  line-height: 1;
}

.close-btn:active {
  opacity: 0.7;
}

/* 弹窗内容 */
.modal-content {
  padding: 32rpx;
}

.modal-content .form-item {
  margin-bottom: 32rpx;
}

.modal-content .form-item:last-child {
  margin-bottom: 0;
}

.modal-content .label {
  display: block;
  font-size: 28rpx;
  color: #262626;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.modal-content .input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #262626;
  background: #ffffff;
  box-sizing: border-box;
}

.modal-content .input:focus {
  border-color: #8fd3f4;
  outline: none;
}

/* 短信验证码输入样式 */
.sms-code-input {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.sms-code-input .sms-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  min-width: 180rpx;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  background: var(--color-primary);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 500;
  border: none;
  border-radius: 12rpx;
  white-space: nowrap;
}

.send-code-btn:active {
  opacity: 0.8;
}

.send-code-btn.disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed;
}

.send-code-btn:disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed;
}

/* 弹窗底部按钮 */
.modal-actions {
  display: flex;
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
  gap: 24rpx;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  cursor: pointer;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666666;
}

.cancel-btn:active {
  background: #e0e0e0;
}

.confirm-btn.primary {
  background: var(--color-primary);
  color: #ffffff;
}

.confirm-btn.primary:active {
  background: #2348dd;
}
</style>
