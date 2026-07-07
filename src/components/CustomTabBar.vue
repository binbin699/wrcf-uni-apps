<template>
  <view class="custom-tabbar-wrapper">
    <view class="custom-tabbar" :style="{ paddingBottom: finalPaddingBottom }">
      <view class="tabbar-inner">
        <view
            v-for="(item, index) in tabList"
            :key="index"
            class="tabbar-item"
            :class="{ active: currentTab === index }"
            @click="switchTab(index)">
          <view class="tabbar-icon-wrapper">
            <image
                class="tabbar-icon"
                :src="currentTab === index ? item.selectedIconPath : item.iconPath"
                mode="aspectFit" />
          </view>
          <text class="tabbar-text">{{ item.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
const { t: $t } = useI18n();

// 内部维护当前选中的索引
const currentTab = ref(0);

// 根据当前页面路径获取对应的 tab 索引
function getCurrentTabIndex(): number {
  const pages = getCurrentPages();
  if (pages.length === 0) return 0;

  const currentPage = pages[pages.length - 1];
  const path = '/' + currentPage.route;

  const index = tabList.value.findIndex(item => item.pagePath === path);
  return index !== -1 ? index : 0;
}

// 更新当前 tab
function updateCurrentTab() {
  currentTab.value = getCurrentTabIndex();
}

// Tab 配置
const tabList = computed(() => [
  {
    pagePath: '/pages/device-status/device-status',
    iconPath: '/static/tab-device.png',
    selectedIconPath: '/static/tab-device-active.png',
    text: $t('tabbar.device')
  },
  {
    pagePath: '/pages/profile/profile',
    iconPath: '/static/tab-profile.png',
    selectedIconPath: '/static/tab-profile-active.png',
    text: $t('tabbar.profile')
  }
]);

// 切换 tab
function switchTab(index: number) {
  if (currentTab.value === index) return;

  const item = tabList.value[index];
  uni.switchTab({
    url: item.pagePath,
    success: () => {
      // 跳转成功后立即更新高亮
      currentTab.value = index;
    },
    fail: (err) => {
      console.error('switchTab 失败:', err);
    }
  });
}

// 获取安全区域底部高度
const finalPaddingBottom = ref('0px');
onMounted(() => {
  const systemInfo = uni.getSystemInfoSync();
  const isAndroid = systemInfo.platform === 'android';
  const bottom = systemInfo.safeAreaInsets?.bottom || 0;

  if (isAndroid) {
    finalPaddingBottom.value = bottom < 5 ? '54rpx' : `calc(${bottom}px + 20rpx)`;
  } else {
    finalPaddingBottom.value = bottom < 5 ? '28rpx' : `${bottom}px`;
  }

  // 初始化当前 tab
  updateCurrentTab();
});

// 使用 uni-app 生命周期，在页面显示时更新
// 需要在每个使用该组件的页面中调用，或者使用全局方式
// 更简单的方式：监听路由变化
let observer: any = null;

// 方案：使用定时器监听页面栈变化（简单可靠）
let timer: any = null;
function startWatchPages() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const newIndex = getCurrentTabIndex();
    if (newIndex !== -1 && currentTab.value !== newIndex) {
      currentTab.value = newIndex;
    }
  }, 100);
}

onMounted(() => {
  // ... 上面的代码 ...

  // 启动监听
  startWatchPages();
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style lang="scss" scoped>
.custom-tabbar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  pointer-events: none;
}

.custom-tabbar {
  pointer-events: auto;
  background: #ffffff;
  box-shadow: 0 -8rpx 48rpx rgba(0, 0, 0, 0.08);
}

.tabbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 104rpx;
}

.tabbar-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: all 0.2s ease;
  position: relative;
  padding: 0 4rpx;

  &.active {
    .tabbar-text {
      color: var(--color-primary);
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
