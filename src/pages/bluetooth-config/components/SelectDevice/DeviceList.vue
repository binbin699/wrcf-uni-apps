<template>
  <view class="device-list">
    <!-- 加载状态 -->
    <view v-if="isLoading" class="empty">
      <view class="loading-icon"></view>
      <view class="loading-text">{{ $t('bluetooth.device_list.loading') }}</view>
    </view>

    <!-- 初始提示 -->
    <view v-else-if="deviceList === null" class="tips">
      <view class="tip">
        <view class="icon">1️⃣</view>
        <text>{{ $t('bluetooth.device_list.check_power') }}</text>
      </view>
      <view class="tip">
        <view class="icon">2️⃣</view>
        <text>{{ $t('bluetooth.device_list.tap_to_scan') }}</text>
      </view>
    </view>

    <!-- 无设备 -->
    <view v-else-if="deviceList.length === 0" class="empty">
      <view class="empty-icon">📱</view>
      <view class="empty-text">{{ $t('bluetooth.device_list.no_devices') }}</view>
      <view class="empty-desc">{{ $t('bluetooth.device_list.no_devices_desc') }}</view>
    </view>

    <!-- 设备列表 -->
    <view v-else class="device-container">
      <view class="tips">
        <view class="tip">
          <view class="icon">📱</view>
          <text>
            {{ $t('bluetooth.device_list.devices_found', { count: deviceList.length }) }}
          </text>
        </view>
        <view class="tip">
          <view class="icon">👇</view>
          <text>{{ $t('bluetooth.device_list.tap_to_select') }}</text>
        </view>
      </view>

      <view class="devices">
        <BluetoothItem
          v-for="device in deviceList"
          :key="device.deviceId"
          :deviceInfo="device"
          @tap="handleSelectDevice(device)" />
      </view>
    </view>
  </view>
</template>

<script>
import BluetoothItem from '../BluetoothItem/BluetoothItem.vue';

export default {
  name: 'DeviceList',
  components: {
    BluetoothItem
  },
  props: {
    isLoading: {
      type: Boolean,
      default: false
    },
    deviceList: {
      type: Array,
      default: null
    }
  },
  methods: {
    handleSelectDevice(device) {
      this.$emit('select', device);
    }
  }
};
</script>

<style lang="scss" scoped>
.device-list {
  min-height: 400rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  text-align: center;
}

.loading-icon {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e5e5e5;
  border-top: 4rpx solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
  color: #666;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 600;
}

.empty-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
}

.tips {
  background-color: #f8f9ff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  border-left: 6rpx solid #667eea;
}

.tip {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.tip text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.devices {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .empty {
    padding: 60rpx 24rpx;
  }

  .loading-icon {
    width: 50rpx;
    height: 50rpx;
  }

  .loading-text {
    font-size: 26rpx;
  }

  .empty-icon {
    font-size: 70rpx;
  }

  .empty-text {
    font-size: 30rpx;
  }

  .empty-desc {
    font-size: 26rpx;
  }

  .tips {
    padding: 20rpx;
    margin-bottom: 24rpx;
  }

  .tip text {
    font-size: 26rpx;
  }

  .devices {
    gap: 12rpx;
  }
}
</style>
