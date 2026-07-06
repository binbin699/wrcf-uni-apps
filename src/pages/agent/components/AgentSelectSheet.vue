<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    :close-on-click-modal="true"
    :safe-area-inset-bottom="false"
    :root-portal="true"
    :duration="0"
    :lazy-render="false"
    :lock-scroll="false"
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
        <view v-if="shouldRenderPicker" class="sheet-mask sheet-mask--top"></view>
        <!-- 底部渐变遮罩 -->
        <view v-if="shouldRenderPicker" class="sheet-mask sheet-mask--bottom"></view>

        <picker-view
          v-if="shouldRenderPicker"
          class="sheet-picker-view"
          :value="pickerValue"
          :immediate-change="true"
          indicator-style="height: 80rpx; background: transparent; border-top: none; border-bottom: none; border-width: 0; border-color: transparent;"
          indicator-class="sheet-picker-indicator"
          mask-style="background: transparent;"
          @change="handlePickerChange"
          @pickstart="handlePickStart"
          @pickend="handlePickEnd">
          <picker-view-column>
            <view
              v-for="(option, index) in options"
              :key="getOptionKey(option, index)"
              class="sheet-picker-item"
              :class="{ 'sheet-picker-item--disabled': !!option.disabled }">
              <text class="sheet-picker-item-text">
                {{ option.label }}
              </text>
            </view>
          </picker-view-column>
        </picker-view>
      </view>

      <button class="sheet-confirm-btn" hover-class="none" @click="handleConfirm">
        {{ confirmText }}
      </button>
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

// picker-view 需要数组格式的 value
const pickerValue = ref<number[]>([0]);
// 当前选中的索引
const currentIndex = ref<number>(0);
// 是否正在滚动
const isPicking = ref(false);
// picker 是否应该渲染（用于强制重新创建原生组件）
const shouldRenderPicker = ref(false);
// 弹窗关闭后的延迟销毁定时器
let closeRenderTimer: ReturnType<typeof setTimeout> | null = null;

function clearCloseRenderTimer() {
  if (closeRenderTimer !== null) {
    clearTimeout(closeRenderTimer);
    closeRenderTimer = null;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      clearCloseRenderTimer();
      // 弹窗打开时，重置状态并设置初始选中项
      isPicking.value = false;
      const index = props.selectedIndex ?? 0;
      currentIndex.value = index;
      pickerValue.value = [index];
      // 如果 picker 已经被销毁，需要在下一帧重新创建，确保 pickerValue 先生效
      if (!shouldRenderPicker.value) {
        nextTick(() => {
          shouldRenderPicker.value = true;
        });
      } else {
        // picker 尚未销毁（快速重复打开），先销毁再重建
        shouldRenderPicker.value = false;
        nextTick(() => {
          shouldRenderPicker.value = true;
        });
      }
    } else {
      // 弹窗关闭时，延迟销毁 picker 以确保下次打开时重新创建
      clearCloseRenderTimer();
      closeRenderTimer = setTimeout(() => {
        if (!props.visible) {
          shouldRenderPicker.value = false;
        }
        closeRenderTimer = null;
      }, 300);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearCloseRenderTimer();
});

// 动画完成后再次设置 pickerValue，确保原生组件正确初始化
function handleAfterEnter() {
  const index = props.selectedIndex ?? 0;
  // 使用 nextTick 确保 DOM 更新后再设置值
  nextTick(() => {
    // 通过先设置为不同的值再设置回来，强制 picker-view 更新
    const tempIndex = index === 0 && props.options.length > 1 ? 1 : 0;
    pickerValue.value = [tempIndex];
    nextTick(() => {
      pickerValue.value = [index];
      currentIndex.value = index;
    });
  });
}

watch(
  () => props.selectedIndex,
  (value) => {
    if (!props.visible && value !== null) {
      currentIndex.value = value;
      pickerValue.value = [value];
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

function handlePickerChange(e: { detail: { value: number[] } }) {
  const newIndex = e.detail.value[0] ?? 0;
  currentIndex.value = newIndex;
  pickerValue.value = [newIndex];
}

function handlePickStart() {
  isPicking.value = true;
}

function handlePickEnd() {
  isPicking.value = false;
}

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
  background: #ffffff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx 40rpx calc(72rpx + env(safe-area-inset-bottom));
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
  overflow: hidden;
}

.sheet-picker-view {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 3;
}

/* 选中项指示器 - 中间的灰色背景框 */
.sheet-indicator {
  position: absolute;
  left: 40rpx;
  right: 40rpx;
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
  left: -40rpx;
  right: -40rpx;
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
  padding: 0 16rpx;
  box-sizing: border-box;
}

.sheet-picker-item--disabled {
  opacity: 0.32;
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

.sheet-confirm-btn {
  width: 100%;
  height: 88rpx;
  margin-top: 50rpx;
  border: none;
  border-radius: 24rpx;
  background: var(--color-primary);
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

<style>
/* 通过 indicator-class 去除边框线 */
.sheet-picker-indicator,
.agent-select-sheet-popup .sheet-picker-indicator {
  border-top: none !important;
  border-bottom: none !important;
  border-width: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
}

.sheet-picker-indicator::before,
.sheet-picker-indicator::after,
.agent-select-sheet-popup .sheet-picker-indicator::before,
.agent-select-sheet-popup .sheet-picker-indicator::after {
  display: none !important;
  border: none !important;
  border-color: transparent !important;
  height: 0 !important;
  content: none !important;
}

/* 覆盖 uni-picker-view-indicator 原生边框 */
.agent-select-sheet-popup .uni-picker-view-indicator,
.agent-select-sheet-popup .sheet-picker-view .uni-picker-view-indicator {
  border-top: none !important;
  border-bottom: none !important;
  border-width: 0 !important;
  border-color: transparent !important;
}

.agent-select-sheet-popup .uni-picker-view-indicator::before,
.agent-select-sheet-popup .uni-picker-view-indicator::after {
  display: none !important;
  border: none !important;
  border-color: transparent !important;
  height: 0 !important;
  content: none !important;
}
</style>
