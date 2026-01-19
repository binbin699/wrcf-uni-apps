<template>
  <wd-notify />
  <view class="select-device">
    <!-- 初始/扫描中/无设备 状态 -->
    <view v-if="deviceList === null || deviceList.length === 0" class="empty-container">
      <view class="empty-content">
        <image
          v-if="deviceList === null && !isLoadingDevices"
          class="empty-image"
          src="/static/icons/bluetooth-scan.svg"
          mode="aspectFit" />
        <image
          v-else-if="isLoadingDevices"
          class="empty-image"
          src="/static/icons/bluetooth-scan.svg"
          mode="aspectFit" />
        <image
          v-else
          class="empty-image"
          src="/static/icons/no-device.svg"
          mode="aspectFit" />
        <text class="empty-text">
          {{ getEmptyText() }}
        </text>
        <text v-if="!isLoadingDevices && deviceList !== null && deviceList.length === 0" class="empty-hint">
          {{ $t('bluetooth.device_list.check_power') }}
        </text>
      </view>
    </view>

    <!-- 设备列表 -->
    <view v-else class="device-list-container">
      <scroll-view scroll-y class="device-scroll-list">
        <view
          v-for="device in deviceList"
          :key="device.deviceId"
          class="device-card"
          @click="handleSelectDevice(device)">
          <view class="device-icon">
            <image class="icon-img" src="/static/icons/phone.svg" mode="aspectFit" />
          </view>
          <view class="device-info">
            <view class="device-name">{{ device.name || 'DTXZ_' + (device.macAddress || device.deviceId).slice(-8) }}</view>
            <view class="device-id">ID：{{ device.macAddress || device.deviceId }}</view>
            <view class="device-signal">
              <text class="signal-label">{{ $t('bluetooth.device_list.signal_strength') }}：</text>
              <view class="signal-progress">
                <view class="signal-progress-bg"></view>
                <view class="signal-progress-fill" :style="{ width: getSignalWidth(device.RSSI) }"></view>
                <view class="signal-divider" style="left: 20rpx;"></view>
                <view class="signal-divider" style="left: 44rpx;"></view>
              </view>
            </view>
          </view>
          <view class="device-arrow">
            <wd-icon name="arrow-right" size="36rpx" color="#9ca3af" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <button
        class="scan-btn"
        :class="{ loading: isLoadingDevices }"
        :loading="isLoadingDevices"
        :disabled="isLoadingDevices"
        @click="startDeviceScan">
        <text>{{ getButtonText() }}</text>
      </button>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { deviceApi } from '@/api/index';
import {
  initBluetooth,
  resetBluetooth,
  searchBluetoothDevices,
  dedupeDeviceList,
  filterValidDevices,
  normalizeDeviceList,
  connectBluetoothDevice
} from '../../utils/bluetooth';
import { requestBluetoothPermissionWrapper } from '@/utils/permission';

export default {
  name: 'SelectDevice',
  inject: ['notify'],
  data() {
    return {
      deviceList: null,
      isLoadingDevices: false,
      isFirstScan: true,
      errorMessage: null,
      _devices: [],
      _showNotify: null,
      _closeNotify: null
    };
  },
  computed: {
    isIOS() {
      return bluetoothConfigManager.state.isIOS;
    }
  },
  mounted() {
    console.log('SelectDevice 组件加载');

    // 从父组件注入的 notify 获取函数
    if (this.notify) {
      console.log('notify:', this.notify);
      this._showNotify = this.notify.show;
      this._closeNotify = this.notify.close;
    }

    // 加载用户已绑定设备列表
    this.loadUserDevices();

    // 检测设备类型
    const systemInfo = uni.getSystemInfoSync();
    const isIOS = systemInfo.platform === 'ios';
    bluetoothConfigManager.setIsIOS(isIOS);

    console.log('设备类型:', isIOS ? 'iOS' : 'Android');
  },
  methods: {
    /**
     * 获取空状态文本
     */
    getEmptyText() {
      if (this.isLoadingDevices) {
        return this.$t('bluetooth.select_device.scanning_placeholder');
      }
      if (this.deviceList === null) {
        return this.$t('bluetooth.select_device.empty_placeholder');
      }
      return this.$t('bluetooth.select_device.no_devices');
    },

    /**
     * 根据 RSSI 获取信号强度等级 (1-3)
     */
    getSignalLevel(rssi) {
      if (!rssi) return 2;
      // RSSI 通常是负数，越接近0信号越强
      // -50 到 0: 强信号 (3格)
      // -70 到 -50: 中等信号 (2格)
      // 低于 -70: 弱信号 (1格)
      if (rssi >= -50) return 3;
      if (rssi >= -70) return 2;
      return 1;
    },

    /**
     * 根据 RSSI 获取进度条宽度
     */
    getSignalWidth(rssi) {
      const level = this.getSignalLevel(rssi);
      // 1级: 约 33%
      // 2级: 约 66%
      // 3级: 100% (满)
      if (level === 3) return '100%';
      if (level === 2) return '66%';
      return '33%';
    },

    /**
     * 开始设备扫描
     */
    async startDeviceScan() {
      this.deviceList = null;
      this.isLoadingDevices = true;
      // 重置连接状态
      this.isConnecting = false;
      this.isConnected = false;
      this.connectionError = null;
      this.selectedDevice = null;

      try {
        // 请求蓝牙权限
        const permissionResult = await requestBluetoothPermissionWrapper({
          show: this._showNotify,
          close: this._closeNotify
        });
        if (!permissionResult.granted) {
          this.isLoadingDevices = false;
          // 权限请求工具已经显示了相应的提示
          return;
        }

        if (this.isFirstScan) {
          // 首次扫描只需初始化
          await initBluetooth();
          this.isFirstScan = false;
        } else {
          // 后续扫描需要重置蓝牙模块
          await resetBluetooth();
        }

        // 搜索设备
        const devices = await searchBluetoothDevices();
        console.log('蓝牙-搜索到的原始设备:', devices);

        // 过滤有效设备
        const validDevices = filterValidDevices(devices, this.isIOS);
        console.log('蓝牙-过滤后的有效设备:', validDevices);

        // 去重处理
        const dedupeDevices = dedupeDeviceList(validDevices);
        console.log('蓝牙-去重后的设备:', dedupeDevices);

        // 对设备列表规范化MAC地址（传入 isIOS 参数）
        const [normalizedDevices, invalidDevices] = normalizeDeviceList(dedupeDevices, this.isIOS);
        console.log('蓝牙-规范化后的设备:', normalizedDevices);
        console.log('蓝牙-无法规范化的设备:', invalidDevices);
        this.deviceList = normalizedDevices;

        if (normalizedDevices.length === 0) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.no_devices'),
            icon: 'none',
            duration: 3000
          });
        }
      } catch (error) {
        console.error('扫描设备失败:', error);
        if (`${error}`.includes('请开启手机蓝牙后重试')) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.bluetooth_disabled'),
            icon: 'none',
            duration: 2000
          });
        } else {
          uni.showToast({
            title: this.$t('bluetooth.select_device.list_failed'),
            icon: 'none',
            duration: 2000
          });
        }
        this.deviceList = [];
      } finally {
        this.isLoadingDevices = false;
      }
    },

    /**
     * 处理设备选择
     * @param {Object} device - 选中的设备
     */
    handleSelectDevice(device) {
      console.log('选择设备:', device);

      // 获取当前状态
      const state = bluetoothConfigManager.getState();

      // 检查当前设备是否已绑定（仅在非 configOnly 模式下检查）
      if (!state.configOnly) {
        const selectedDevice = device;
        if (selectedDevice && selectedDevice.deviceId) {
          const isDeviceBound = this._devices.some(
            (_device) =>
              _device.macAddress &&
              _device.macAddress.toLowerCase() === selectedDevice.deviceId.toLowerCase()
          );

          if (isDeviceBound) {
            uni.showToast({
              title: this.$t('bluetooth.select_device.device_bound'),
              icon: 'none',
              duration: 2000
            });
            return;
          }
        }
      }
      // 保存选中的设备
      bluetoothConfigManager.setSelectedDevice(device);

      // 直接开始连接设备
      this.startConnection(device);
    },

    /**
     * 获取按钮文本
     */
    getButtonText() {
      if (this.isLoadingDevices) {
        return this.$t('bluetooth.select_device.scan_button_loading');
      }
      if (this.deviceList === null) {
        return this.$t('bluetooth.select_device.scan_button_start');
      }
      return this.$t('bluetooth.select_device.scan_button_retry');
    },

    /**
     * 开始连接设备
     * @param {Object} device - 要连接的设备
     */
    async startConnection(device) {
      if (!device) {
        console.error('没有选中的设备');
        return;
      }

      // 显示加载提示
      uni.showLoading({
        title: this.$t('bluetooth.select_device.connecting'),
        mask: true
      });

      try {
        console.log('开始连接设备:', device.deviceId);

        // 连接蓝牙设备
        await connectBluetoothDevice(device.deviceId);

        console.log('设备连接成功');

        // 更新设备连接状态
        bluetoothConfigManager.setSelectedDevice({
          ...device,
          connected: true
        });

        // 隐藏加载提示
        uni.hideLoading();

        // 显示连接成功提示
        uni.showToast({
          title: this.$t('bluetooth.select_device.connection_success'),
          icon: 'success',
          duration: 1000
        });

        bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
      } catch (error) {
        // 隐藏加载提示
        uni.hideLoading();

        if (error.errMsg.includes('already connect')) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.connection_success'),
            icon: 'success',
            duration: 1000
          });
          bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);

          return;
        }

        console.error('连接设备失败:', error);

        // 显示错误提示
        uni.showToast({
          title:
            error.errMsg || error.message || this.$t('bluetooth.select_device.connection_failed'),
          icon: 'none',
          duration: 2000
        });
      }
    },
    /**
     * 获取用户设备列表
     */
    async loadUserDevices() {
      try {
        const response = await deviceApi.getList();
        if (response && response.data) {
          this._devices = response.data;
          console.log('获取设备列表成功:', this._devices);
        }
      } catch (error) {
        console.log('获取设备列表失败:', error);
        // 获取失败不做任何提示
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.select-device {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 200rpx;
  background-color: #fff;
}

/* 空状态容器 */
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48rpx 32rpx;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-image {
  width: 280rpx;
  height: 280rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #9ca3af;
  line-height: 1.5;
}

/* 设备列表 */
.device-list-container {
  padding: 24rpx;
}

.device-scroll-list {
  max-height: calc(100vh - 350rpx);
}

.device-card {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  background-color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
  border: 1rpx solid #f3f4f6;
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    background-color: #f9fafb;
  }
}

.device-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.icon-img {
  width: 48rpx;
  height: 48rpx;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-id {
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 12rpx;
  font-family: monospace;
}

.device-signal {
  display: flex;
  align-items: center;
}

.signal-label {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 信号强度进度条 */
.signal-progress {
  position: relative;
  width: 88rpx;
  height: 24rpx;
  margin-left: 8rpx;
}

.signal-progress-bg {
  position: absolute;
  width: 88rpx;
  height: 24rpx;
  left: 0;
  top: 0;
  background: #E0FAEC;
  border-radius: 40rpx;
}

.signal-progress-fill {
  position: absolute;
  height: 24rpx;
  left: 0;
  top: 0;
  background: #3CCD62;
  border-radius: 40rpx;
  transition: width 0.3s ease;
}

.signal-divider {
  position: absolute;
  width: 2rpx;
  height: 16rpx;
  top: 4rpx;
  background: #FFFFFF;
  opacity: 0.4;
  border-radius: 40rpx;
}

.device-arrow {
  margin-left: 16rpx;
  flex-shrink: 0;
}

/* 底部操作按钮 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
}

.scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #335CFF 100%);
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(59, 130, 246, 0.3);
  }

  &.loading {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }

  &[disabled] {
    opacity: 0.8;
  }
}
</style>
