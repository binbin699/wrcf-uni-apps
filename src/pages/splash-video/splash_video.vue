<template>
  <view class="splash-video-container">
    <!-- #ifdef APP-PLUS -->
    <video
        id="splashVideo"
        :src="videoSrc"
        :autoplay="true"
        :muted="true"
        :show-center-play-btn="false"
        :controls="false"
        :enable-progress-gesture="false"
        object-fit="cover"
        class="splash-video"
        @ended="onVideoEnded"
        @loadedmetadata="onVideoLoaded"
    />
    <!-- #endif -->

    <!-- #ifndef APP-PLUS -->
    <view class="fallback-splash">
      <image src="/static/logo.png" mode="aspectFit" class="fallback-logo" />
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/store';


const userStore = useUserStore();

onLoad(() => {
  plus.navigator.closeSplashscreen();
  // 预加载视频
  preloadVideo();
});

defineOptions({
  name: 'SplashVideo'
});
const VIDEO_SERVER_DOMAIN = 'https://wrcfmo.cn/';
const VIDEO_STORAGE_PATH = '/static_in/video/';

const videoSrc = ref(`${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}opening_animation.mp4`);
const isNavigating = ref(false);

function preloadVideo() {
  // #ifdef APP-PLUS
  const videoContext = uni.createVideoContext('splashVideo');
  if (videoContext) {
    videoContext.play();
  }
  // #endif
}

function onVideoEnded() {
  console.log('[SplashVideo] 视频播放结束，准备跳转');
  if (isNavigating.value) return;

  // 强制延迟3秒，确保能看到页面
  setTimeout(() => {
    navigateToNext();
  }, 200);
}

function navigateToNext() {
  if (isNavigating.value) return;
  isNavigating.value = true;

  console.log('[SplashVideo] 开始跳转，检查登录状态');

  // 延迟一点确保过渡流畅
  setTimeout(() => {
    // 根据登录状态决定跳转目标
    if (userStore.isLoggedIn && userStore.userId > 0) {
      console.log('[SplashVideo] 用户已登录，跳转到设备页');
      // 已登录：跳转到 TabBar 首页
      uni.switchTab({
        url: '/pages/device-status/device-status',
        fail: (err) => {
          console.error('[SplashVideo] switchTab 失败:', err);
          // 降级方案：跳转到登录页
          uni.reLaunch({
            url: '/pages/login/login'
          });
        }
      });
    } else {
      console.log('[SplashVideo] 用户未登录，跳转到登录页');
      // 未登录：跳转到引导页
      uni.redirectTo({
        url: '/pages/login/login',
        fail: (err) => {
          console.error('[SplashVideo] redirectTo mp-landing 失败:', err);
          // 降级方案：跳转到登录页
          uni.redirectTo({
            url: '/pages/login/login'
          });
        }
      });
    }
  }, 300);
}

function onVideoLoaded() {
  console.log('[SplashVideo] 视频元数据加载完成，手动尝试播放');
}

// 也可以简单地在 onMounted 中尝试
onMounted(() => {
  console.log('[SplashVideo] 组件已挂载，尝试播放');
  const videoContext = uni.createVideoContext('splashVideo');
  videoContext.play();
});

</script>

<style lang="scss" scoped>
.splash-video-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-video {
  width: 100%;
  height: 100%;
}

.fallback-splash {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
}

.fallback-logo {
  width: 200rpx;
  height: 200rpx;
}
</style>
