<template>
  <wd-notify />
  <view class="select-device">
    <!-- 页面标题区域 -->
    <view class="header-section">
      <view class="header-title">{{ $t('bluetooth.step.select_device') }}</view>
      <view class="header-desc">{{ $t('bluetooth.device_list.check_power') }}</view>
    </view>

    <!-- 设备列表卡片 -->
    <view class="card device-card">
      <!-- 初始状态或无设备状态 -->
      <view v-if="deviceList === null || deviceList.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <wd-icon name="scan" size="120rpx" color="#d1d5db" />
        </view>
        <text class="empty-text">
          {{
            isLoadingDevices
              ? $t('bluetooth.select_device.scanning_placeholder')
              : $t('bluetooth.select_device.empty_placeholder')
          }}
        </text>
      </view>

      <!-- 设备列表状态 -->
      <view v-else class="device-list-wrapper">
        <view class="list-header">
          <view class="list-title">
            <wd-icon name="bluetooth" size="32rpx" color="#3b82f6" />
            <text>{{ $t('bluetooth.device_list.devices_found') }}</text>
            <text class="device-count">({{ deviceList.length }})</text>
          </view>
        </view>
        <scroll-view scroll-y class="device-scroll-list">
          <view
            v-for="device in deviceList"
            :key="device.deviceId"
            class="device-item"
            @click="handleSelectDevice(device)">
            <view class="device-icon">
              <wd-icon name="bluetooth" size="40rpx" color="#3b82f6" />
            </view>
            <view class="device-info">
              <view class="device-name">{{ device.name || device.deviceId }}</view>
              <view class="device-meta">
                <!-- 优先显示 Wi-Fi MAC，与设备管理页面保持一致 -->
                <text class="device-id">{{ device.macAddress || device.deviceId }}</text>
              </view>
            </view>
            <view class="device-arrow">
              <wd-icon name="arrow-right" size="32rpx" color="#9ca3af" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <button
        class="scan-btn"
        :class="{ loading: isLoadingDevices }"
        :loading="isLoadingDevices"
        :disabled="isLoadingDevices"
        @click="startDeviceScan">
        <wd-icon v-if="!isLoadingDevices" name="scan" size="36rpx" color="#fff" />
        <text>{{ getButtonText() }}</text>
      </button>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { deviceApi } from '@/api/index.js';
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

      // 检查当前设备是否已绑定
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
        // // 跳转到下一步
        // setTimeout(() => {
        // }, 800);
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
  padding: 24rpx;
  padding-bottom: 200rpx;
  min-height: 100%;
}

/* 头部区域 */
.header-section {
  margin-bottom: 32rpx;
  padding: 0 8rpx;
}

.header-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.header-desc {
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 卡片样式 */
.card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid #f3f4f6;
}

.device-card {
  min-height: 400rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  text-align: center;
}

.empty-icon-wrapper {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  border-radius: 50%;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 设备列表 */
.device-list-wrapper {
  width: 100%;
}

.list-header {
  margin-bottom: 20rpx;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.device-count {
  font-weight: 400;
  color: #6b7280;
}

.device-scroll-list {
  max-height: 600rpx;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  background-color: #f9fafb;
  transition: all 0.2s;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    background-color: #eff6ff;
    transform: scale(0.99);
  }
}

.device-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #eff6ff;
  border-radius: 16rpx;
  margin-right: 20rpx;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.device-id {
  font-size: 24rpx;
  color: #9ca3af;
  font-family: monospace;
}

.device-arrow {
  margin-left: 12rpx;
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
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
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

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .select-device {
    padding: 20rpx;
    padding-bottom: 180rpx;
  }

  .header-title {
    font-size: 36rpx;
  }

  .header-desc {
    font-size: 26rpx;
  }

  .card {
    padding: 28rpx;
    border-radius: 20rpx;
  }

  .device-card {
    min-height: 350rpx;
  }

  .empty-icon-wrapper {
    width: 140rpx;
    height: 140rpx;
  }

  .empty-text {
    font-size: 28rpx;
  }

  .device-item {
    padding: 20rpx 16rpx;
  }

  .device-icon {
    width: 64rpx;
    height: 64rpx;
    margin-right: 16rpx;
  }

  .device-name {
    font-size: 28rpx;
  }

  .bottom-action {
    padding: 20rpx 24rpx;
  }

  .scan-btn {
    height: 88rpx;
    font-size: 30rpx;
  }
}
</style>
