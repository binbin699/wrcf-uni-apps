<template>
  <view class="select-wifi">
    <!-- 步骤标题 -->
    <view class="step-title">{{ $t('bluetooth.select_wifi.step_title') }}</view>

    <!-- WiFi列表 -->
    <view class="wifi-container">
      <!-- 加载状态 -->
      <view v-if="isLoadingWifi" class="loading-state">
        <view class="loading-icon"></view>
        <view class="loading-text">{{ $t('bluetooth.select_wifi.loading') }}</view>
      </view>

      <!-- WiFi列表 -->
      <view v-else-if="wifiList.length > 0" class="wifi-list">
        <view class="tips">
          <view class="tip">
            <view class="icon">📶</view>
            <text>
              {{ $t('bluetooth.select_wifi.devices_found', { count: wifiList.length }) }}
            </text>
          </view>
          <view class="tip">
            <view class="icon">👇</view>
            <text>{{ $t('bluetooth.select_wifi.choose_prompt') }}</text>
          </view>
        </view>

        <view class="wifi-items">
          <view
            v-for="wifi in wifiList"
            :key="wifi.SSID"
            class="wifi-item"
            :class="{
              selected: selectedWifi && selectedWifi.SSID === wifi.SSID
            }"
            @click="handleSelectWifi(wifi)">
            <view class="wifi-icon">📶</view>
            <view class="wifi-info">
              <view class="wifi-name">{{ wifi.SSID }}</view>
              <view class="wifi-security">
                {{
                  wifi.secure
                    ? `🔒 ${$t('net_config.secure_network')}`
                    : `🔓 ${$t('net_config.open_network')}`
                }}
              </view>
            </view>
            <view class="wifi-signal">
              <WifiSignal :strength="wifi.signalStrength" />
            </view>
          </view>
        </view>
      </view>

      <!-- 无WiFi -->
      <view v-else class="empty-state">
        <view class="empty-icon">📶</view>
        <view class="empty-text">{{ $t('bluetooth.select_wifi.no_networks') }}</view>
        <view class="empty-desc">{{ $t('bluetooth.select_wifi.no_networks_hint') }}</view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view v-if="!isLoadingWifi" class="action-btn secondary" @click="startWifiScan">
        🔍
        {{
          wifiList.length > 0
            ? $t('bluetooth.select_wifi.scan_again')
            : $t('bluetooth.select_wifi.start_scan')
        }}
      </view>

      <view v-if="selectedWifi" class="action-btn primary" @click="confirmWifiSelection">
        {{ $t('bluetooth.select_wifi.confirm') }} →
      </view>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import { deviceApi } from '@/api/index';
import WifiSignal from './WifiSignal.vue';

export default {
  name: 'SelectWifi',
  components: {
    WifiSignal
  },
  data() {
    return {
      isLoadingWifi: false,
      wifiList: [],
      selectedWifi: null,
      devices: []
    };
  },
  async mounted() {
    console.log('SelectWifi 组件加载');

    // 先设置加载状态为true，显示正在扫描
    this.isLoadingWifi = true;

    // 获取已选择的WiFi
    const state = bluetoothConfigManager.getState();
    this.selectedWifi = state.selectedWifi;

    // 获取当前连接的蓝牙设备
    const selectedDevice = state.selectedDevice;
    if (!selectedDevice || !selectedDevice.deviceId) {
      this.isLoadingWifi = false;
      uni.showToast({
        title: this.$t('bluetooth.select_wifi.not_connected_device'),
        icon: 'error',
        duration: 2000
      });
      return;
    }

    // 初始化配网协议并设置蓝牙监听
    try {
      await configProtocol.init(selectedDevice.deviceId);

      // 自动开始WiFi扫描，无需用户点击
      this.startWifiScan();
    } catch (error) {
      console.error('初始化配网协议失败:', error);
      this.isLoadingWifi = false;
      uni.showToast({
        title: this.$t('bluetooth.select_wifi.init_failed'),
        icon: 'none',
        duration: 2000
      });
    }
  },
  methods: {
    /**
     * 开始WiFi扫描
     */
    async startWifiScan() {
      this.isLoadingWifi = true;
      this.wifiList = [];

      try {
        console.log('开始扫描WiFi网络');

        // 获取当前连接的蓝牙设备
        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;

        if (!selectedDevice || !selectedDevice.deviceId) {
          throw new Error('未找到已连接的蓝牙设备');
        }

        // 通过蓝牙设备获取WiFi列表
        const wifiList = await configProtocol.getWifiList(selectedDevice.deviceId);

        // 转换信号强度格式以适配组件显示
        this.wifiList = wifiList.map((wifi) => ({
          ...wifi,
          // 将0-100的信号强度转换为0-4的显示级别
          signalStrength: Math.floor((wifi.signalStrength / 100) * 4)
        }));

        console.log('WiFi扫描完成:', this.wifiList);

        if (this.wifiList.length === 0) {
          uni.showToast({
            title: this.$t('bluetooth.select_wifi.no_networks'),
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('WiFi扫描失败:', error);
        uni.showToast({
          title: this.$t('bluetooth.select_wifi.scan_failed'),
          icon: 'none',
          duration: 3000
        });
      } finally {
        this.isLoadingWifi = false;
      }
    },

    /**
     * 处理WiFi选择
     * @param {Object} wifi - 选择的WiFi网络
     */
    handleSelectWifi(wifi) {
      console.log('选择WiFi:', wifi);

      // 设置当前选中的WiFi
      this.selectedWifi = wifi;
    },

    /**
     * 确认WiFi选择
     */
    confirmWifiSelection() {
      if (!this.selectedWifi) {
        uni.showToast({
          title: this.$t('bluetooth.select_wifi.select_prompt'),
          icon: 'none',
          duration: 2000
        });
        return;
      }

      console.log('确认选择WiFi:', this.selectedWifi);

      // 保存选择的WiFi到状态管理
      bluetoothConfigManager.setSelectedWifi(this.selectedWifi);

      // 跳转到下一步（输入密码）
      bluetoothConfigManager.nextStep();
    }
  }
};
</script>

<style lang="scss" scoped>
.select-wifi {
  padding: 32rpx;
}

.step-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 32rpx;
  text-align: center;
}

.wifi-container {
  margin-bottom: 48rpx;
  min-height: 400rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
}

.loading-icon {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e5e5e5;
  border-top: 4rpx solid var(--color-primary);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  text-align: center;
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
  background-color: var(--color-primary-tips-bg);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  border-left: 6rpx solid var(--color-primary);
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

.wifi-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.wifi-item {
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
  }

  &.selected {
    border-color: var(--color-primary);
    background-color: var(--color-primary-tips-bg);
  }
}

.wifi-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.wifi-info {
  flex: 1;
  min-width: 0;
}

.wifi-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wifi-security {
  font-size: 24rpx;
  color: #666;
}

.wifi-signal {
  margin-left: 16rpx;
  flex-shrink: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-btn {
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;

  &:active {
    transform: translateY(2rpx);
  }
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx var(--color-primary-alpha-25);

  &:active {
    box-shadow: 0 4rpx 12rpx var(--color-primary-alpha-25);
  }
}

.action-btn.secondary {
  background-color: #f5f5f5;
  color: #666;
  border: 2rpx solid #e5e5e5;

  &:active {
    background-color: #e8e8e8;
  }
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .select-wifi {
    padding: 24rpx;
  }

  .step-title {
    font-size: 30rpx;
    margin-bottom: 24rpx;
  }

  .wifi-container {
    margin-bottom: 36rpx;
  }

  .loading-state,
  .empty-state {
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

  .wifi-items {
    gap: 12rpx;
  }

  .wifi-item {
    padding: 20rpx;
  }

  .wifi-icon {
    font-size: 40rpx;
    margin-right: 20rpx;
  }

  .wifi-name {
    font-size: 30rpx;
  }

  .wifi-security {
    font-size: 22rpx;
  }

  .wifi-signal {
    margin-left: 12rpx;
  }

  .action-btn {
    padding: 20rpx 40rpx;
    font-size: 30rpx;
  }
}
</style>
