<template>
  <view class="help-page">
    <!-- 1. 自定义品牌导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="{ height: navContentHeight + 'px' }">
        <view class="nav-left" @click="goBack">
          <view class="back-button">
            <view class="back-arrow"></view>
          </view>
        </view>
        <view class="nav-center">
          <text class="nav-title">{{ $t('profile.instructions_tutorials') }}</text>
        </view>
        <view class="nav-right"></view> <!-- 占位平衡 -->
      </view>
    </view>

    <!-- 2. 主内容区域 -->
    <view 
      class="main-content" 
      :style="{ paddingTop: (statusBarHeight + navContentHeight) + 'px' }"
    >
      <!-- 说明书部分 -->
      <view class="section manual-section">
        <view class="section-title">{{ $t('help.manual_title') }}</view>
        
        <view 
          class="manual-card" 
          @click="openManual"
        >
          <view class="card-left">
            <view class="icon-box zh-theme">
              <image class="pdf-icon" src="/static/icons/setting.svg" mode="aspectFit" />
            </view>
            <view class="card-text">
              <text class="card-title">{{ $t('help.user_manual') }}</text>
            </view>
          </view>
          <image class="card-arrow" src="/static/icons/right-arrow.svg" mode="aspectFit" />
        </view>
      </view>

      <!-- 视频部分 -->
      <view class="section video-section">
        <view class="section-title">{{ $t('help.video_tutorial_title') }}</view>
        <view class="video-wrapper">
          <video
            id="tutorial-video"
            :src="videoUrl"
            controls
            autoplay
            loop
            class="tutorial-video"
            object-fit="contain"
            :direction="0"
            :enable-play-gesture="false"
          />
        </view>
      </view>

      <view class="bottom-padding"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const statusBarHeight = ref<number>(44);
const navContentHeight = ref<number>(44);

const videoUrl = APP_CONFIG.TUTORIAL_VIDEO_URL;

/**
 * 获取应用界面语言
 * @returns 'zh' 表示简体中文界面，'en' 表示其他语言界面
 */
function getAppLanguage(): 'zh' | 'en' {
  try {
    const appLocale = uni.getLocale() || 'en';
    
    // 只判断简体中文（zh-Hans 或 zh），其他所有语言（包括繁体中文）都返回英文
    if (appLocale === 'zh-Hans' || appLocale === 'zh') {
      return 'zh';
    }
    // 其他语言统一返回英文
    return 'en';
  } catch (error) {
    console.error('获取应用界面语言失败:', error);
    // 异常情况默认使用英文
    return 'en';
  }
}

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 44;

  // #ifdef MP-WEIXIN
  const capsule = uni.getMenuButtonBoundingClientRect();
  // 稳健的标题栏高度计算
  navContentHeight.value = (capsule.top - (systemInfo.statusBarHeight || 0)) * 2 + capsule.height;
  // #endif
});

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: '/pages/index/index' });
  }
}

/**
 * 打开使用说明书
 * 根据应用界面语言自动选择中文或英文说明书
 */
function openManual() {
  const lang = getAppLanguage();
  const url = lang === 'zh' ? APP_CONFIG.MANUAL_ZH_URL : APP_CONFIG.MANUAL_EN_URL;
  
  if (!url) {
    uni.showToast({ title: 'Config Error', icon: 'none' });
    return;
  }
  
  uni.showLoading({ title: $t('common.loading'), mask: true });
  
  uni.downloadFile({
    url: url,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail: (err) => {
            console.error('Open PDF Failed:', err);
            uni.showToast({ 
              title: $t('webview.cannotOpenPage'), 
              icon: 'none' 
            });
          }
        });
      } else {
        uni.showToast({ title: 'Download Status: ' + res.statusCode, icon: 'none' });
      }
    },
    fail: (err) => {
      console.error('Download PDF Failed:', err);
      uni.showToast({ title: 'Download Failed', icon: 'none' });
    },
    complete: () => uni.hideLoading()
  });
}
</script>

<style scoped>
.help-page {
  width: 100%;
  min-height: 100vh;
  background: #ffffff;
}

/* 导航栏样式：纯白背景 */
.custom-navbar {
  background: #ffffff;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  border-bottom: 1rpx solid #f8fafc;
}

.nav-content {
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.nav-left {
  width: 80rpx;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-button {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.back-button:active {
  opacity: 0.3;
}

.back-arrow {
  width: 20rpx;
  height: 20rpx;
  border-left: 4rpx solid #323233;
  border-bottom: 4rpx solid #323233;
  transform: rotate(45deg);
  margin-left: 4rpx;
}

.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-title {
  font-family: PingFang SC, -apple-system, blinkmacsystemfont, 'Helvetica Neue', helvetica, 'lucida grande', 'arial', verdana, 'microsoft yahei', sans-serif;
  font-weight: 500;
  font-size: 20px;
  line-height: 100%;
  text-align: center;
  color: #323233;
}

.nav-right {
  width: 80rpx;
}

.main-content {
  width: 100%;
  background: #ffffff;
}

.section {
  padding: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
}

/* 说明书卡片样式优化 */
.manual-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #f8fafc;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.manual-card:active {
  background: #f8fafc;
  transform: scale(0.98);
}

.card-left {
  display: flex;
  align-items: center;
}

.icon-box {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.zh-theme { background: #e0e7ff; }
.en-theme { background: #fef3c7; }

.pdf-icon {
  width: 48rpx;
  height: 48rpx;
}

.card-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.card-subtitle {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.card-arrow {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.3;
}

/* 视频美化 */
.video-wrapper {
  width: 100%;
  aspect-ratio: 9/16;
  background: #000;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.12);
  /* 强制硬件加速，有助于同层渲染 */
  transform: translateZ(0); 
}

.tutorial-video {
  width: 100%;
  height: 100%;
  border-radius: 24rpx; /* 在视频上直接应用圆角 */
}

.bottom-padding {
  height: calc(80rpx + env(safe-area-inset-bottom));
}
</style>
