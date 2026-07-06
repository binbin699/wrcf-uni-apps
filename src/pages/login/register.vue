<template>
  <wd-toast />
  <view class="register-container">
    <!-- 装饰性背景元素 -->
    <view class="decoration-bottom"></view>

    <!-- 主要内容 -->
    <view class="main-content">
      <!-- Logo和应用信息 -->
      <view class="header">
        <view class="logo-container">
          <view class="logo">
            <image src="/static/logo.jpg" alt="" class="logo-img"></image>
          </view>
        </view>
        <view class="app-info">
          <text class="app-name">{{ $t('register.title') }}</text>
          <text class="app-desc">{{ $t('register.desc') }}</text>
        </view>
      </view>

      <!-- 注册表单区域 -->
      <view class="register-section">
        <!-- 用户名输入 -->
        <view class="input-group">
          <input
              class="input-field"
              type="text"
              v-model="form.unionid"
              :placeholder="$t('register.unionid_placeholder')"
              maxlength="20" />
        </view>

        <!-- 昵称输入 -->
        <view class="input-group">
          <input
              class="input-field"
              type="text"
              v-model="form.nickName"
              :placeholder="$t('register.nickname_placeholder')"
              maxlength="20" />
        </view>

        <!-- 密码输入 -->
        <view class="input-group">
          <input
              class="input-field"
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              :placeholder="$t('register.password_placeholder')"
              maxlength="20" />
          <view class="password-toggle" @click="togglePassword">
            <text class="toggle-icon">{{ showPassword ? '👁️' : '👁️‍🗨️' }}</text>
          </view>
        </view>

        <!-- 确认密码输入 -->
        <view class="input-group">
          <input
              class="input-field"
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="form.confirmPassword"
              :placeholder="$t('register.confirm_password_placeholder')"
              maxlength="20" />
          <view class="password-toggle" @click="toggleConfirmPassword">
            <text class="toggle-icon">{{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}</text>
          </view>
        </view>

        <!-- ========== ✨ 修改点：协议链接改为 @click 调用 openTerms，不再使用 <a> 标签 ========== -->
        <view class="agreement-section">
          <checkbox-group @change="onAgreementChange">
            <label class="agreement-label">
              <checkbox :checked="isAgree" color="#8FD3F4" />
              <text class="agreement-text">
                已阅读并同意
                <!-- 使用 text 标签 + @click.stop，与 profile 页面行为一致 -->
                <text class="agreement-link" @click.stop="openTerms('user')">《九宝用户协议》</text>
                和
                <text class="agreement-link" @click.stop="openTerms('privacy')">《隐私政策》</text>
              </text>
            </label>
          </checkbox-group>
        </view>
        <!-- ========== 修改点结束 ========== -->

        <!-- 注册按钮 -->
        <button
            class="register-btn primary"
            @click="handleRegister"
            :loading="userStore.isLoading"
            :disabled="!canRegister">
          {{ $t('register.register_btn') }}
        </button>

        <!-- 登录链接 -->
        <view class="login-link" @click="goToLogin">
          <text class="link-text">{{ $t('register.has_account') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/uni_modules/wot-design-uni';
import { useUserStore } from '@/store/user';
import type { IPasswordRegisterForm } from '@/api/types/login';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { isRequestHandledError } from '@/utils/request-feedback';

const { t: $t } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);
const userStore = useUserStore();

// 响应式数据
const form = ref({
  unionid: '',
  nickName: '',
  password: '',
  confirmPassword: ''
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// 计算属性
const canRegister = computed(() => {
  return (
      form.value.unionid.length >= 3 &&
      form.value.unionid.length <= 16 &&
      form.value.nickName.length >= 1 &&
      form.value.password.length >= 8 &&
      form.value.password.length <= 24 &&
      form.value.confirmPassword === form.value.password
  );
});

// 协议同意状态
const isAgree = ref(false);

// ========== ✨ 修改点：新增 openExternal 和 openTerms 方法（与 profile 页面一致） ==========
function openExternal(src: string) {
  const encoded = encodeURIComponent(src);
  uni.navigateTo({ url: '/pages/webview/webview?src=' + encoded });
}

function openTerms(type: 'user' | 'privacy') {
  const urlMap = {
    user: APP_CONFIG.TERMS_URL,
    privacy: APP_CONFIG.PRIVACY_URL
  };
  const url = urlMap[type];
  if (url) {
    openExternal(url);
  } else {
    toast.warning({ msg: '协议地址未配置', duration: 2000 });
  }
}
// ========== 修改点结束 ==========

// 协议变更处理
function onAgreementChange(e: any) {
  isAgree.value = e.detail.value.length > 0;
}

// 方法
function togglePassword() {
  showPassword.value = !showPassword.value;
}

function toggleConfirmPassword() {
  showConfirmPassword.value = !showConfirmPassword.value;
}

async function handleRegister() {
  if (!isAgree.value) {
    toast.warning({
      msg: '请先阅读并同意用户协议和隐私政策',
      duration: 2000
    });
    return;
  }

  if (!canRegister.value) {
    toast.warning({
      msg: $t('register.form_invalid'),
      duration: 2000
    });
    return;
  }

  // 验证unionid长度
  if (form.value.unionid.length < 3) {
    toast.warning({
      msg: $t('register.unionid_min_length'),
      duration: 2000
    });
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(form.value.unionid)) {
    toast.warning({
      msg: $t('register.unionid_invalid_chars'),
      duration: 2000
    });
    return;
  }

  // 验证密码长度
  if (form.value.password.length < 8) {
    toast.warning({
      msg: $t('register.password_min_length'),
      duration: 2000
    });
    return;
  }

  // 验证密码确认
  if (form.value.password !== form.value.confirmPassword) {
    toast.warning({
      msg: $t('register.password_mismatch'),
      duration: 2000
    });
    return;
  }

  try {
    const registerData: IPasswordRegisterForm = {
      unionid: form.value.unionid,
      password: form.value.password,
      nickName: form.value.nickName || undefined
    };

    const success = await userStore.register(registerData);

    if (success) {
      toast.success({
        msg: $t('register.register_success'),
        duration: 2000,
        cover: true
      });

      setTimeout(() => {
        redirectToMain();
      }, 1500);
    } else if (userStore.loginError) {
      toast.warning({
        msg: userStore.loginError,
        duration: 3000
      });
    }
  } catch (error: any) {
    console.error('注册失败:', error);
    if (!isRequestHandledError(error)) {
      toast.warning({
        msg: error.message || $t('register.register_failed'),
        duration: 3000
      });
    }
  }
}

function goToLogin() {
  uni.navigateBack();
}

function redirectToMain() {
  uni.switchTab({
    url: '/pages/device-status/device-status'
  });
}
</script>

<style>
.register-container {
  width: 100%;
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #8fd3f4 0%, #fbc2eb 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* iOS 全面屏底部安全区域适配 */
  padding-bottom: 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

/* Logo水印背景 */
.register-container::before {
  content: '';
  position: absolute;
  width: 922rpx;
  height: 974rpx;
  right: -200rpx;
  top: -200rpx;
  transform: rotate(14.29deg);
  opacity: 0.2;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
  -webkit-mask: url('/static/logo.svg') no-repeat center;
  mask: url('/static/logo.svg') no-repeat center;
  -webkit-mask-size: contain;
  mask-size: contain;
  z-index: 1;
}

/* 底部装饰圆形 */
.register-container .decoration-bottom {
  position: absolute;
  width: 352rpx;
  height: 352rpx;
  left: -100rpx;
  bottom: -100rpx;
  background-color: rgba(147, 197, 253, 0.3);
  border-radius: 50%;
  filter: blur(40rpx);
  z-index: 2;
}

/* 主要内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  width: 100%;
  max-width: 640rpx;
  padding: 60rpx 32rpx;
  gap: 120rpx;
}

/* 协议区域样式 */
.agreement-section {
  margin-top: 24rpx;
  display: flex;
  align-items: flex-start;
}

.agreement-label {
  display: flex;
  align-items: center;
  font-size: 20rpx;
  color: #666;
  line-height: 1.5;
}
.agreement-label checkbox {
  transform: scale(0.8);
  margin-right: 8rpx;
}
.agreement-text {
  margin-left: 16rpx;
}

/* ✨ 修改点：保持与之前相同的样式，但现在是 text 标签，依然使用相同的 class */
.agreement-link {
  color: #8FD3F4;
  text-decoration: underline;
}

/* Logo区域 */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.logo-container {
  width: 160rpx;
  height: 160rpx;
  position: relative;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 40rpx;
  box-shadow: 0 11rpx 43rpx rgba(31, 38, 135, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(13rpx);
  overflow: hidden;
}

.logo-container::before {
  content: '';
  position: absolute;
  width: 256rpx;
  height: 256rpx;
  left: -53rpx;
  top: -53rpx;
  background-color: #fff7ed;
  border-radius: 134rpx;
}

.logo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}

.app-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-name {
  color: #262626;
  font-size: 48rpx;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}

.app-desc {
  color: #262626;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 56rpx;
  text-align: center;
}

/* 注册表单区域 */
.register-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 32rpx;
}

.input-group {
  position: relative;
  width: 100%;
}

.input-field {
  width: 100%;
  height: 96rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 48rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20rpx);
  padding: 0 32rpx;
  font-size: 32rpx;
  color: #262626;
  box-sizing: border-box;
}

.input-field::placeholder {
  color: rgba(38, 38, 38, 0.6);
}

.password-toggle {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  font-size: 32rpx;
  color: rgba(38, 38, 38, 0.6);
}

.register-btn {
  font-size: 32rpx;
  width: 100%;
  height: 96rpx !important;
  min-height: 96rpx !important;
  line-height: 96rpx !important;
  position: relative;
  border-radius: 48rpx;
}

.login-link {
  margin-top: 32rpx;
  /* iOS 全面屏底部安全区域适配 */
  margin-bottom: 0;
  margin-bottom: constant(safe-area-inset-bottom);
  margin-bottom: env(safe-area-inset-bottom);
}
</style>