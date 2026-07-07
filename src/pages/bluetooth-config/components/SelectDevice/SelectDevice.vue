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
        <image v-else class="empty-image" src="/static/icons/no-device.svg" mode="aspectFit" />
        <text class="empty-text">
          {{ getEmptyText() }}
        </text>
        <text
          v-if="!isLoadingDevices && deviceList !== null && deviceList.length === 0"
          class="empty-hint">
          {{ hasFilteredDevices
            ? $t('bluetooth.select_device.no_target_hint')
            : $t('bluetooth.device_list.check_power') }}
        </text>
        <button
          v-if="!isLoadingDevices && hasFilteredDevices"
          class="show-all-btn"
          @click="handleShowAllDevices">
          {{ $t('bluetooth.select_device.show_all_devices') }}
        </button>
      </view>
    </view>

    <!-- 设备列表 -->
    <view v-else class="device-list-container">
      <scroll-view scroll-y class="device-scroll-list">
        <view class="device-list-inner">
          <view
            v-for="device in deviceList"
            :key="device.macAddress || device.deviceId"
            class="device-card"
            @click="handleSelectDevice(device)">
            <view class="device-icon">
              <image class="icon-img" src="/static/icons/phone.svg" mode="aspectFit" />
            </view>
            <view class="device-info">
              <view class="device-name">
                {{ device.name || 'DTXZ_' + (device.macAddress || device.deviceId).slice(-8) }}
              </view>
              <view class="device-id">ID：{{ device.macAddress || device.deviceId }}</view>
              <view class="device-signal">
                <text class="signal-label">
                  {{ $t('bluetooth.device_list.signal_strength') }}：
                </text>
                <view class="signal-progress">
                  <view class="signal-progress-bg"></view>
                  <view
                    class="signal-progress-fill"
                    :style="{ width: getSignalWidth(device.RSSI) }"></view>
                  <view class="signal-divider" style="left: 20rpx"></view>
                  <view class="signal-divider" style="left: 44rpx"></view>
                </view>
              </view>
            </view>
            <view class="device-arrow">
              <wd-icon name="arrow-right" size="36rpx" color="#9ca3af" />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <view class="gradient-fade"></view>
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
  dedupeDeviceListByMacAddress,
  normalizeMacAddressKey,
  filterValidDevices,
  normalizeDeviceList,
  connectBluetoothDevice
} from '../../utils/bluetooth';
import { requestBluetoothPermissionWrapper, requestLocationPermission } from '@/utils/permission';
import { AppInfo } from '@/const';

export default {
  name: 'SelectDevice',
  inject: ['notify', 'toast', 'isLeavingBluetoothPage'],
  data() {
    return {
      deviceList: null,
      allScannedDevices: [],
      isLoadingDevices: false,
      isFirstScan: true,
      permissionsGranted: false, // 权限是否已获取（避免重复弹预请求弹窗）
      errorMessage: null,
      _devices: [],
      _showNotify: null,
      _closeNotify: null,
      _filterRegex: null,
      _isUnmounted: false,
      _scanSeq: 0
    };
  },
  computed: {
    useLocalName() {
      return bluetoothConfigManager.state.useLocalName;
    },
    hasFilteredDevices() {
      return this.deviceList !== null
        && this.deviceList.length === 0
        && this.allScannedDevices.length > 0;
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
    const useLocalName = systemInfo.platform === 'ios' || AppInfo.isHarmonyApp();
    bluetoothConfigManager.setUseLocalName(useLocalName);

    console.log('BLE 名称模式:', useLocalName ? 'localName' : 'name');

    // 进入页面后自动开始扫描
    this.startDeviceScan();
  },
  beforeUnmount() {
    this._isUnmounted = true;
  },
  methods: {
    /**
     * 获取空状态文本
     */
    isLeavingPage() {
      return typeof this.isLeavingBluetoothPage === 'function' && this.isLeavingBluetoothPage();
    },

    getEmptyText() {
      if (this.isLoadingDevices) {
        return this.$t('bluetooth.select_device.scanning_placeholder');
      }
      if (this.deviceList === null) {
        return this.$t('bluetooth.select_device.empty_placeholder');
      }
      if (this.hasFilteredDevices) {
        return this.$t('bluetooth.select_device.no_target_devices');
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

    parseRegexString(raw) {
      const literal = raw.match(/^\/(.+)\/([gimsuy]*)$/);
      if (literal) {
        return new RegExp(literal[1], literal[2] || 'i');
      }
      return new RegExp(raw, 'i');
    },

    async fetchFilterRegex() {
      try {
        const res = await Promise.race([
          deviceApi.getFilterRegex(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        const pattern = res?.data?.regex;
        if (pattern && pattern !== '.*') {
          this._filterRegex = this.parseRegexString(pattern);
          console.log('[蓝牙] 设备过滤正则:', this._filterRegex);
        } else {
          this._filterRegex = null;
        }
      } catch (e) {
        console.warn('[蓝牙] 获取设备过滤正则失败或超时，放行所有设备:', e?.message || e);
        this._filterRegex = null;
      }
    },

    handleShowAllDevices() {
      this.deviceList = this.allScannedDevices;
    },

    /**
     * 开始设备扫描
     */
    dismissPermissionNotify() {
      if (typeof this._closeNotify === 'function') {
        this._closeNotify();
      }
    },

    async startDeviceScan() {
      if (this._isUnmounted || this.isLeavingPage()) return;

      const scanId = ++this._scanSeq;

      // 重置连接状态
      this.deviceList = null;
      this.allScannedDevices = [];
      this.isLoadingDevices = true;
      this.dismissPermissionNotify();
      this.isConnecting = false;
      this.isConnected = false;
      this.connectionError = null;
      this.selectedDevice = null;

      try {
        // 只在首次扫描时请求权限（避免重复弹预请求弹窗）
        if (!this.permissionsGranted) {
          // 请求蓝牙权限
          const permissionResult = await requestBluetoothPermissionWrapper({
            show: this._showNotify,
            close: this._closeNotify
          });
          if (this._isUnmounted || scanId !== this._scanSeq) return;
          if (!permissionResult.granted) {
            // 权限请求工具已经显示了相应的提示
            if (scanId === this._scanSeq) {
              this.isLoadingDevices = false;
            }
            return;
          }

          // Android: 蓝牙扫描需要位置权限；鸿蒙插件流程不依赖该权限
          if (AppInfo.isAndroidApp()) {
            const locationResult = await requestLocationPermission(
              {
                show: this._showNotify,
                close: this._closeNotify
              },
              true
            );
            if (this._isUnmounted || scanId !== this._scanSeq) return;
            if (!locationResult.granted) {
              // 权限请求工具已经显示了相应的提示
              if (scanId === this._scanSeq) {
                this.isLoadingDevices = false;
              }
              return;
            }
          }

          // 权限已获取，标记为已完成
          this.permissionsGranted = true;
        }

        // 在蓝牙初始化的同时并行获取过滤正则
        const initPromise = this.isFirstScan
          ? initBluetooth().then(() => {
            this.isFirstScan = false;
          })
          : resetBluetooth();
        await Promise.all([initPromise, this.fetchFilterRegex()]);
        if (this._isUnmounted || scanId !== this._scanSeq) return;

        // 搜索设备
        const devices = await searchBluetoothDevices();
        console.log('蓝牙-搜索到的原始设备:', devices);

        // 先对所有设备做去重和MAC规范化（不做名称过滤）
        const allValid = filterValidDevices(devices, this.useLocalName);
        const allDeduped = dedupeDeviceList(allValid);
        const [allNormalizedRaw] = normalizeDeviceList(allDeduped, this.useLocalName);
        const allNormalized = dedupeDeviceListByMacAddress(allNormalizedRaw);
        allNormalized.sort((a, b) => (b.RSSI || -100) - (a.RSSI || -100));
        this.allScannedDevices = allNormalized;

        // 如果有后端下发的正则，再做一轮过滤
        if (this._filterRegex) {
          const filtered = filterValidDevices(devices, this.useLocalName, this._filterRegex);
          console.log('蓝牙-正则过滤后的设备:', filtered);
          const deduped = dedupeDeviceList(filtered);
          const [normalizedRaw] = normalizeDeviceList(deduped, this.useLocalName);
          const normalized = dedupeDeviceListByMacAddress(normalizedRaw);
          normalized.sort((a, b) => (b.RSSI || -100) - (a.RSSI || -100));
          this.deviceList = normalized;
        } else {
          this.deviceList = allNormalized;
        }

        if (this._isUnmounted || scanId !== this._scanSeq) return;

        if (this.deviceList.length === 0 && this.allScannedDevices.length === 0) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.no_devices'),
            icon: 'none',
            duration: 3000
          });
        }
      } catch (error) {
        console.error('扫描设备失败:', error);
        if (this._isUnmounted || scanId !== this._scanSeq) return;

        if (String(error).includes('bluetooth')) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.bluetooth_disabled'),
            icon: 'none',
            duration: 2000
          });
        } else if (
          bluetoothConfigManager.getState().currentStep === CONFIG_STEPS.SELECT_DEVICE &&
          !bluetoothConfigManager.getState().configCompleted
        ) {
          uni.showToast({
            title: this.$t('bluetooth.select_device.list_failed'),
            icon: 'none',
            duration: 2000
          });
        }
        this.deviceList = [];
      } finally {
        if (!this._isUnmounted && scanId === this._scanSeq) {
          this.isLoadingDevices = false;
        }
      }
    },

    /**
     * 处理设备选择
     * @param {Object} device - 选中的设备
     */
    handleSelectDevice(device) {
      if (this.isLeavingPage()) return;

      console.log('选择设备:', device);

      // 已绑定设备也允许进入后续蓝牙配网流程，不再拦截（不重复调用绑定接口，见 startConnection）
      // 获取当前状态
      const state = bluetoothConfigManager.getState();
      const selectedMac = (device.macAddress || device.deviceId || '').toLowerCase();

      // 检查当前设备是否已绑定（仅在非 configOnly 模式下检查）
      if (!state.configOnly && selectedMac) {
        const isDeviceBound = this._devices.some(
          (_device) => (_device.macAddress || '').toLowerCase() === selectedMac
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
    /**
     * 当前选中设备是否已在用户设备列表中绑定（与 loadUserDevices 的 MAC 比对）
     */
    isSelectedDeviceAlreadyBound(device) {
      const state = bluetoothConfigManager.getState();
      if (state.configOnly || !device) {
        return false;
      }
      const selectedKey = normalizeMacAddressKey(device.macAddress || device.deviceId || '');
      if (!selectedKey) {
        return false;
      }
      return this._devices.some((_device) => {
        const boundKey = normalizeMacAddressKey(_device.macAddress || '');
        return boundKey !== '' && boundKey === selectedKey;
      });
    },

    getButtonText() {
      if (this.isLoadingDevices) {
        return this.$t('bluetooth.select_device.scan_button_loading');
      }
      // 自动扫描后，按钮始终显示"重新扫描"
      return this.$t('bluetooth.select_device.scan_button_retry');
    },

    /**
     * 开始连接设备
     * @param {Object} device - 要连接的设备
     */
    async startConnection(device) {
      if (this.isLeavingPage()) return;

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

        // 鸿蒙: 回调可能晚于页面卸载，跳过 UI 操作
        if (this._isUnmounted) {
          uni.hideLoading();
          return;
        }
        console.log('设备连接成功');
        // 更新设备连接状态
        const connectedDevice = {
          ...device,
          connected: true
        };
        bluetoothConfigManager.setSelectedDevice(connectedDevice);
        // 根据连接结果构建提示信息
        let successMsg = this.$t('bluetooth.select_device.connection_success');
        if (!bluetoothConfigManager.getState().configOnly) {
          if (this.isSelectedDeviceAlreadyBound(connectedDevice)) {
            bluetoothConfigManager.setDefaultAgentBind(null);
          } else {
            const result = await this.registerDevice(connectedDevice);
            successMsg = this.buildBindSuccessMessage(result);
          }
        }
        // 显示连接成功提示
        uni.hideLoading();
        if (!bluetoothConfigManager.getState().configOnly && this.toast?.success) {
          this.toast.success({
            msg: successMsg,
            duration: 2500,
            cover: true
          });
        } else {
          uni.showToast({
            title: successMsg,
            icon: 'success',
            duration: 1000
          });
        }
        bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
      } catch (error) {
        uni.hideLoading();

        // 鸿蒙: 回调可能晚于页面卸载，跳过 UI 操作
        if (this._isUnmounted) return;

        // 处理已连接但未正确断开导致的 "already connect" 错误
        if (error?.errMsg?.includes('already connect')) {
          const connectedDevice = {
            ...device,
            connected: true
          };
          bluetoothConfigManager.setSelectedDevice(connectedDevice);
          // 根据连接结果构建提示信息
          let successMsg = this.$t('bluetooth.select_device.connection_success');
          if (!bluetoothConfigManager.getState().configOnly) {
            if (this.isSelectedDeviceAlreadyBound(connectedDevice)) {
              bluetoothConfigManager.setDefaultAgentBind(null);
            } else {
              const result = await this.registerDevice(connectedDevice);
              successMsg = this.buildBindSuccessMessage(result);
            }
          }
          // 显示连接成功提示
          if (!bluetoothConfigManager.getState().configOnly && this.toast?.success) {
            this.toast.success({
              msg: successMsg,
              duration: 2500,
              cover: true
            });
          } else {
            uni.showToast({
              title: successMsg,
              icon: 'success',
              duration: 1000
            });
          }
          bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
          return;
        }

        console.error('连接设备失败:', error);
        uni.showToast({
          title: error?.message || this.$t('bluetooth.select_device.connection_failed'),
          icon: 'none',
          duration: 2000
        });
      }
    },

    buildBindSuccessMessage(result) {
      let successMsg = this.$t('net_config.device_bind_success');
      const bind = result?.data?.defaultAgentBind;
      if (bind?.bound && bind.agentName) {
        successMsg += '\n' + this.$t('device.default_agent_bound').replace('{name}', bind.agentName);
      } else if (bind?.reason === 'no_match') {
        successMsg += '\n' + this.$t('device.default_agent_no_match');
      } else if (bind?.reason === 'error') {
        successMsg += '\n' + this.$t('device.default_agent_bind_failed');
      }
      return successMsg;
    },

    async registerDevice(device) {
      const macAddr = device.macAddress || device.deviceId;
      const result = await deviceApi.bindByQrcode({ m: macAddr });
      if (!result || result.code !== 1000) {
        throw new Error(result?.message || this.$t('net_config.device_bind_fail'));
      }

      bluetoothConfigManager.setDefaultAgentBind(result.data?.defaultAgentBind || null);
      if (!this._devices.some((item) => (item.macAddress || '').toLowerCase() === macAddr.toLowerCase())) {
        this._devices.push({
          ...(result.data || {}),
          macAddress: macAddr,
          deviceName: device.name || macAddr
        });
      }
      return result;
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
  /* 小程序端需要明确高度才能垂直居中 */
  min-height: 65vh;
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

.show-all-btn {
  margin-top: 32rpx;
  padding: 16rpx 40rpx;
  font-size: 28rpx;
  color: #3e5def;
  background: transparent;
  border: 2rpx solid #3e5def;
  border-radius: 40rpx;

  &:active {
    background: rgba(62, 93, 239, 0.08);
  }
}

/* 设备列表 */
.device-list-container {
  padding: 0;
}

.device-scroll-list {
  max-height: calc(100vh - 350rpx);
}

.device-list-inner {
  padding: 24rpx 32rpx;
}

.device-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  margin-bottom: 20rpx;
  background-color: #fff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
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
  font-size: 36rpx;
  font-weight: 500;
  color: #0e121b;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-id {
  font-size: 28rpx;
  color: #717784;
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
  background: #e0faec;
  border-radius: 40rpx;
}

.signal-progress-fill {
  position: absolute;
  height: 24rpx;
  left: 0;
  top: 0;
  background: #3ccd62;
  border-radius: 40rpx;
  transition: width 0.3s ease;
}

.signal-divider {
  position: absolute;
  width: 2rpx;
  height: 16rpx;
  top: 4rpx;
  background: #ffffff;
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

.gradient-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 60rpx;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  pointer-events: none;
}

.scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  background: var(--color-primary);
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
  border: none;
  transition: all 0.2s;

  &:active {
    opacity: 0.9;
  }

  &.loading {
    background: var(--color-primary-disabled);
  }

  &[disabled] {
    opacity: 0.7;
  }
}
</style>
