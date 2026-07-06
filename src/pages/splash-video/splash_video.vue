<!--<template>-->
<!--  <view class="splash-video-container">-->
<!--    &lt;!&ndash; #ifdef APP-PLUS &ndash;&gt;-->
<!--    &lt;!&ndash; 视频已注释，改为静态展示 &ndash;&gt;-->
<!--    &lt;!&ndash;-->
<!--    <video-->
<!--        id="splashVideo"-->
<!--        :src="videoSrc"-->
<!--        :autoplay="true"-->
<!--        :muted="true"-->
<!--        :show-center-play-btn="false"-->
<!--        :controls="false"-->
<!--        :enable-progress-gesture="false"-->
<!--        object-fit="cover"-->
<!--        class="splash-video"-->
<!--        @ended="onVideoEnded"-->
<!--        @loadedmetadata="onVideoLoaded"-->
<!--    />-->
<!--    &ndash;&gt;-->
<!--&lt;!&ndash;    &lt;!&ndash; 静态占位，显示品牌 Logo 或背景（可根据需要调整） &ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;    <view class="static-splash">&ndash;&gt;-->
<!--&lt;!&ndash;      <image src="/static/logo.png" mode="aspectFit" class="fallback-logo" />&ndash;&gt;-->
<!--&lt;!&ndash;    </view>&ndash;&gt;-->
<!--    &lt;!&ndash; #endif &ndash;&gt;-->

<!--    &lt;!&ndash; #ifndef APP-PLUS &ndash;&gt;-->
<!--    <view class="fallback-splash">-->
<!--      <image src="/static/logo.png" mode="aspectFit" class="fallback-logo" />-->
<!--    </view>-->
<!--    &lt;!&ndash; #endif &ndash;&gt;-->
<!--  </view>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, onMounted } from 'vue';-->
<!--import { onLoad } from '@dcloudio/uni-app';-->
<!--import { useUserStore } from '@/store';-->

<!--const userStore = useUserStore();-->

<!--onLoad(() => {-->
<!--  plus.navigator.closeSplashscreen();-->
<!--  // 预加载视频（已注释）-->
<!--  // preloadVideo();-->
<!--});-->

<!--defineOptions({-->
<!--  name: 'SplashVideo'-->
<!--});-->
<!--const VIDEO_SERVER_DOMAIN = 'https://wrcfmo.cn/';-->
<!--const VIDEO_STORAGE_PATH = '/static_in/video/';-->

<!--// 视频地址保留，但不再使用-->
<!--const videoSrc = ref(`${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}opening_animation.mp4`);-->
<!--const isNavigating = ref(false);-->

<!--// 预加载视频（已注释）-->
<!--/*-->
<!--function preloadVideo() {-->
<!--  // #ifdef APP-PLUS-->
<!--  const videoContext = uni.createVideoContext('splashVideo');-->
<!--  if (videoContext) {-->
<!--    videoContext.play();-->
<!--  }-->
<!--  // #endif-->
<!--}-->
<!--*/-->

<!--// 视频结束回调（不再触发，但保留）-->
<!--function onVideoEnded() {-->
<!--  console.log('[SplashVideo] 视频播放结束，准备跳转');-->
<!--  if (isNavigating.value) return;-->

<!--  // 强制延迟3秒，确保能看到页面-->
<!--  setTimeout(() => {-->
<!--    navigateToNext();-->
<!--  }, 200);-->
<!--}-->

<!--// 跳转逻辑（完全保持不变）-->
<!--function navigateToNext() {-->
<!--  if (isNavigating.value) return;-->
<!--  isNavigating.value = true;-->

<!--  console.log('[SplashVideo] 开始跳转，检查登录状态');-->

<!--  // 延迟一点确保过渡流畅-->
<!--  setTimeout(() => {-->
<!--    // 根据登录状态决定跳转目标-->
<!--    if (userStore.isLoggedIn && userStore.userId > 0) {-->
<!--      console.log('[SplashVideo] 用户已登录，跳转到设备页');-->
<!--      // 已登录：跳转到 TabBar 首页-->
<!--      uni.switchTab({-->
<!--        url: '/pages/device-status/device-status',-->
<!--        fail: (err) => {-->
<!--          console.error('[SplashVideo] switchTab 失败:', err);-->
<!--          // 降级方案：跳转到登录页-->
<!--          uni.reLaunch({-->
<!--            url: '/pages/login/login'-->
<!--          });-->
<!--        }-->
<!--      });-->
<!--    } else {-->
<!--      console.log('[SplashVideo] 用户未登录，跳转到登录页');-->
<!--      // 未登录：跳转到引导页-->
<!--      uni.redirectTo({-->
<!--        url: '/pages/login/login',-->
<!--        fail: (err) => {-->
<!--          console.error('[SplashVideo] redirectTo mp-landing 失败:', err);-->
<!--          // 降级方案：跳转到登录页-->
<!--          uni.redirectTo({-->
<!--            url: '/pages/login/login'-->
<!--          });-->
<!--        }-->
<!--      });-->
<!--    }-->
<!--  }, 300);-->
<!--}-->

<!--// 视频加载回调（已注释）-->
<!--/*-->
<!--function onVideoLoaded() {-->
<!--  console.log('[SplashVideo] 视频元数据加载完成，手动尝试播放');-->
<!--}-->
<!--*/-->

<!--// onMounted 中不再操作视频，改为定时触发跳转（模拟视频播放时长）-->
<!--onMounted(() => {-->
<!--  console.log('[SplashVideo] 组件已挂载，静态展示，2.5秒后自动跳转');-->
<!--  // 原视频播放逻辑已注释，改用定时器模拟-->
<!--  setTimeout(() => {-->
<!--    if (!isNavigating.value) {-->
<!--      // 直接调用跳转（等同于视频结束后的逻辑）-->
<!--      onVideoEnded(); // 复用原有结束处理，包含延迟-->
<!--    }-->
<!--  }, 2500); // 模拟视频播放时长-->
<!--});-->
<!--</script>-->

<!--<style lang="scss" scoped>-->
<!--.splash-video-container {-->
<!--  position: fixed;-->
<!--  top: 0;-->
<!--  left: 0;-->
<!--  right: 0;-->
<!--  bottom: 0;-->
<!--  background: #000000;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  z-index: 9999;-->
<!--}-->

<!--.splash-video {-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--}-->

<!--/* 新增静态占位样式（APP 环境使用） */-->
<!--.static-splash {-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background: linear-gradient(135deg, var(&#45;&#45;color-primary), var(&#45;&#45;color-primary-dark));-->
<!--}-->

<!--.fallback-splash {-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background: linear-gradient(135deg, var(&#45;&#45;color-primary), var(&#45;&#45;color-primary-dark));-->
<!--}-->

<!--.fallback-logo {-->
<!--  width: 200rpx;-->
<!--  height: 200rpx;-->
<!--}-->
<!--</style>-->