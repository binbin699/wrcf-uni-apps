<template>
  <view class="bluetooth-item" @click="handleTap">
    <view class="device-icon">📱</view>

    <view class="content">
      <view class="name">{{ deviceInfo.name || deviceInfo.deviceId }}</view>
      <!-- 优先显示 Wi-Fi MAC (macAddress)，与设备管理页面保持一致 -->
      <view class="device-id">MAC: {{ deviceInfo.macAddress || deviceInfo.deviceId }}</view>
      <view class="signal-strength">
        <text>{{ $t('bluetooth.select_device.signal_strength') }}</text>
        <SignalStrength :strength="normalizedSignalStrength" />
      </view>
    </view>

    <view class="select-icon">
      <!-- 选择 -->
      <image class="arrow-image" src="/static/icons/right-arrow.svg" mode="aspectFit"></image>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { normalizeSignalStrength } from '../../utils/bluetooth';
import SignalStrength from './SignalStrength.vue';

const { t: $t } = useI18n();

// Props
interface Props {
  deviceInfo: {
    name?: string;
    deviceId: string;
    macAddress?: string; // Wi-Fi MAC，优先显示
    RSSI: number;
  };
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  tap: [deviceInfo: Props['deviceInfo']];
}>();

// Computed
const normalizedSignalStrength = computed(() => {
  return normalizeSignalStrength(props.deviceInfo.RSSI);
});

// Methods
function handleTap() {
  emit('tap', props.deviceInfo);
}
</script>

<script lang="ts">
export default {
  name: 'BluetoothItem',
  components: {
    SignalStrength
  }
};
</script>

<style lang="scss" scoped>
.bluetooth-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 2rpx solid #f0f0f0;
  transition: all 0.3s ease;

  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }
}

.device-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-id {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signal-strength {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #666;
}

.signal-strength text {
  margin-right: 12rpx;
  flex-shrink: 0;
}

.select-icon {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 600;
  margin-left: 16rpx;
  flex-shrink: 0;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .bluetooth-item {
    padding: 20rpx;
  }

  .device-icon {
    font-size: 40rpx;
    margin-right: 20rpx;
  }

  .name {
    font-size: 30rpx;
  }

  .device-id {
    font-size: 22rpx;
  }

  .signal-strength {
    font-size: 22rpx;
  }

  .select-icon {
    font-size: 26rpx;
    margin-left: 12rpx;
  }
}
.arrow-image {
  width: 48rpx;
  height: 48rpx;
}
</style>
