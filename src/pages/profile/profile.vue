<template>
  <wd-toast />
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content">
        <text class="nav-title">{{ $t('pages.profile') }}</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="container">
      <view class="profile-header">
      <view class="user-info">
        <image
          class="avatar"
          :src="displayAvatar"
          mode="aspectFill"></image>
        <view class="user-details">
          <view class="nickname-container" @click="handleUpdateUserInfo">
            <text class="nickname">{{ userStore.nickname || $t('profile.no_nickname') }}</text>
            <image
              v-if="!userStore.phone?.startsWith('0000')"
              class="edit-icon"
              src="/static/icons/right-arrow.svg"
              mode="aspectFit"></image>
          </view>
          <!-- 测试账号不显示手机号，没有手机号也不显示 -->
          <text class="phone" v-if="userStore.phone && !userStore.phone?.startsWith('0000')">
            {{ $t('profile.phone') }}：{{ hidePhone(userStore.phone) || '' }}
          </text>
        </view>
      </view>
    </view>

    <view class="menu-list">
      <template v-for="item in menuItems" :key="item.title">
        <view class="menu-item" @click="item.handleClick">
          <view class="menu-icon">
            <image class="icon-image" :src="item.icon" mode="aspectFit"></image>
          </view>
          <text class="menu-title">{{ item.title }}</text>
          <view class="menu-arrow">
            <image class="arrow-image" src="/static/icons/right-arrow.svg" mode="aspectFit"></image>
          </view>
        </view>
      </template>
    </view>

    <view class="logout-section">
      <button class="logout-btn danger" @click="handleLogout">
        {{ $t('profile.logout') }}
      </button>
      <button class="logout-btn outlined" @click="goDeleteAccount">
        {{ $t('profile.delete_account') }}
      </button>
      <!-- 隐藏的可交互元素，点击7次后跳转到mock-test页面 -->
      <view class="hidden-trigger" @click="handleHiddenClick"></view>
    </view>
    
    <!-- 自定义 TabBar -->
    <CustomTabBar :current="3" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/store/user';
import { PageMap, Pages } from '@/utils/route';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useToast } from '@/uni_modules/wot-design-uni/components/wd-toast';
import { useNotify } from '@/uni_modules/wot-design-uni';
import { AppConfig } from '@/configs/';
import { useDeviceScan } from '@/utils/useDeviceScan';
import { updateSquareTabBadge } from '@/utils/tabBarBadge';
import { ENV } from '@/const/env';
// @ts-ignore
import { deviceApi } from '@/api/index.js';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { APP_USE_VOICEPRINT } from '@/const/env';

const toast = useToast();
const { showNotify, closeNotify } = useNotify();
const { t: $t } = useI18n();

// 使用用户store
const userStore = useUserStore();

// 根据登录类型获取默认头像
// 微信登录（有外部头像URL）→ vx.jpg
// 游客登录、邮箱登录、其他登录 → logo1.jpg
const defaultAvatar = computed(() => {
  // 判断是否是微信登录：微信登录的用户通常有外部头像 URL
  const avatar = userStore.avatar;
  const isWechatLogin = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://'));
  return isWechatLogin ? '/static/vx.jpg' : '/static/logo1.jpg';
});

// 最终显示的头像（用户头像 > 默认头像）
const displayAvatar = computed(() => {
  return userStore.avatar || defaultAvatar.value;
});


function openExternal(src: string) {
  const encoded = encodeURIComponent(src);
  uni.navigateTo({ url: '/pages/webview/webview?src=' + encoded });
}

const hiddenClickCount = ref<number>(0);
const statusBarHeight = ref<number>(44);

// 获取状态栏高度
function setStatusBarHeight() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 44;
}
const setupMode = ENV.VITE_APP_SETUP_MODE || 'both';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  handleClick: () => void;
}

const menuItems = computed(() => {
  const items: (MenuItem | undefined)[] = [
    {
      id: 'device_management',
      title: $t('profile.device_management'),
      icon: '/static/icons/devices.svg',
      handleClick: () =>
        uni.navigateTo({
          url: PageMap[Pages.DeviceManage].url
        })
    },
    {
      id: 'bluetooth_config',
      title: $t('profile.bluetooth_config'),
      icon: '/static/icons/bluetooth.svg',
      handleClick: () =>
        uni.navigateTo({
          url: PageMap[Pages.BluetoothConfig].url
        })
    },
    {
      id: 'net_config',
      title: $t('profile.net_config'),
      icon: '/static/icons/scan-qrcode.svg',
      handleClick: () => {
        handleScanAndBindDevice();
      }
    },
    APP_USE_VOICEPRINT ? {
      id: 'voice_manage',
      title: $t('profile.voice_manage'),
      icon: '/static/icons/voice-manage.svg',
      handleClick: () =>
        uni.navigateTo({
          url: PageMap[Pages.VoiceManage].url
        })
    } : undefined,
    APP_USE_VOICEPRINT ? {
      id: 'voice_clone',
      title: $t('profile.voice_clone'),
      icon: '/static/icons/voice-clone.svg',
      handleClick: () =>
        uni.navigateTo({
          url: PageMap[Pages.VoiceClone].url
        })
    } : undefined,
    {
      id: 'user_agreement',
      title: $t('profile.user_agreement'),
      icon: '/static/icons/setting.svg',
      handleClick: () => openExternal(AppConfig.current.TERMS_URL)
    },
    {
      id: 'privacy_policy',
      title: $t('profile.privacy_policy'),
      icon: '/static/icons/setting.svg',
      handleClick: () => openExternal(AppConfig.current.PRIVACY_URL)
    }
  ];

  return items.filter(item => item !== undefined).filter((item) => {
    if (setupMode === 'qrcode' && item.id === 'bluetooth_config') return false;
    if (setupMode === 'bluetooth' && item.id === 'net_config') return false;
    return true;
  });
});

onLoad(() => {
  setStatusBarHeight();
  // 页面加载时刷新用户信息
  refreshUserInfo();
});

onShow(() => {
  updateSquareTabBadge();
  // #ifdef APP-PLUS
  uni.hideTabBar({ animation: false });
  // #endif
});

// 刷新用户信息
async function refreshUserInfo() {
  try {
    await userStore.fetchUserInfo();
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}

const { scanAndBind } = useDeviceScan();

// 扫码绑定设备
async function handleScanAndBindDevice() {
  await scanAndBind();
}

const hidePhone = (phone: string) => {
  if (!phone) {
    return '';
  }
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

function handleHiddenClick() {
  hiddenClickCount.value++;

  if (hiddenClickCount.value >= 7) {
    hiddenClickCount.value = 0; // 重置计数
    uni.navigateTo({
      url: PageMap[Pages.MockTest].url
    });
  }
}

function handleUpdateUserInfo() {
  if (userStore.phone?.startsWith('0000')) return;

  // todo app暂不处理
  // #ifdef MP-WEIXIN

  uni.showModal({
    title: $t('profile.update_user_info'),
    content: $t('profile.update_user_info_confirm'),
    cancelText: $t('common.cancel'),
    confirmText: $t('common.confirm'),
    success: (res) => {
      if (res.confirm) {
        requestUserProfile();
      }
    }
  });
  // #endif
}

function requestUserProfile() {
  uni.getUserProfile({
    desc: $t('profile.user_profile_desc'), // 声明获取用户个人信息后的用途

    success: async (res) => {
      console.log('获取用户信息成功:', res);

      try {
        // 使用store的updateUserInfo方法更新用户信息
        await userStore.updateUserInfo({
          nickname: res.userInfo.nickName,
          avatar: res.userInfo.avatarUrl,
          // @ts-ignore
          gender: res.userInfo?.gender || 0
        });

        uni.showToast({
          title: $t('profile.update_success'),
          icon: 'success'
        });
      } catch (error) {
        console.error('更新用户信息失败:', error);
        uni.showToast({
          title: $t('profile.update_failed'),
          icon: 'error'
        });
      }
    },
    fail: (err) => {
      console.log('用户拒绝授权或获取失败:', err);
      uni.showToast({
        title: $t('profile.user_cancelled'),
        icon: 'none'
      });
    }
  });
}

function handleLogout() {
  uni.showModal({
    title: $t('common.tip'),
    content: $t('profile.confirm_logout'),
    cancelText: $t('common.cancel'),
    confirmText: $t('common.confirm'),
    success: (res) => {
      if (res.confirm) {
        userStore.logout();

        toast.success({
          msg: $t('profile.logout_success'),
          duration: 2000,
          cover: true
        });

        // 跳转到登录页面
        uni.redirectTo({
          url: PageMap[Pages.Login].url
        });
      }
    }
  });
}

function goDeleteAccount() {
  uni.navigateTo({
    url: PageMap[Pages.DeleteAccount].url
  });
}
</script>

<style>
/* 整个页面容器 - 渐变背景覆盖导航栏和内容区 */
.page-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  /* 基础渐变背景 */
  background: linear-gradient(
    135deg,
    rgba(255, 252, 245, 0.6) 0%,       /* 左上极淡黄 */
    rgba(210, 200, 245, 0.25) 45%,     /* 中间蓝紫色 */
    rgba(255, 253, 248, 0.5) 100%      /* 右下淡黄白 */
  );
}

/* 右上角蓝色光晕 */
.page-container::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top right, rgba(143, 211, 244, 0.25) 0%, transparent 45%);
  pointer-events: none;
  z-index: 0;
}

/* 左上角极淡黄色光晕 */
.page-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top left, rgba(255, 248, 220, 0.25) 0%, transparent 35%);
  pointer-events: none;
  z-index: 0;
}

/* 内容区域 - 透明背景 */
.container {
  padding: 40rpx 40rpx;
  padding-bottom: calc(max(180rpx, 120rpx + env(safe-area-inset-bottom)));
  display: flex;
  flex-direction: column;
  position: relative;
  background: transparent;
}

/* 自定义导航栏 */
.custom-navbar {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: transparent;
  flex-shrink: 0;
}

.status-bar {
  height: 44px;
}

.nav-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.nav-title {
  font-size: 18px;
  font-weight: 500;
  color: #0f172a;
}

/* 内容区域 */
.container {
  flex: 1;
  position: relative;
  z-index: 1;
  padding: 40rpx 40rpx;
  padding-bottom: calc(66px + 30px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 50rpx;
}

.profile-header {
  height: 160rpx;
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  box-shadow: 0 5rpx 30rpx rgba(92, 103, 137, 0.15);
  overflow: hidden;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.nickname-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 10rpx;
}

.nickname {
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.edit-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.6;
}

.phone {
  color: #78716c;
  font-size: 28rpx;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 1.25;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  position: relative;
  z-index: 1;
}

.menu-item {
  height: 128rpx;
  position: relative;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 40rpx;
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  padding: 0 50rpx;
}

.menu-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 50rpx;
}

.icon-image {
  width: 48rpx;
  height: 48rpx;
}

/* .menu-item:nth-child(1) .menu-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #93c5fd 100%);
} */

.menu-item .menu-icon {
  background: linear-gradient(135deg, #93c5fd 0%, #f9a8d4 100%);
}

.menu-title {
  flex: 1;
  color: #1f2937;
  font-size: 32rpx;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.menu-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-arrow image {
  width: 48rpx;
  height: 48rpx;
}

.logout-section {
  /* margin-top: auto; */
  position: relative;
  z-index: 1;
}

.logout-btn {
  width: 100%;
  max-width: 350px;
  height: 48px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  margin: 0 auto;
}

/* 退出登录按钮 - 按设计稿 */
.logout-btn.danger {
  background: #FB3748;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px rgba(255, 82, 82, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.logout-btn + .logout-btn {
  margin-top: 12px;
}

/* 注销账号按钮 */
.logout-btn.outlined {
  background: rgba(255, 255, 255, 0.6);
  color: #FB3748;
  border: 1px solid rgba(251, 55, 72, 0.3);
  box-shadow: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hidden-trigger {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 40rpx;
  height: 40rpx;
  background: transparent;
  /* background: red; */
  z-index: 999;
}
</style>
