<template>
  <view class="page">
    <scroll-view class="scroll-content" scroll-y>
      <!-- 加载中状态 -->
      <view v-if="loading" class="loading-container">
        <view v-for="i in 6" :key="i" class="skeleton-card">
          <view class="skeleton-cover"></view>
          <view class="skeleton-title"></view>
        </view>
      </view>

      <!-- 内容区域 -->
      <view v-else class="video-grid">
        <view
            v-for="item in videoList"
            :key="item.id"
            class="video-card"
            @click="playVideo(item)"
        >
          <view class="cover-box">
            <image class="cover-img" :src="item.cover" mode="aspectFill" lazy-load />

            <view class="play-mask">
              <image class="play-icon" src="/static/icons/play-circle.svg" mode="aspectFit" />
            </view>
          </view>

          <view class="title-box">
            <text class="video-title">{{ item.title }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 视频播放弹窗 -->
    <view v-if="showVideoPlayer" class="video-player-modal" @click="closeVideoPlayer">
      <view class="video-player-content" @click.stop>
        <view class="video-player-header">
          <text class="video-player-title">{{ currentVideoTitle }}</text>
          <view class="video-player-close" @click="closeVideoPlayer">
            <text class="close-icon">×</text>
          </view>
        </view>
        <video
            class="video-player"
            :src="currentVideoUrl"
            controls
            autoplay
            object-fit="contain"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @ended="onVideoEnded"
            @error="onVideoError"
        ></video>
      </view>
    </view>
  </view>
</template>


<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

interface VideoItem {
  id: number;
  title: string;
  cover: string;
  videoUrl: string;
}

const statusBarHeight = ref(20);
const navBarHeight = ref(56);

const videoList = ref<VideoItem[]>([
  {
    id: 1,
    title: '使用说明',
    cover: '/static/strategy/explanation.png',
    videoUrl: '/static/video/1.mp4'
  },
  // {
  //   id: 2,
  //   title: 'AI英语陪练',
  //   cover: '/static/strategy/speaking_partner.png',
  //   videoUrl: ''
  // },
  // {
  //   id: 3,
  //   title: '视觉小学伴',
  //   cover: '/static/strategy/visual_primary.png',
  //   videoUrl: ''
  // },
  // {
  //   id: 4,
  //   title: 'AI讲故事',
  //   cover: '/static/strategy/storytelling.png',
  //   videoUrl: ''
  // },
  // {
  //   id: 5,
  //   title: '双语聊天',
  //   cover: '/static/strategy/bilingual_chat.png',
  //   videoUrl: ''
  // },
  // {
  //   id: 6,
  //   title: '绘本伴读',
  //   cover: '/static/strategy/picture_book.png',
  //   videoUrl: ''
  // }
]);

const showVideoPlayer = ref(false);
const currentVideoUrl = ref('');
const currentVideoTitle = ref('');
const loading = ref(true);

onLoad(() => {
  setNavHeight();
  // 模拟加载延迟，让骨架屏显示一下
  setTimeout(() => {
    loading.value = false;
  }, 300);
});


function setNavHeight() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 20;

  try {
    const menuButtonInfo =
        typeof uni.getMenuButtonBoundingClientRect === 'function'
            ? uni.getMenuButtonBoundingClientRect()
            : null;

    if (menuButtonInfo && menuButtonInfo.height) {
      const topGap = menuButtonInfo.top - statusBarHeight.value;
      navBarHeight.value = menuButtonInfo.height + Math.max(topGap, 0) * 2;
    } else {
      navBarHeight.value = systemInfo.platform === 'android' ? 56 : 52;
    }
  } catch (error) {
    navBarHeight.value = 56;
  }
}

function goBack() {
  const pages = getCurrentPages();

  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }

  uni.switchTab({
    url: '/pages/device-status/device-status'
  });
}

function playVideo(item: VideoItem) {
  console.log('播放视频:', item.title, item.videoUrl);

  if (!item.videoUrl) {
    uni.showToast({
      title: '视频暂未配置',
      icon: 'none'
    });
    return;
  }

  currentVideoUrl.value = item.videoUrl;
  currentVideoTitle.value = item.title;
  showVideoPlayer.value = true;
}

function closeVideoPlayer() {
  showVideoPlayer.value = false;
  currentVideoUrl.value = '';
  currentVideoTitle.value = '';
}

function onVideoPlay() {
  console.log('视频开始播放');
}

function onVideoPause() {
  console.log('视频暂停');
}

function onVideoEnded() {
  console.log('视频播放结束');
  closeVideoPlayer();
}

function onVideoError(e: any) {
  console.error('视频播放错误:', e);
  uni.showToast({
    title: '视频播放失败',
    icon: 'none'
  });
  closeVideoPlayer();
}
</script>

<style scoped lang="scss">
.page {
  width: 100%;
  min-height: 100vh;
  background: #eef3fb;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.custom-navbar {
  width: 100%;
  background: #eef3fb;
  flex-shrink: 0;
  box-sizing: border-box;
}

.status-bar {
  width: 100%;
}

.nav-content {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
}

.back-btn:active {
  opacity: 0.65;
}

.back-icon {
  width: 42rpx;
  height: 42rpx;
}

.nav-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #10b981;
  line-height: 1;
}

.scroll-content {
  flex: 1;
  height: 0;
  box-sizing: border-box;
}

.loading-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 24rpx;
  row-gap: 28rpx;
  padding: 28rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.skeleton-cover {
  width: 100%;
  height: 230rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card {
  overflow: hidden;
  border-radius: 20rpx;
  background: #ffffff;
}

.skeleton-title {
  height: 112rpx;
  margin: 0 16rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}


@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 24rpx;
  row-gap: 28rpx;
  padding: 28rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.video-card {
  overflow: hidden;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 26rpx rgba(28, 45, 78, 0.08);
}

.video-card:active {
  transform: scale(0.985);
}

.cover-box {
  position: relative;
  width: 100%;
  height: 230rpx;
  overflow: hidden;
  background: #dff3ff;
}

.cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

.play-mask {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 92rpx;
  height: 92rpx;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  width: 64rpx;
  height: 64rpx;
}

.title-box {
  height: 112rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.video-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.25;
  text-align: center;
}

/* 视频播放弹窗样式 */
.video-player-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.video-player-content {
  width: 100%;
  max-width: 700rpx;
  background: #000000;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.5);
}

.video-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(0, 0, 0, 0.9);
}

.video-player-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-player-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 20rpx;
  flex-shrink: 0;
}

.close-icon {
  font-size: 48rpx;
  color: #ffffff;
  line-height: 1;
}

.video-player {
  width: 100%;
  height: 400rpx;
  display: block;
}
</style>
