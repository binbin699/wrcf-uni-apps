<template>
  <!-- 隐私政策弹窗 - SecGuard 合规要求 (仅 Android) -->
  <!-- #ifdef APP-PLUS -->
  <PrivacyPolicyModal
    :visible="showPrivacyModal"
    @agree="onPrivacyAgree"
    @disagree="onPrivacyDisagree"
  />
  <!-- #endif -->

  <wd-toast />
  <view class="login-container">
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
          <text class="app-name">{{ $t('login.app_name') }}</text>
          <text class="app-desc">{{ $t('login.app_desc') }}</text>
        </view>
      </view>

      <!-- 登录按钮区域 -->
      <view class="login-section">
        <!-- 微信小程序手机号登录 -->
        <!-- #ifdef MP-WEIXIN -->
        <template v-if="appConfig.SUPPORT_LOGIN_TYPE_WX_MP_PHONE">
          <button
            v-if="agreeChecked"
            class="phone login-btn primary"
            open-type="getPhoneNumber"
            @getphonenumber="handlePhoneLogin"
            :loading="userStore.isLoading"
            :disabled="userStore.isLoading">
            {{ $t('login.phone_login') }}
          </button>
          <button
            v-else
            class="phone login-btn primary need-agree"
            @click="handlePhoneLoginBlocked"
            :loading="userStore.isLoading"
            :disabled="userStore.isLoading">
            {{ $t('login.phone_login') }}
          </button>
        </template>
        <!-- #endif -->

        <!-- 游客按钮 -->
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="guest login-btn secondary"
          :class="{ 'need-agree': !agreeChecked }"
          @click="handleGuestLogin"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_GUEST_MP"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <text class="btn-text">{{ $t('login.guest_login') }}</text>
        </button>
        <!-- #endif -->
        <!-- #ifdef APP-PLUS || APP-HARMONY -->
        <button
          class="guest login-btn secondary"
          :class="{ 'need-agree': !agreeChecked }"
          @click="handleGuestLogin"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_GUEST"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <text class="btn-text">{{ $t('login.guest_login') }}</text>
        </button>
        <!-- #endif -->

        <!-- 谷歌登录 -->
        <!-- #ifdef APP-PLUS || APP-HARMONY -->
        <button
          class="google login-btn"
          :class="{ 'need-agree': !agreeChecked }"
          @click="handleGoogleLogin"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_GOOGLE"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <text class="btn-text">{{ $t('login.google_login') }}</text>
        </button>
        <!-- #endif -->

        <!-- Apple登录 - 遵循Apple HIG设计规范 -->
        <!-- #ifdef APP-PLUS -->
        <button
          class="apple-signin-btn"
          :class="{ 'need-agree': !agreeChecked }"
          @click="handleAppleLogin"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_APPLE"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <image src="/static/icons/apple-logo-white.svg" class="apple-logo" mode="aspectFit"></image>
          <text class="apple-btn-text">{{ $t('login.apple_login') }}</text>
        </button>
        <!-- #endif -->

        <!-- 微信Oauth登录 -->
        <!-- #ifdef APP-PLUS || APP-HARMONY -->
        <button
          class="wx login-btn"
          :class="{ 'need-agree': !agreeChecked }"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_WECHAT_OAUTH && isWechatExist()"
          @click="handleWxAppLogin"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <text class="btn-text">{{ $t('login.wx_login') }}</text>
        </button>
        <!-- #endif -->

        <!-- 短信验证码登录 (仅 App 端) -->
        <!-- #ifdef APP-PLUS || APP-HARMONY -->
        <button
          class="sms login-btn secondary"
          :class="{ 'need-agree': !agreeChecked }"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_SMS"
          @click="openSmsModal"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          {{ $t('login.sms_login') }}
        </button>
        <!-- #endif -->

        <!-- 邮箱登录 -->
        <button
          class="email login-btn secondary"
          :class="{ 'need-agree': !agreeChecked }"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_EMAIL"
          @click="openEmailModal"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          {{ $t('login.account_login') }}
        </button>

        <!-- App账号密码登录与注册 -->
        <!-- #ifdef APP-PLUS || APP-HARMONY -->
        <!-- 账号密码登录按钮 -->
        <button
          class="password login-btn"
          :class="{ 'need-agree': !agreeChecked }"
          @click="handlePasswordLogin"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_PASSWORD"
          :loading="userStore.isLoading"
          :disabled="userStore.isLoading">
          <text class="btn-text">{{ $t('login.password_login') }}</text>
        </button>
        <!-- 注册账号链接-->
        <text
          class="register-link"
          v-if="appConfig.SUPPORT_LOGIN_TYPE_PASSWORD"
          @click="goToRegister">
          {{ $t('login.register_account') }}
        </text>
        <!-- 微信手机号快捷登录自动注册提示 -->
        <!-- #endif -->
           <!-- 自动注册提示 -->
        <!-- <text class="register-tip">{{ $t('login.register_tip') }}</text> -->
      </view>
    </view>

    <!-- 用户协议与隐私政策 -->
    <view class="terms-row">
      <view class="terms-checkbox" @click="agreeChecked = !agreeChecked">
        <view :class="['terms-box', agreeChecked ? 'checked' : '']">
          <text v-if="agreeChecked">✓</text>
        </view>
      </view>
      <view class="terms-text">
        {{ $t('login.agree_terms_prefix') }}
        <text class="terms-link" @click="openTerms">{{ $t('login.user_agreement') }}</text>
        {{ $t('login.terms_and') }}
        <text class="terms-link" @click="openPrivacy">{{ $t('login.privacy_policy') }}</text>
      </view>
    </view>

    <!-- 密码登录弹窗 -->
    <view v-if="showPasswordModal" class="password-modal-overlay" @click="closePasswordModal">
      <view class="password-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ $t('login.password_login') }}</text>
          <text class="close-btn" @click="closePasswordModal">×</text>
        </view>

        <view class="modal-content">
          <view class="form-item">
            <text class="label">{{ $t('register.unionid_label') }}</text>
            <input
              class="input"
              type="text"
              :placeholder="$t('register.unionid_placeholder')"
              v-model="passwordForm.unionid"
              maxlength="20" />
          </view>

          <view class="form-item">
            <text class="label">{{ $t('register.password_label') }}</text>
            <view class="password-input">
              <input
                class="input"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('register.password_placeholder')"
                v-model="passwordForm.password"
                maxlength="20" />
              <text class="eye-icon" @click="togglePasswordVisibility">
                {{ showPassword ? '👁️' : '👁️‍🗨️' }}
              </text>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <button class="cancel-btn" @click="closePasswordModal">{{ $t('login.cancel') }}</button>
          <button
            class="confirm-btn primary"
            @click="submitPasswordLogin"
            :disabled="userStore.isLoading || !agreeChecked">
            {{ userStore.isLoading ? $t('login.logging_in') : $t('login.login') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 邮箱登录弹窗 -->
    <view v-if="showEmailModal" class="password-modal-overlay" @click="closeEmailModal">
      <view class="password-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ $t('login.account_login') }}</text>
          <text class="close-btn" @click="closeEmailModal">×</text>
        </view>

        <view class="modal-content">
          <view class="form-item">
            <text class="label">{{ $t('login.account_label') }}</text>
            <input
              class="input"
              type="text"
              inputmode="email"
              :placeholder="$t('login.account_placeholder')"
              v-model="emailForm.email"
              maxlength="64" />
          </view>

          <view class="form-item">
            <text class="label">{{ $t('register.password_label') }}</text>
            <view class="password-input">
              <input
                class="input"
                :type="showEmailPassword ? 'text' : 'password'"
                :placeholder="$t('register.password_placeholder')"
                v-model="emailForm.password"
                maxlength="20" />
              <text class="eye-icon" @click="toggleEmailPasswordVisibility">
                {{ showEmailPassword ? '👁️' : '👁️‍🗨️' }}
              </text>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <button class="cancel-btn" @click="closeEmailModal">{{ $t('login.cancel') }}</button>
          <button
            class="confirm-btn primary"
            @click="submitEmailLogin"
            :disabled="userStore.isLoading || !agreeChecked">
            {{ userStore.isLoading ? $t('login.logging_in') : $t('login.login') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 短信登录弹窗 (仅 App 端) -->
    <!-- #ifdef APP-PLUS || APP-HARMONY -->
    <SmsLoginModal
      v-model:visible="showSmsModal"
      :agree-checked="agreeChecked"
      :is-loading="userStore.isLoading"
      @onSubmit="handleSmsLoginSubmit"
    />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad } from '@dcloudio/uni-app';
import { useToast } from '@/uni_modules/wot-design-uni';
import { useUserStore } from '@/store/user';
import { useTokenStore } from '@/store/token';
import { usePrivacyStore } from '@/store/privacy';
import { PageMap, Pages } from '@/utils/route';
import type { IPasswordLoginForm } from '@/api/types/login';
import storage from '@/utils/storage';
import { isWechatExist } from '@/utils/isWechatExist';
import SmsLoginModal from './components/sms_login_modal.vue';
// #ifdef APP-PLUS
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal.vue';
import { requestBluetoothPermissionsForAndroid12 } from '@/utils/bluetoothPermission';
// #endif

const { t: $t } = useI18n();
const toast = useToast();
const userStore = useUserStore();
const privacyStore = usePrivacyStore();
const STORAGE_LOGIN_Unionid_KEY = 'page-options-login-unionid';
const STORAGE_LOGIN_EMAIL_KEY = 'page-options-login-email';

// 隐私政策弹窗显示状态（仅 App 端使用）
const showPrivacyModal = ref(false);

// #ifdef APP-PLUS
/**
 * 检查是否需要显示隐私政策弹窗
 * SecGuard 要求（仅 Android）：App 首次启动时必须在用户交互前展示隐私政策
 */
onMounted(() => {
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.os.name === 'Android') {
    const hasAgreed = privacyStore.checkPrivacyAgreement();
    if (!hasAgreed) {
      showPrivacyModal.value = true;
    }
  }
  // #endif
});

/**
 * 用户同意隐私政策
 * 此时可以安全地进行网络请求和 SDK 初始化
 */
async function onPrivacyAgree() {
  console.log('[登录页] 用户同意隐私政策，开始初始化...');
  showPrivacyModal.value = false;
  
  // 1. 请求 Android 12+ 蓝牙权限
  requestBluetoothPermissionsForAndroid12();
  
  // 2. 初始化用户状态（恢复 Token 等）
  // 注意：需要 await 等待初始化完成，以便检查登录状态
  await userStore.initUserState();

  // 3. 检查是否已登录（针对老用户更新场景）
  // 如果初始化后发现本地有有效 Token，直接跳转首页
  if (userStore.isLoggedIn) {
    console.log('[登录页] 用户已登录，跳转首页');
    toast.success({ msg: $t('login.login_success'), duration: 2000 });
    setTimeout(() => {
      redirectToHome();
    }, 500);
  }
}

/**
 * 用户拒绝隐私政策
 */
function onPrivacyDisagree() {
  console.log('[登录页] 用户拒绝隐私政策');
  // privacyStore.rejectPrivacyPolicy() 会在组件内部处理退出逻辑
}
// #endif

// 响应式数据
const showPasswordModal = ref(false);
const passwordForm = ref<IPasswordLoginForm>({
  unionid: '',
  password: ''
});
const showPassword = ref(false);
const showEmailModal = ref(false);
const emailForm = ref({
  email: '',
  password: ''
});
const showEmailPassword = ref(false);
const appConfig = APP_CONFIG;

// 短信登录相关响应式数据 (仅 App 端)
// #ifdef APP-PLUS || APP-HARMONY
const showSmsModal = ref(false);
// #endif

// 用户是否同意协议（用于展示/跳转，默认不勾选以满足合规性）
const agreeChecked = ref(false);

function openExternal(src: string) {
  const encoded = encodeURIComponent(src);
  uni.navigateTo({ url: '/pages/webview/webview?src=' + encoded });
}

function openTerms() {
  openExternal(APP_CONFIG.TERMS_URL);
}

function openPrivacy() {
  openExternal(APP_CONFIG.PRIVACY_URL);
}

function ensureAgreement(): boolean {
  if (!agreeChecked.value) {
    toast.warning({ msg: $t('login.please_agree_terms'), duration: 3000 });
    return false;
  }
  return true;
}

// 生命周期钩子
onLoad(async () => {
  // 如果已登录，直接跳转
  if (userStore.isLoggedIn) {
    await userStore.fetchUserInfo();
    redirectToHome();
    return;
  }

  // #ifdef APP-PLUS || APP-HARMONY
  // 读取上次登录账号名缓存
  const lastLoginUnionId = storage.get(STORAGE_LOGIN_Unionid_KEY);
  if (lastLoginUnionId) {
    passwordForm.value.unionid = lastLoginUnionId;
  }
  // #endif

  const lastLoginEmail = storage.get(STORAGE_LOGIN_EMAIL_KEY);
  if (lastLoginEmail) {
    emailForm.value.email = lastLoginEmail;
  }
});

// 方法
function handleLoginSuccess() {
  toast.success({
    msg: $t('login.login_success'),
    duration: 2000,
    cover: true
  });

  setTimeout(() => {
    redirectToHome();
  }, 1500);
}

function handleLoginError(error: any) {
  console.error('登录失败:', error);
  toast.warning({
    msg: error.message || $t('login.login_failed'),
    duration: 3000
  });
}

/**
 * 请求 Google OAuth
 */
async function handleGoogleLogin() {
  if (!ensureAgreement()) return;
  const isSuccess = await userStore.googleLogin();
  // 登录成功
  if (isSuccess) {
    handleLoginSuccess();
  } else {
    // 失败
    if (userStore.loginError.includes($t('login.auth_cancel'))) {
      // 取消登录
    } else {
      handleLoginError(userStore.loginError);
    }
  }
}

/**
 * 请求 Apple Login
 */
async function handleAppleLogin() {
  if (!ensureAgreement()) return;
  const isSuccess = await userStore.appleLogin();
  if (isSuccess) {
    handleLoginSuccess();
  } else {
    if (userStore.loginError.includes('cancel') || userStore.loginError.includes('取消')) {
      // 取消登录
    } else {
      handleLoginError({ message: userStore.loginError });
    }
  }
}

/**
 * 请求 WeChat OAuth（App端）
 */
async function handleWxAppLogin() {
  if (!ensureAgreement()) return;
  const isSuccess = await userStore.wxAppLogin();
  if (isSuccess) {
    handleLoginSuccess();
  } else {
    if (userStore.loginError?.includes('cancel') || userStore.loginError?.includes('取消')) {
      // 取消登录
    } else {
      handleLoginError(userStore.loginError || $t('login.login_failed'));
    }
  }
}

async function handlePhoneLogin(e: any) {
  if (!ensureAgreement()) return;
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    toast.warning({
      msg: $t('login.auth_failed'),
      duration: 3000
    });
    return;
  }

  try {
    // 获取微信登录code
    const loginRes = await getWxCode();

    // 调用登录接口
    const loginData = {
      code: loginRes.code,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv
    };

    const isSuccess = await userStore.miniPhoneLogin(loginData);
    if (isSuccess) {
      handleLoginSuccess();
    } else {
      handleLoginError({ message: userStore.loginError || $t('login.login_failed') });
    }
  } catch (error: any) {
    handleLoginError(error);
  }
}

function handlePhoneLoginBlocked() {
  ensureAgreement();
}

async function handleGuestLogin() {
  if (!ensureAgreement()) return;
  try {
    const isSuccess = await userStore.guestLogin();
    if (isSuccess) {
      handleLoginSuccess();
    } else {
      handleLoginError({ message: userStore.loginError || $t('login.login_failed') });
    }
  } catch (error: any) {
    handleLoginError(error);
  }
}

function getWxCode(): Promise<any> {
  return new Promise((resolve, reject) => {
    uni.login({
      success: resolve,
      fail: reject
    });
  });
}

function redirectToHome() {
  uni.switchTab({
    url: PageMap[Pages.Index].url
  });
}

async function handlePasswordLogin() {
  if (!ensureAgreement()) return;
  // 显示密码登录弹窗
  showPasswordModal.value = true;
}

function openEmailModal() {
  if (!ensureAgreement()) return;
  showEmailModal.value = true;
}

function goToRegister() {
  uni.navigateTo({
    url: PageMap[Pages.Register].url
  });
}

function closePasswordModal() {
  showPasswordModal.value = false;
  passwordForm.value = {
    unionid: '',
    password: ''
  };
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

async function submitPasswordLogin() {
  if (!ensureAgreement()) return;
  // 表单验证
  if (!passwordForm.value.unionid) {
    toast.warning({ msg: $t('login.please_enter_unionid'), duration: 3000 });
    return;
  }

  if (passwordForm.value.unionid.length < 3) {
    toast.warning({ msg: $t('login.unionid_min_3_chars'), duration: 3000 });
    return;
  }

  if (!passwordForm.value.password) {
    toast.warning({ msg: $t('login.please_enter_password'), duration: 3000 });
    return;
  }

  try {
    const res = await userStore.passwordLogin(passwordForm.value);
    if (!res) {
      toast.warning({ msg: userStore.loginError || $t('login.login_failed'), duration: 3000 });
      return;
    }

    // 缓存上次登录账号名
    storage.set(STORAGE_LOGIN_Unionid_KEY, passwordForm.value.unionid);

    handleLoginSuccess();
    closePasswordModal();
  } catch (error: any) {
    handleLoginError(error);
  }
}

function closeEmailModal() {
  showEmailModal.value = false;
  emailForm.value = {
    email: emailForm.value.email,
    password: ''
  };
  showEmailPassword.value = false;
}

function toggleEmailPasswordVisibility() {
  showEmailPassword.value = !showEmailPassword.value;
}

async function submitEmailLogin() {
  if (!ensureAgreement()) return;
  // 验证邮箱是否填写
  if (!emailForm.value.email) {
    toast.warning({ msg: $t('login.account_required'), duration: 3000 });
    return;
  }

  // 验证邮箱格式
  const emailPattern = /\S+@\S+\.\S+/;
  if (!emailPattern.test(emailForm.value.email)) {
    toast.warning({ msg: $t('login.account_invalid'), duration: 3000 });
    return;
  }

  // 验证密码是否填写
  if (!emailForm.value.password) {
    toast.warning({ msg: $t('register.password_required'), duration: 3000 });
    return;
  }

  try {
    // 调用邮箱登录接口
    const success = await userStore.emailLogin({
      email: emailForm.value.email,
      password: emailForm.value.password
    });

    if (!success) {
      toast.warning({ msg: userStore.loginError || $t('login.login_failed'), duration: 3000 });
      return;
    }

    // 缓存上次登录的邮箱
    storage.set(STORAGE_LOGIN_EMAIL_KEY, emailForm.value.email);

    handleLoginSuccess();
    closeEmailModal();
  } catch (error: any) {
    handleLoginError(error);
  }
}

// ==================== 短信登录相关方法 (仅 App 端) ====================
// #ifdef APP-PLUS || APP-HARMONY
/**
 * 打开短信登录弹窗
 */
function openSmsModal() {
  if (!ensureAgreement()) return;
  showSmsModal.value = true;
}

/**
 * 处理短信登录提交
 */
async function handleSmsLoginSubmit(data: { phone: string; ticket: string; code: string }) {
  try {
    // 调用后端短信登录接口
    const success = await userStore.smsLogin({
      phone: data.phone,
      ticket: data.ticket,
      smsCode: data.code
    });
    
    // 实际登录逻辑
    if (!success) {
      toast.warning({ msg: userStore.loginError || $t('login.login_failed'), duration: 3000 });
      return;
    }
    handleLoginSuccess();
    showSmsModal.value = false;
  } catch (error: any) {
    handleLoginError(error);
  }
}
// #endif
</script>

<style>
/* iOS 橡皮筋效果修复 - 页面背景 */
page {
  background: linear-gradient(
    180deg,
    rgba(161, 140, 209, 0.6) 0%,
    rgba(143, 211, 244, 0.6) 50%,
    rgba(251, 194, 235, 0.6) 100%
  );
  min-height: 100vh;
  height: 100%;
}

.login-container {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  position: relative;
  /* 根据Figma设计稿 - 三色线性渐变背景，60%透明度 */
  background-color: #ffffff;
  background-image: linear-gradient(
    180deg,
    rgba(161, 140, 209, 0.6) 0%,      /* #A18CD1 紫色 60% */
    rgba(143, 211, 244, 0.6) 50%,     /* #8FD3F4 浅蓝色 60% */
    rgba(251, 194, 235, 0.6) 100%     /* #FBC2EB 粉色 60% */
  );
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

/* Logo水印背景 - 使用SVG mask实现纯白色镂空效果 */
.login-container::before {
  content: '';
  position: absolute;
  width: 922rpx;
  height: 922rpx;
  right: -200rpx;
  top: -200rpx;
  transform: rotate(14.29deg);
  opacity: 0.15;
  /* 纯白色背景 */
  background: #ffffff;
  /* 使用SVG作为遮罩，眼睛部分会镂空 */
  -webkit-mask: url('/static/logo-watermark.svg') no-repeat center;
  mask: url('/static/logo-watermark.svg') no-repeat center;
  -webkit-mask-size: contain;
  mask-size: contain;
  z-index: 1;
  pointer-events: none;
}


/* 底部装饰圆形 */
.login-container .decoration-bottom {
  position: absolute;
  width: 352rpx;
  height: 352rpx;
  left: -100rpx;
  bottom: -100rpx;
  background-color: rgba(147, 197, 253, 0.3);
  border-radius: 50%;
  filter: blur(40rpx);
  z-index: 2;
  pointer-events: none;
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
  gap: 256rpx;
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
  border-radius: 40rpx;
  box-shadow: 0 11rpx 43rpx rgba(31, 38, 135, 0.2);
  overflow: hidden;
  /* 去掉白色背景，让 logo.jpg 自带的蓝色背景显示 */
}



.logo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  /* 填满整个容器 */
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 72rpx;
  text-align: center;
}

.app-desc {
  color: #262626;
  font-size: 28rpx;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 56rpx;
  text-align: center;
}

/* 登录按钮区域 */
.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 32rpx;
}

.login-btn {
  font-size: 32rpx;
  width: 100%;
  height: 96rpx !important;
  min-height: 96rpx !important;
  line-height: 96rpx !important;
  position: relative;
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 32rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}


/* 手机号快捷登录按钮 - 根据Figma设计稿 */
.login-btn.primary {
  background: #335CFF;
  color: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(31, 38, 135, 0.2);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.login-btn:disabled {
  opacity: 0.45;
  box-shadow: none;
  cursor: not-allowed;
}

.login-btn.need-agree {
  opacity: 0.75;
}

/* .login-btn::before {
  content: '';
  position: absolute;
  left: 0rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 96rpx;
  height: 96rpx;
  margin-right: 16rpx;
  background-size: 56rpx 56rpx;
  border-radius: 50%;
} */

/* .login-btn.wx::before {
  background: white url('/static/icons/WeChat.svg') no-repeat center center;
} */

.login-btn.google {
  background: rgba(255, 255, 255, 0.92);
  color: #1f2937;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
}

.login-btn.apple {
  background: #000000;
  color: #ffffff;
  border: 2rpx solid rgba(0, 0, 0, 0.1);
}

/* Apple Sign In 按钮 - 遵循Apple HIG设计规范 */
.apple-signin-btn {
  width: 100%;
  height: 88rpx !important;
  min-height: 88rpx !important;
  line-height: 88rpx !important;
  background: #000000;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  border: none;
  border-radius: 48rpx; /* Apple规范约6pt圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.apple-signin-btn:disabled {
  opacity: 0.45;
  box-shadow: none;
  cursor: not-allowed;
}

.apple-signin-btn.need-agree {
  opacity: 0.75;
}

.apple-logo {
  width: 44rpx;
  height: 44rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
  /* 裁剪SVG中的黑色背景，只显示白色Apple Logo */
  object-fit: none;
  object-position: center;
  transform: scale(2.2);
}

.apple-btn-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

/* 注册账号链接样式 */
.register-link {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  text-decoration: underline;
  text-align: center;
  padding: 16rpx;
  cursor: pointer;
}

.register-link:active {
  opacity: 0.7;
}

/* 密码登录弹窗样式 */
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

.password-modal {
  width: 90%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

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

.modal-content .password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.modal-content .password-input .input {
  padding-right: 80rpx;
}

.modal-content .eye-icon {
  position: absolute;
  right: 24rpx;
  font-size: 32rpx;
  color: #999999;
  cursor: pointer;
}

.modal-content .eye-icon:active {
  opacity: 0.7;
}

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

/* 协议行 */
.terms-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  max-width: 640rpx;
  justify-content: center;
  margin-top: 12rpx;
  position: relative;
  z-index: 10;
  /* iOS 全面屏底部安全区域适配 */
  margin-bottom: 0;
  margin-bottom: constant(safe-area-inset-bottom);
  margin-bottom: env(safe-area-inset-bottom);
}
.terms-checkbox {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.terms-box {
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
}
.terms-box.checked {
  background: #335cff;
  border-color: #335cff;
}
.terms-text {
  color: #ffffff;
  font-size: 24rpx;
}
.terms-link {
  color: #ffffff;
  font-weight: 600;
  text-decoration: underline;
  margin: 0 6rpx;
}

/* 自动注册提示文字 */
.register-tip {
  color: #ffffff;
  font-size: 24rpx;
  text-align: center;
  margin-top: 16rpx;
}
</style>
