<template>
  <view class="wifi-signal-container">
    <view
      v-for="(bar, index) in signalBars"
      :key="index"
      class="signal-bar"
      :class="{ active: index < strength }"
      :style="{ height: bar.height }"></view>
  </view>
</template>

<script>
export default {
  name: 'WifiSignal',
  props: {
    strength: {
      type: Number,
      required: true,
      validator: (value) => value >= 0 && value <= 4
    }
  },
  computed: {
    signalBars() {
      return [{ height: '25%' }, { height: '50%' }, { height: '75%' }, { height: '100%' }];
    }
  }
};
</script>

<style lang="scss" scoped>
.wifi-signal-container {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
  width: 48rpx;
  height: 32rpx;
}

.signal-bar {
  flex: 1;
  background-color: #e5e7eb;
  border-radius: 2rpx;
  transition: all 0.3s ease;

  &.active {
    background-color: var(--color-primary);
  }
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .wifi-signal-container {
    width: 44rpx;
    height: 28rpx;
    gap: 3rpx;
  }
}
</style>
