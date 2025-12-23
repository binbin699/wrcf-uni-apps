<template>
  <view class="webview-page">
    <view class="webview-header">
      <text class="back" @click="goBack">←</text>
      <text class="title">{{ $t('pages.webview') }}</text>
      <view style="width:40rpx"></view>
    </view>

    <view class="webview-container" v-if="src">
      <web-view :src="src" style="width:100%;height:100%" />
    </view>

    <view class="empty" v-else>
      <text>{{ $t('webview.cannotOpenPage') }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const src = ref('');

onLoad((options: any) => {
  const p = options.src || options.url || options.u || '';
  if (p) {
    try {
      src.value = decodeURIComponent(p);
    } catch (e) {
      src.value = p;
    }
  }
});

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.webview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.webview-header {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #8fd3f4 0%, #fbc2eb 100%);
}
.webview-header .title {
  font-size: 32rpx;
  font-weight: 600;
}
.webview-header .back {
  font-size: 36rpx;
}
.webview-container {
  flex: 1;
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
