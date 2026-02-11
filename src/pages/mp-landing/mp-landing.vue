<template>
  <wd-toast />
  <view class="landing-container">
    <!-- 欢迎卡片 -->
    <view class="welcome-popup">
      <view class="welcome-content">
        <view class="welcome-title">{{ $t('welcome.guide_title') }}</view>

        <!-- 两种模式并行 (默认) -->
        <view v-if="setupMode === 'both'" class="welcome-actions">
          <view class="welcome-setup-options">
            <view class="welcome-setup-card" @click="handleStartSetup">
              <view class="welcome-setup-icon-wrapper qr">
                <image class="welcome-setup-icon" src="/static/icons/scan-qrcode.svg" mode="aspectFit" />
              </view>
              <text class="welcome-setup-text">{{ $t('welcome.setup_qrcode') }}</text>
            </view>
            <view class="welcome-setup-card" @click="handleBluetoothSetup">
              <view class="welcome-setup-icon-wrapper bluetooth">
                <image class="welcome-setup-icon" src="/static/icons/bluetooth.svg" mode="aspectFit" />
              </view>
              <text class="welcome-setup-text">{{ $t('welcome.setup_bluetooth') }}</text>
            </view>
          </view>
        </view>

        <!-- 单个模式 (扫码或蓝牙) -->
        <view v-else class="welcome-actions-single">
          <view class="welcome-icon-wrapper single" :class="setupMode">
            <image
              v-if="setupMode === 'qrcode'"
              class="welcome-setup-icon-large"
              src="/static/icons/scan-qrcode.svg"
              mode="aspectFit" />
            <image
              v-else
              class="welcome-setup-icon-large"
              src="/static/icons/bluetooth.svg"
              mode="aspectFit" />
          </view>
          <view
            class="welcome-primary-btn"
            @click="setupMode === 'qrcode' ? handleStartSetup() : handleBluetoothSetup()">
            {{ setupMode === 'qrcode' ? $t('welcome.setup_qrcode') : $t('welcome.setup_bluetooth') }}
          </view>
        </view>

        <!-- 跳过按钮 -->
        <view class="welcome-skip" @click="handleSkipSetup">
          {{ $t('welcome.skip_and_browse') }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { onShow } from '@dcloudio/uni-app';
import { useToast } from '@/uni_modules/wot-design-uni';
import { useUserStore } from '@/store';
import { PageMap, Pages } from '@/utils/route';

defineOptions({
  name: 'MpLanding'
});

const { t: $t } = useI18n();
const toast = useToast();
const userStore = useUserStore();

const setupMode = APP_CONFIG.APP_SETUP_MODE || 'both';
const isNavigating = ref(false);
const PENDING_BIND_KEY = 'pendingBindAction';
type PendingBindAction = 'qrcode' | 'bluetooth';

// 检查是否已登录
onShow(() => {
  // 如果已登录，直接跳转到首页
  if (userStore.isLoggedIn && userStore.userId > 0) {
    redirectToHome();
  }
});

// 判断用户是否真正登录
function isUserAuthenticated(): boolean {
  return userStore.isLoggedIn && userStore.userId > 0;
}

// 跳转到设备页
function redirectToHome() {
  uni.switchTab({
    url: PageMap[Pages.DeviceStatus].url
  });
}

// 跳转到登录页
function goToLogin(action: PendingBindAction) {
  // 记录待执行的操作
  uni.setStorageSync(PENDING_BIND_KEY, action);
  // 跳转到登录页
  uni.navigateTo({
    url: PageMap[Pages.Login].url
  });
}

// 扫码添加：直接跳转登录页
function handleStartSetup() {
  if (isUserAuthenticated()) {
    redirectToHome();
    return;
  }
  goToLogin('qrcode');
}

// 蓝牙添加：直接跳转登录页
function handleBluetoothSetup() {
  if (isUserAuthenticated()) {
    redirectToHome();
    return;
  }
  goToLogin('bluetooth');
}

// 暂不绑定：游客登录后跳转首页
async function handleSkipSetup() {
  if (isNavigating.value) return;
  
  isNavigating.value = true;
  toast.loading({ msg: '', cover: true });
  
  try {
    const success = await userStore.guestLogin();
    toast.close();
    isNavigating.value = false;
    
    if (success) {
      redirectToHome();
    } else {
      toast.warning({
        msg: $t('login.login_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    toast.close();
    isNavigating.value = false;
    console.error('游客登录失败:', error);
  }
}
</script>

<style lang="scss" scoped>
/* 与 index.vue 的 welcome-overlay 完全一致 */
.landing-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding-bottom: 160rpx;
}

/* 与 index.vue 的 welcome-popup 完全一致 */
.welcome-popup {
  width: calc(100% - 120rpx);
  max-width: 640rpx;
}

/* 与 index.vue 的 welcome-content 完全一致 */
.welcome-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 36rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 28rpx 72rpx rgba(37, 99, 235, 0.22);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  white-space: pre-line;
  text-align: center;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.welcome-setup-options {
  display: flex;
  width: 100%;
  gap: 24rpx;
  justify-content: center;
}

.welcome-setup-card {
  flex: 1;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  transition: all 0.2s ease;
  border: 1rpx solid #f1f5f9;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.welcome-setup-card:active {
  transform: scale(0.96);
  background: #f8fafc;
}

.welcome-setup-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
}

.welcome-setup-icon-wrapper.qr {
  background: linear-gradient(135deg, #10b981, #059669);
}

.welcome-setup-icon-wrapper.bluetooth {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.welcome-setup-icon {
  width: 48rpx;
  height: 48rpx;
}

.welcome-setup-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #334155;
}

/* 单个模式样式 */
.welcome-actions-single {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  width: 100%;
}

.welcome-icon-wrapper.single {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 32rpx rgba(0, 0, 0, 0.1);
}

.welcome-icon-wrapper.single.qrcode {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 16rpx 32rpx rgba(16, 185, 129, 0.25);
}

.welcome-icon-wrapper.single.bluetooth {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 16rpx 32rpx rgba(59, 130, 246, 0.25);
}

.welcome-setup-icon-large {
  width: 72rpx;
  height: 72rpx;
}

.welcome-primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #335CFF, #2563eb);
  border-radius: 48rpx;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 12rpx 32rpx rgba(51, 92, 255, 0.35);
  transition: all 0.2s ease;
}

.welcome-primary-btn:active {
  transform: scale(0.98);
  box-shadow: 0 8rpx 24rpx rgba(51, 92, 255, 0.25);
}

/* 跳过按钮 */
.welcome-skip {
  color: #94a3b8;
  font-size: 26rpx;
  padding: 10rpx 40rpx;
  text-align: center;
}

.welcome-skip:active {
  color: #64748b;
}
</style>
