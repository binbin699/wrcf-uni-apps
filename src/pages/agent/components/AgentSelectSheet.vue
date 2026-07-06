<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    :close-on-click-modal="true"
    :safe-area-inset-bottom="false"
    :root-portal="false"
    :duration="0"
    :lazy-render="false"
    :lock-scroll="true"
    custom-class="agent-select-sheet-popup"
    custom-style="background: transparent;"
    @close="handleClose"
    @update:model-value="handleVisibleChange">
    <view class="agent-select-sheet">
      <text class="sheet-title">{{ title }}</text>

      <view class="sheet-picker-wrapper">
        <!-- 选中项指示器背景 -->
        <view class="sheet-indicator"></view>
        <!-- 顶部渐变遮罩 -->
        <view v-if="shouldRenderScroller" class="sheet-mask sheet-mask--top"></view>
        <!-- 底部渐变遮罩 -->
        <view v-if="shouldRenderScroller" class="sheet-mask sheet-mask--bottom"></view>

        <scroll-view
          v-if="shouldRenderScroller"
          class="sheet-scroll-view"
          scroll-y
          :scroll-top="scrollTop"
          :scroll-with-animation="scrollWithAnimation"
          :show-scrollbar="false"
          @scroll="handleScroll"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
          @touchcancel="handleTouchEnd">
          <view class="sheet-scroll-padding"></view>
          <view
            v-for="(option, index) in options"
            :key="getOptionKey(option, index)"
            class="sheet-picker-item"
            :class="{
              'sheet-picker-item--active': currentIndex === index,
              'sheet-picker-item--disabled': !!option.disabled
            }"
            @click="handleItemClick(index)">
            <text class="sheet-picker-item-text">
              {{ option.label }}
            </text>
          </view>
          <view class="sheet-scroll-padding"></view>
        </scroll-view>
      </view>

      <view class="sheet-action-area" @touchmove.stop.prevent="noop">
        <button class="sheet-confirm-btn" hover-class="none" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

export type AgentSelectSheetOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

interface Props {
  visible: boolean;
  title: string;
  options: AgentSelectSheetOption[];
  selectedIndex: number | null;
  confirmText?: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '确定'
});

const emit = defineEmits<Emits>();

const ITEM_HEIGHT_RPX = 80;
const SCROLL_SETTLE_DELAY = 120;

// 当前选中的索引
const currentIndex = ref<number>(0);
// 是否正在滚动
const isPicking = ref(false);
// scroll-view 是否应该渲染（用于强制重新创建滚动容器）
const shouldRenderScroller = ref(false);
const scrollTop = ref(0);
const latestScrollTop = ref(0);
const scrollWithAnimation = ref(false);

let closeRenderTimer: ReturnType<typeof setTimeout> | null = null;
let scrollSettleTimer: ReturnType<typeof setTimeout> | null = null;

function clearCloseRenderTimer() {
  if (closeRenderTimer !== null) {
    clearTimeout(closeRenderTimer);
    closeRenderTimer = null;
  }
}

function clearScrollSettleTimer() {
  if (scrollSettleTimer !== null) {
    clearTimeout(scrollSettleTimer);
    scrollSettleTimer = null;
  }
}

function getItemHeightPx() {
  const systemInfo = uni.getSystemInfoSync();
  return (ITEM_HEIGHT_RPX * systemInfo.windowWidth) / 750;
}

function clampIndex(index: number) {
  const maxIndex = props.options.length - 1;
  if (maxIndex < 0) return 0;
  return Math.min(Math.max(index, 0), maxIndex);
}

function getIndexByScrollTop(value: number) {
  const itemHeight = getItemHeightPx();
  if (itemHeight <= 0) return 0;
  return clampIndex(Math.round(value / itemHeight));
}

function syncScrollToIndex(index: number, animated = false) {
  const selectedIndex = clampIndex(index);
  const targetScrollTop = selectedIndex * getItemHeightPx();
  currentIndex.value = selectedIndex;
  scrollWithAnimation.value = animated;

  if (animated && Math.abs(scrollTop.value - targetScrollTop) < 0.5) {
    scrollTop.value = latestScrollTop.value;
    nextTick(() => {
      scrollTop.value = targetScrollTop;
    });
    return;
  }

  scrollTop.value = targetScrollTop;
  latestScrollTop.value = targetScrollTop;
}

function resetScrollToIndex(index: number) {
  const selectedIndex = clampIndex(index);
  latestScrollTop.value = selectedIndex * getItemHeightPx();
  scrollWithAnimation.value = false;
  currentIndex.value = 0;
  scrollTop.value = 0;

  nextTick(() => {
    scrollTop.value = latestScrollTop.value;
  });
}

function settleScroll() {
  clearScrollSettleTimer();
  syncScrollToIndex(currentIndex.value, true);
  isPicking.value = false;
}

function scheduleScrollSettle(delay = SCROLL_SETTLE_DELAY) {
  clearScrollSettleTimer();
  scrollSettleTimer = setTimeout(() => {
    settleScroll();
  }, delay);
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      clearCloseRenderTimer();
      // 弹窗打开时，重置状态并设置初始选中项
      isPicking.value = false;
      const index = props.selectedIndex ?? 0;
      resetScrollToIndex(index);
      // 如果 scroll-view 已经被销毁，需要在下一帧重新创建，确保 scrollTop 先生效
      if (!shouldRenderScroller.value) {
        nextTick(() => {
          shouldRenderScroller.value = true;
          nextTick(() => {
            resetScrollToIndex(index);
          });
        });
      } else {
        // scroll-view 尚未销毁（快速重复打开），先销毁再重建
        shouldRenderScroller.value = false;
        nextTick(() => {
          shouldRenderScroller.value = true;
          nextTick(() => {
            resetScrollToIndex(index);
          });
        });
      }
    } else {
      // 弹窗关闭时，延迟销毁 scroll-view 以确保下次打开时重新创建
      clearCloseRenderTimer();
      clearScrollSettleTimer();
      closeRenderTimer = setTimeout(() => {
        if (!props.visible) {
          shouldRenderScroller.value = false;
        }
        closeRenderTimer = null;
      }, 300);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearCloseRenderTimer();
  clearScrollSettleTimer();
});

watch(
  () => props.selectedIndex,
  (value) => {
    if (!props.visible && value !== null) {
      syncScrollToIndex(value, false);
    }
  }
);

function getOptionKey(option: AgentSelectSheetOption, index: number) {
  return `${option.value}-${index}`;
}

function handleVisibleChange(value: boolean) {
  emit('update:visible', value);
}

function handleClose() {
  emit('update:visible', false);
}

function handleScroll(e: { detail: { scrollTop: number } }) {
  isPicking.value = true;
  const nextScrollTop = Number(e.detail.scrollTop || 0);
  latestScrollTop.value = nextScrollTop;
  currentIndex.value = getIndexByScrollTop(nextScrollTop);
  scheduleScrollSettle();
}

function handleTouchStart() {
  isPicking.value = true;
  clearScrollSettleTimer();
}

function handleTouchEnd() {
  scheduleScrollSettle(80);
}

function handleItemClick(index: number) {
  if (props.options[index]?.disabled) return;
  clearScrollSettleTimer();
  isPicking.value = false;
  syncScrollToIndex(index, true);
}

function noop() {}

function handleConfirm() {
  // 如果还在滚动中，等待滚动结束
  if (isPicking.value) {
    setTimeout(() => {
      handleConfirm();
    }, 50);
    return;
  }

  const option = props.options[currentIndex.value];
  if (!option || option.disabled) return;

  emit('confirm', currentIndex.value);
  emit('update:visible', false);
}
</script>

<style scoped>
.agent-select-sheet {
  position: relative;
  background: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx 40rpx 0;
  box-sizing: border-box;
}

.sheet-title {
  display: block;
  text-align: center;
  font-size: 36rpx;
  line-height: 52rpx;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 32rpx;
}

.sheet-picker-wrapper {
  position: relative;
  height: 368rpx;
  margin: 0 -40rpx;
  overflow: hidden;
}

.sheet-scroll-view {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 3;
}

.sheet-scroll-padding {
  height: 144rpx;
}

/* 选中项指示器 - 中间的灰色背景框 */
.sheet-indicator {
  position: absolute;
  left: 80rpx;
  right: 80rpx;
  top: 50%;
  transform: translateY(-50%);
  height: 80rpx;
  border-radius: 12rpx;
  background: #f3f3f3;
  pointer-events: none;
  z-index: 1;
}

/* 渐变遮罩 - 让远离中心的选项逐渐变淡 */
.sheet-mask {
  position: absolute;
  left: 0;
  right: 0;
  height: 160rpx;
  pointer-events: none;
  z-index: 4;
}

.sheet-mask--top {
  top: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
}

.sheet-mask--bottom {
  bottom: 0;
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
}

.sheet-picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 80rpx;
  box-sizing: border-box;
}

.sheet-picker-item--disabled {
  opacity: 0.32;
}

.sheet-picker-item--active .sheet-picker-item-text {
  color: rgba(0, 0, 0, 0.9);
}

.sheet-picker-item-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 32rpx;
  line-height: 48rpx;
  text-align: center;
  color: rgba(0, 0, 0, 0.9);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-action-area {
  margin: 50rpx -40rpx 0;
  padding: 0 40rpx calc(72rpx + env(safe-area-inset-bottom));
}

.sheet-confirm-btn {
  position: relative;
  z-index: 6;
  width: 100%;
  height: 88rpx;
  border: none;
  border-radius: 24rpx;
  background: #335cff;
  background: var(--color-primary, #335cff);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-confirm-btn::after {
  border: none;
}

.sheet-confirm-btn:active {
  opacity: 0.92;
}
</style>
