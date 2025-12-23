<template>
  <view class="step-progress">
    <view class="progress-container">
      <view
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-item"
        :class="{
          active: currentStepIndex >= index,
          current: currentStepIndex === index,
          completed: currentStepIndex > index
        }">
        <!-- 步骤圆点 -->
        <view class="step-dot">
          <view v-if="currentStepIndex > index" class="dot-check">
            <text class="check-icon">✓</text>
          </view>
          <view v-else class="dot-number">{{ index + 1 }}</view>
        </view>

        <!-- 步骤标题 -->
        <text class="step-title">{{ step.title }}</text>

        <!-- 连接线（除最后一个步骤） -->
        <view v-if="index < steps.length - 1" class="step-line" :class="{ active: currentStepIndex > index }"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps<{
  currentStep: string;
}>();

// 三段式步骤定义
const steps = computed(() => [
  {
    key: 'select-device',
    title: $t('bluetooth.step.select_device')
  },
  {
    key: 'wifi-config',
    title: $t('bluetooth.step.wifi_config')
  },
  {
    key: 'connecting',
    title: $t('bluetooth.step.connecting')
  }
]);

// 映射当前步骤到三段式索引
const currentStepIndex = computed(() => {
  switch (props.currentStep) {
    case 'select-device':
      return 0;
    case 'select-wifi':
    case 'input-pwd':
      return 1;
    case 'submit-config':
      return 2;
    default:
      return 0;
  }
});
</script>

<style lang="scss" scoped>
.step-progress {
  padding: 32rpx;
  background-color: #fff;
}

.progress-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
  transition: all 0.3s ease;
  margin-bottom: 12rpx;
}

.step-item.active .step-dot {
  background-color: #3b82f6;
}

.step-item.current .step-dot {
  background-color: #3b82f6;
  box-shadow: 0 0 0 6rpx rgba(59, 130, 246, 0.2);
}

.step-item.completed .step-dot {
  background-color: #10b981;
}

.dot-number {
  font-size: 28rpx;
  font-weight: 600;
  color: #9ca3af;
}

.step-item.active .dot-number {
  color: #fff;
}

.dot-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
}

.step-title {
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.step-item.active .step-title {
  color: #3b82f6;
  font-weight: 500;
}

.step-item.current .step-title {
  color: #3b82f6;
  font-weight: 600;
}

.step-item.completed .step-title {
  color: #10b981;
}

.step-line {
  position: absolute;
  top: 28rpx;
  left: calc(50% + 32rpx);
  right: calc(-50% + 32rpx);
  height: 4rpx;
  background-color: #e5e7eb;
  z-index: -1;
  transition: background-color 0.3s ease;
}

.step-line.active {
  background-color: #10b981;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .step-progress {
    padding: 24rpx 16rpx;
  }

  .step-dot {
    width: 48rpx;
    height: 48rpx;
  }

  .dot-number,
  .check-icon {
    font-size: 24rpx;
  }

  .step-title {
    font-size: 22rpx;
  }

  .step-line {
    top: 24rpx;
    left: calc(50% + 28rpx);
    right: calc(-50% + 28rpx);
  }
}
</style>
