<template>
  <view class="custom-tabbar-wrapper">
    <view class="custom-tabbar" :style="{ paddingBottom: finalPaddingBottom }">
      <view class="tabbar-inner">
        <view
          v-for="(item, index) in tabList"
          :key="index"
          class="tabbar-item"
          :class="{ active: current === index }"
          @click="switchTab(index)">
          <view class="tabbar-icon-wrapper">
            <image
              class="tabbar-icon"
              :src="current === index ? item.selectedIconPath : item.iconPath"
              mode="aspectFit" />
          </view>
          <text class="tabbar-text">{{ item.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
const { t: $t } = useI18n();

const props = withDefaults(
  defineProps<{
    current?: number;
  }>(),
  {
    current: 0
  }
);

const emit = defineEmits<{
  (e: 'change', index: number): void;
}>();

// 获取安全区域底部高度并区分平台
const finalPaddingBottom = ref('0px');
onMounted(() => {
  const systemInfo = uni.getSystemInfoSync();
  const isAndroid = systemInfo.platform === 'android';
  const bottom = systemInfo.safeAreaInsets?.bottom || 0;

  if (isAndroid) {
    // 关键：安卓端如果返回很小（一般是0），强制给 54rpx 避开手势条；如果不为 0，在原有基础上补一点
    finalPaddingBottom.value = bottom < 5 ? '54rpx' : `calc(${bottom}px + 20rpx)`;
  } else {
    // iOS 端：如果 bottom 为很小（一般是0，旧版 iPhone），给一个基础高度；如果是全面屏，保持原样
    finalPaddingBottom.value = bottom < 5 ? '28rpx' : `${bottom}px`;
  }
});

// Tab 配置：设备(0) → 智能体(1) → 广场(2) → 我的(3)
const tabList = computed(() => [
  {
    pagePath: '/pages/device-status/device-status',
    iconPath: '/static/tab-device.png',
    selectedIconPath: '/static/tab-device-active.png',
    text: $t('tabbar.device')
  },
  {
    pagePath: '/pages/index/index',
    iconPath: '/static/tab-agent.png',
    selectedIconPath: '/static/tab-agent-active.png',
    text: $t('tabbar.agent')
  },
  {
    pagePath: '/pages/square/square',
    iconPath: '/static/tab-square.png',
    selectedIconPath: '/static/tab-square-active.png',
    text: $t('tabbar.square')
  },
  {
    pagePath: '/pages/profile/profile',
    iconPath: '/static/tab-profile.png',
    selectedIconPath: '/static/tab-profile-active.png',
    text: $t('tabbar.profile')
  }
]);

// 切换 tab - 直接跳转，新页面会使用正确的 current 值
function switchTab(index: number) {
  if (props.current === index) return;

  emit('change', index);

  const item = tabList.value[index];
  uni.switchTab({
    url: item.pagePath
  });
}
</script>

<style lang="scss" scoped>
.custom-tabbar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  pointer-events: none; /* 防止遮挡页面底部非点击区域 */
}

.custom-tabbar {
  pointer-events: auto;
  background: #ffffff;
  border-radius: 44rpx 44rpx 0 0;
  box-shadow: 0 -8rpx 48rpx rgba(0, 0, 0, 0.08);
  /* 移除这里的固定 calc，改由 JS 动态计算注入，防止 iOS 过高 */
}

.tabbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 104rpx;
}

.tabbar-item {
  flex: 1;
  min-width: 0; /* 允许 flex 子元素收缩 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: all 0.2s ease;
  position: relative;
  padding: 0 8rpx;

  &.active {
    .tabbar-text {
      color: #335cff;
      font-weight: 500;
    }
  }
}

.tabbar-icon-wrapper {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  margin: 6rpx 0 4rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabbar-icon {
  width: 48rpx;
  height: 48rpx;
  display: block;
}

.tabbar-text {
  font-size: 19rpx;
  color: #717784;
  line-height: 1.4;
  transition: color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 4rpx;
}
</style>
