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
        <view class="nav-right"></view>
        <!-- 占位平衡 -->
      </view>
    </view>

    <!-- 2. 主内容区域 -->
    <view class="main-content" :style="{ paddingTop: statusBarHeight + navContentHeight + 'px' }">
      <!-- 加载中骨架 -->
      <view v-if="isLoading" class="loading-placeholder">
        <view class="skeleton-block skeleton-card" />
        <view class="skeleton-block skeleton-video" />
      </view>

      <template v-else>
        <!-- 说明书部分：后台未配置时隐藏 -->
        <view v-if="manualUrl" class="section manual-section">
          <view class="section-title">{{ $t('help.manual_title') }}</view>

          <view class="manual-card" @click="openManual">
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

        <!-- 视频部分：后台未配置时隐藏 -->
        <view v-if="videoUrl" class="section video-section">
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
              :enable-play-gesture="false" />
          </view>
        </view>
      </template>

      <view class="bottom-padding"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { tutorialApi } from '@/api/tutorial';

const { t: $t } = useI18n();

const statusBarHeight = ref<number>(44);
const navContentHeight = ref<number>(44);
const videoUrl = ref<string>('');
const manualUrl = ref<string>('');
const isLoading = ref<boolean>(false);

function normalizeLocaleCandidates(): string[] {
  const locale = (uni.getLocale() || 'en').toLowerCase();
  const candidates = [locale];

  if (locale.includes('-')) {
    candidates.push(locale.split('-')[0]);
  }

  if (locale === 'zh' || locale === 'zh-hans' || locale === 'zh-cn') {
    candidates.unshift('zh-Hans');
  }

  if (locale === 'zh-hant' || locale === 'zh-tw' || locale === 'zh-hk') {
    candidates.unshift('zh-Hant');
  }

  candidates.push('en', 'zh-Hans');
  return Array.from(new Set(candidates));
}

function resolveLocalizedContent(source: Record<string, string>): string {
  const candidates = normalizeLocaleCandidates();

  for (const candidate of candidates) {
    const value = source[candidate];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

/**
 * 将 uni.getLocale() 返回值转换为后端期望的语言码格式（如 zh_CN、en_US）
 */
function getLanguageCode(): string {
  try {
    const locale = (uni.getLocale() || 'en').toLowerCase();
    if (locale === 'zh-hans' || locale === 'zh') return 'zh_CN';
    if (locale === 'zh-hant') return 'zh_TW';
    if (locale.startsWith('ja')) return 'ja_JP';
    if (locale.startsWith('kk')) return 'kk_KZ';
    if (locale.startsWith('ko')) return 'ko_KR';
    if (locale.startsWith('ru')) return 'ru_RU';
    if (locale.startsWith('ar')) return 'ar_SA';
    if (locale.startsWith('th')) return 'th_TH';
    if (locale.startsWith('es')) return 'es_ES';
    if (locale.startsWith('fr')) return 'fr_FR';
    if (locale.startsWith('en')) return 'en_US';
    const parts = locale.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}_${parts[1].toUpperCase()}`;
    }
    return locale;
  } catch (error) {
    console.error('[help/getLanguageCode] 获取语言码失败:', error);
    return 'en_US';
  }
}

async function loadTutorialResource() {
  isLoading.value = true;
  try {
    const configManualUrl = resolveLocalizedContent(APP_CONFIG.MANUALS);
    manualUrl.value = configManualUrl;

    const languageCode = getLanguageCode();
	console.log('languageCode: ', languageCode)
    const res = await tutorialApi.getTutorialResource(languageCode);
    videoUrl.value = res.data.tutorialVideoUrl ?? '';
    manualUrl.value = res.data.manualUrl || configManualUrl || '';
    manualUrl.value = res.data.manualUrl ?? '';

  } catch (error: unknown) {
    console.error('[help/loadTutorialResource] 获取教程资源失败:', error);
  } finally {
    isLoading.value = false;
  }
}

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 44;

  // #ifdef MP-WEIXIN
  const capsule = uni.getMenuButtonBoundingClientRect();
  navContentHeight.value = (capsule.top - (systemInfo.statusBarHeight || 0)) * 2 + capsule.height;
  // #endif

  loadTutorialResource();
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
 * 打开说明书（下载 PDF 后用系统文档查看器打开）
 */
function openManual() {
  if (!manualUrl.value) {
    uni.showToast({ title: $t('common.error'), icon: 'none' });
    return;
  }

  uni.downloadFile({
    url: manualUrl.value,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail: (err) => {
            console.error('[help/openManual] 打开文档失败:', err);
            uni.showToast({ title: $t('webview.cannotOpenPage'), icon: 'none' });
          }
        });
      } else {
        uni.showToast({ title: 'Download Status: ' + res.statusCode, icon: 'none' });
      }
    },
    fail: (err) => {
      console.error('[help/openManual] 下载失败:', err);
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

.zh-theme {
  background: #e0e7ff;
}
.en-theme {
  background: #fef3c7;
}

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

.loading-placeholder {
  padding: 32rpx;
}

.skeleton-block {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s infinite;
  border-radius: 24rpx;
}

.skeleton-card {
  height: 128rpx;
  margin-bottom: 48rpx;
}

.skeleton-video {
  width: 100%;
  aspect-ratio: 9/16;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
