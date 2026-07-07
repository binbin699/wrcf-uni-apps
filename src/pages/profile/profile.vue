<template>
  <wd-toast />
  <view class="page-container">
    <!-- 顶部波浪装饰 -->
    <image class="top-wave-decoration" src="/static/icons/profile-top-wave.svg" mode="aspectFill" />
    <!-- 右上角模糊圆 -->
    <view class="top-ellipse"></view>

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
          <image class="avatar" :src="displayAvatar" mode="aspectFill"></image>
          <view class="user-details">
            <view class="nickname-container" @click="handleUpdateUserInfo">
              <text class="nickname">{{ userStore.nickname || $t('profile.no_nickname') }}</text>
              <image
                v-if="userStore.phone && !userStore.phone?.startsWith('0000')"
                class="nickname-arrow"
                src="/static/icons/chevron-right-dark.svg"
                mode="aspectFit" />
            </view>
            <!-- 测试账号不显示手机号，没有手机号也不显示 -->
            <text class="phone" v-if="userStore.phone && !userStore.phone?.startsWith('0000')">
              {{ $t('profile.phone') }}：{{ hidePhone(userStore.phone) || '' }}
            </text>
          </view>
        </view>
      </view>

      <view class="menu-list">
        <view v-for="(group, gIdx) in menuGroups" :key="gIdx" class="menu-group">
          <view
            v-for="(item, iIdx) in group"
            :key="item.id"
            class="menu-item"
            @click="item.handleClick">
            <view class="menu-icon-wrapper">
              <image class="icon-image" :src="item.icon" mode="aspectFit"></image>
            </view>
            <text class="menu-title">{{ item.title }}</text>
            <view class="menu-arrow">
              <image
                class="arrow-image"
                src="/static/icons/chevron-right.svg"
                mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>

      <view class="logout-section">
        <view class="logout-btn danger" @click="handleLogout">
          <text>{{ $t('profile.logout') }}</text>
        </view>
        <view class="logout-btn outlined" @click="goDeleteAccount">
          <text>{{ $t('profile.delete_account') }}</text>
        </view>
        <!-- 版本号显示 -->
        <view class="version-info">
          <text class="version-text">v{{ appVersion }}</text>
        </view>
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
import { useDeviceScan } from '@/utils/useDeviceScan';
// @ts-ignore
import { deviceApi } from '@/api/index';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { AppInfo } from '@/const/index';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { openFeedbackMail } from '@/utils/openFeedbackMail';
import type { ProfileEntryGroupId } from '../../../scripts/config-tool/validate.ts';

const toast = useToast();
useGlobalRequestErrorToast(toast);
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

function sendFeedbackEmail() {
  const email = APP_CONFIG.FEEDBACK_EMAIL;
  if (!email) return;

  // 使用 mailto: 协议打开邮件客户端
  // #ifdef APP-PLUS
  plus.runtime.openURL(
    `mailto:${email}?subject=${encodeURIComponent($t('profile.feedback_subject'))}`
  );
  // #endif
  // #ifndef APP-PLUS
  window.location.href = `mailto:${email}?subject=${encodeURIComponent($t('profile.feedback_subject'))}`;
  // #endif
}

const hiddenClickCount = ref<number>(0);
const statusBarHeight = ref<number>(44);

// 获取应用版本号（从 manifest.json 自动读取，构建时注入）
const appVersion = ref<string>(APP_VERSION);
function getAppVersion() {
  // #ifdef APP-PLUS
  // App 环境下优先使用运行时版本号
  const appId = plus.runtime.appid;
  if (appId) {
    plus.runtime.getProperty(appId, (info) => {
      appVersion.value = info.version || APP_VERSION;
    });
  }
  // #endif
}

// 获取状态栏高度
function setStatusBarHeight() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 44;
}
const setupMode = APP_CONFIG.APP_SETUP_MODE || 'both';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  handleClick: () => void;
}

const showVoicePrint = computed(() => {
  const locale = (uni.getLocale() || '').toLowerCase();
  const isChinese = locale.startsWith('zh');
  const isHarmony = AppInfo.isHarmonyApp() || AppInfo.isHarmonyRom();
  return isChinese && !isHarmony;
});

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
      id: 'net_config',
      title: $t('profile.net_config'),
      icon: '/static/icons/add-device-qrcode.svg',
      handleClick: () => {
        handleScanAndBindDevice();
      }
    },
    {
      id: 'wifi_config_qrcode',
      title: $t('profile.wifi_config_qrcode'),
      icon: '/static/icons/wifi-config-qrcode.svg',
      handleClick: () => {
        uni.navigateTo({
          url: PageMap[Pages.NetConfig].url + '?bound=1'
        });
      }
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
      id: 'wifi_config_bluetooth',
      title: $t('profile.wifi_config_bluetooth'),
      icon: '/static/icons/bluetooth-config.svg',
      handleClick: () =>
        uni.navigateTo({
          url: PageMap[Pages.BluetoothConfig].url + '?configOnly=1'
        })
    },
    APP_CONFIG.APP_USE_VOICE_CLONE && showVoicePrint.value
      ? {
          id: 'voice_manage',
          title: $t('profile.voice_manage'),
          icon: '/static/icons/voice-manage.svg',
          handleClick: () =>
            uni.navigateTo({
              url: PageMap[Pages.VoiceManage].url
            })
        }
      : undefined,
    APP_CONFIG.APP_USE_VOICE_CLONE && showVoicePrint.value
      ? {
          id: 'voice_clone',
          title: $t('profile.voice_clone'),
          icon: '/static/icons/voice-clone.svg',
          handleClick: () =>
            uni.navigateTo({
              url: PageMap[Pages.VoiceClone].url
            })
        }
      : undefined,
    // APP_CONFIG.SHOW_INSTRUCTIONS_TUTORIALS
    //   ? {
    //       id: 'instructions_tutorials',
    //       title: $t('profile.instructions_tutorials'),
    //       icon: '/static/icons/instructions.svg',
    //       handleClick: () => uni.navigateTo({ url: '/pages/profile/help' })
    //     }
    //   : undefined,
    APP_CONFIG.TERMS_URL
      ? {
          id: 'user_agreement',
          title: $t('profile.user_agreement'),
          icon: '/static/icons/user-agreement.svg',
          handleClick: () => openExternal(APP_CONFIG.TERMS_URL)
        }
      : undefined,
    APP_CONFIG.PRIVACY_URL
      ? {
          id: 'privacy_policy',
          title: $t('profile.privacy_policy'),
          icon: '/static/icons/privacy-policy.svg',
          handleClick: () => openExternal(APP_CONFIG.PRIVACY_URL)
        }
      : undefined,
    APP_CONFIG.FEEDBACK_EMAIL
      ? {
          id: 'feedback',
          title: $t('profile.feedback'),
          icon: '/static/icons/feedback.svg',
          handleClick: () => sendFeedbackEmail()
        }
      : undefined
  ];

  return items
    .filter((item) => item !== undefined)
    .filter((item) => {
      if (setupMode === 'qrcode' && item.id === 'bluetooth_config') return false;
      if (setupMode === 'qrcode' && item.id === 'wifi_config_bluetooth') return false;
      if (setupMode === 'bluetooth' && item.id === 'net_config') return false;
      if (setupMode === 'bluetooth' && item.id === 'wifi_config_qrcode') return false;
      return true;
    });
});

// 菜单分组定义
const groupDefs: string[][] = [
  ['device_management'],
  ['net_config', 'wifi_config_qrcode'],
  ['bluetooth_config', 'wifi_config_bluetooth'],
  ['voice_manage', 'voice_clone'],
  // ['instructions_tutorials'],
  ['user_agreement', 'privacy_policy'],
  ['feedback']
];

const menuGroups = computed(() => {
  const items = menuItems.value;
  const groups: MenuItem[][] = [];
  for (const def of groupDefs) {
    const group = def
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is MenuItem => !!item);
    if (group.length > 0) {
      groups.push(group);
    }
  }
  return groups;
});

onLoad(() => {
  setStatusBarHeight();
  getAppVersion();
  // 页面加载时刷新用户信息
  refreshUserInfo();
});

onShow(() => {
  // 隐藏系统 TabBar（解决微信小程序 iOS 双重导航栏问题）
  uni.hideTabBar({ animation: false });
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
  await scanAndBind({ fromAddDevice: true });
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
        console.error('[个人中心/updateUserInfo] 失败:', error);
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
  background-image: url('@/img/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

/* 顶部波浪装饰 */
.top-wave-decoration {
  position: absolute;
  width: calc(100% + 18px);
  height: 161px;
  left: -9px;
  top: -4px;
  z-index: 0;
  pointer-events: none;
}

/* 右上角模糊圆 */
.top-ellipse {
  position: absolute;
  width: 168px;
  height: 168px;
  right: -62px;
  top: -72px;
  background: var(--color-primary-bg);
  border-radius: 50%;
  filter: blur(4px);
  z-index: 0;
  pointer-events: none;
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
  color: #212730;
  font-size: 32rpx;
  font-weight: 500;
}

.nickname-arrow {
  width: 24rpx;
  height: 24rpx;
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
  line-height: 1.25;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  position: relative;
  z-index: 1;
}

.menu-group {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
}

.menu-item {
  height: 112rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}

.menu-icon-wrapper {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}

.icon-image {
  width: 36rpx;
  height: 36rpx;
  /* 将彩色图标统一调整为 #212730 深色 */
  filter: brightness(0) saturate(100%) invert(13%) sepia(10%) saturate(600%) hue-rotate(180deg)
    brightness(92%);
}

.menu-title {
  flex: 1;
  color: #212730;
  font-size: 32rpx;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.menu-arrow {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-arrow image {
  width: 32rpx;
  height: 32rpx;
}

.logout-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.logout-btn {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: none;
  box-shadow: none;
}

/* 退出登录按钮 */
.logout-btn.danger {
  background: #d5dae2;
  color: #212730;
  font-size: 16px;
  line-height: 24px;
}

/* 注销账号按钮 */
.logout-btn.outlined {
  background: transparent;
  color: #60718b;
  font-size: 14px;
  line-height: 24px;
}

/* 版本号显示 */
.version-info {
  margin-top: 24rpx;
  text-align: center;
}

.version-text {
  font-size: 24rpx;
  color: #9ca3af;
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
