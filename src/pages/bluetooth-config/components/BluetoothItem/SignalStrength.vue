<template>
  <view class="signal-strength-container">
    <view
      class="strength-bar"
      :style="{ width: percentage + '%', backgroundColor: signalColor }"></view>
    <view class="strength-cover">
      <view class="separator"></view>
      <view class="separator"></view>
      <view class="separator"></view>
    </view>
  </view>
</template>

<script>
import { getSignalColor } from '../../utils/bluetooth';

export default {
  name: 'SignalStrength',
  props: {
    strength: {
      type: Number,
      required: true,
      validator: (value) => value >= 0 && value <= 4
    }
  },
  computed: {
    percentage() {
      // 将0-4转换为0-100的范围
      return (this.strength / 4) * 100;
    },
    signalColor() {
      return getSignalColor(this.strength);
    }
  }
};
</script>

<style lang="scss" scoped>
.signal-strength-container {
  position: relative;
  width: 80rpx;
  height: 16rpx;
  background-color: #e5e5e5;
  border-radius: 8rpx;
  overflow: hidden;
}

.strength-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 8rpx;
  transition: all 0.3s ease;
}

.strength-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
  pointer-events: none;
}

.separator {
  width: 2rpx;
  height: 12rpx;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 1rpx;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .signal-strength-container {
    width: 70rpx;
    height: 14rpx;
  }

  .separator {
    width: 1.5rpx;
    height: 10rpx;
  }
}
</style>
