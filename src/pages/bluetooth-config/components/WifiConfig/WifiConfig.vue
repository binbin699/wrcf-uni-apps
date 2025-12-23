<template>
  <view class="wifi-config">
    <!-- 加载/空状态 -->
    <view v-if="isLoadingWifi && wifiList.length === 0" class="empty-container">
      <view class="empty-content">
        <image class="empty-image" src="/static/icons/wifi-scan.svg" mode="aspectFit" />
        <text class="empty-text">{{ $t('bluetooth.wifi.scanning') }}</text>
      </view>
    </view>

    <!-- 空列表状态 -->
    <view v-else-if="!isLoadingWifi && wifiList.length === 0" class="empty-container">
      <view class="empty-content">
        <image class="empty-image" src="/static/icons/wifi-scan.svg" mode="aspectFit" />
        <text class="empty-text">{{ $t('bluetooth.wifi.no_networks') }}</text>
        <text class="empty-hint">{{ $t('bluetooth.wifi.no_networks_hint') }}</text>
      </view>
    </view>

    <!-- WiFi列表 -->
    <view v-else class="wifi-list-container">
      <scroll-view scroll-y class="wifi-scroll-list" :style="{ maxHeight: scrollHeight }">
        <view
          v-for="wifi in wifiList"
          :key="wifi.SSID"
          class="wifi-card"
          :class="{ selected: selectedWifi && selectedWifi.SSID === wifi.SSID }"
          @click="handleSelectWifi(wifi)">
          <view class="wifi-icon">
            <wd-icon name="wifi" size="40rpx" :color="selectedWifi && selectedWifi.SSID === wifi.SSID ? '#fff' : '#9ca3af'" />
          </view>
          <view class="wifi-info">
            <text class="wifi-name">{{ wifi.SSID }}</text>
          </view>
          <view v-if="wifi.secure" class="wifi-lock">
            <wd-icon name="lock-on" size="32rpx" :color="selectedWifi && selectedWifi.SSID === wifi.SSID ? '#fff' : '#9ca3af'" />
          </view>
          <view class="wifi-arrow">
            <wd-icon name="arrow-right" size="32rpx" :color="selectedWifi && selectedWifi.SSID === wifi.SSID ? '#fff' : '#9ca3af'" />
          </view>
        </view>
      </scroll-view>

      <!-- 手动配置切换按钮 -->
      <button class="manual-config-toggle" @click="toggleManualConfig">
        {{ showManualConfig ? $t('bluetooth.wifi.hide_manual_config') : $t('bluetooth.wifi.manual_config') }}
      </button>

      <!-- 手动配置表单 -->
      <view v-if="showManualConfig" class="manual-config-form">
        <view class="manual-config-header">
          <view class="manual-config-title">{{ $t('bluetooth.wifi.manual_config') }}</view>
          <text class="manual-config-clear" @click="clearManualConfig">
            {{ $t('bluetooth.wifi.clear_config') }}
          </text>
        </view>

        <view class="form-group">
          <view class="form-label">{{ $t('net_config.wifi_name') }}</view>
          <input
            class="form-input"
            type="text"
            v-model="manualSsid"
            :placeholder="$t('bluetooth.wifi.ssid_placeholder')"
            confirm-type="next"
            :cursor-spacing="20" />
        </view>

        <view class="form-group">
          <view class="form-label">{{ $t('bluetooth.wifi.security_type') }}</view>
          <picker
            mode="selector"
            :range="securityOptions"
            range-key="label"
            :value="securityIndex"
            @change="onSecurityChange">
            <view class="form-picker">
              {{ securityOptions[securityIndex].label }}
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <view class="form-label">{{ $t('net_config.wifi_password') }}</view>
          <view class="password-input-wrapper manual-password-wrapper">
            <input
              v-model="manualPassword"
              class="password-input"
              type="text"
              :password="!isManualPasswordVisible"
              :placeholder="$t('bluetooth.wifi.password_placeholder')"
              :maxlength="64"
              confirm-type="done"
              :cursor-spacing="20" />
            <view class="toggle-visibility" @click.stop="toggleManualPasswordVisibility">
              <wd-icon :name="isManualPasswordVisible ? 'view' : 'eye-close'" size="40rpx" color="#9ca3af" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <button
        v-if="canConnect"
        class="connect-btn"
        @click="handleConnect">
        <text>{{ $t('common.confirm') }}</text>
      </button>
      <button
        v-else
        class="scan-btn"
        :class="{ disabled: isLoadingWifi }"
        :disabled="isLoadingWifi"
        @click="startWifiScan">
        <text>{{ $t('bluetooth.wifi.scan_retry') }}</text>
      </button>
    </view>

    <!-- 密码输入弹窗 -->
    <view v-if="showPasswordModal" class="password-modal-overlay" @click="closePasswordModal">
      <view class="password-modal" @click.stop>
        <view class="modal-title">{{ pendingWifi && pendingWifi.SSID }}</view>
        <view class="modal-input-wrapper">
          <input
            v-model="password"
            class="modal-input"
            type="text"
            :password="!isPasswordVisible"
            :placeholder="$t('bluetooth.wifi.password_placeholder')"
            :maxlength="64"
            :focus="showPasswordModal"
            @confirm="confirmPassword" />
          <view class="toggle-visibility" @click.stop="togglePasswordVisibility">
            <wd-icon :name="isPasswordVisible ? 'view' : 'eye-close'" size="40rpx" color="#9ca3af" />
          </view>
        </view>
        <button class="modal-confirm-btn" @click="confirmPassword">
          {{ $t('common.confirm') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import WifiSignal from '../SelectWifi/WifiSignal.vue';
import { securityOptions } from '@/utils/wifiConfig';

export default {
  name: 'WifiConfig',
  components: {
    WifiSignal
  },
  data() {
    return {
      isLoadingWifi: false,
      wifiList: [],
      selectedWifi: null,
      password: '',
      isPasswordVisible: false,
      scrollHeight: '600rpx',
      // 密码弹窗
      showPasswordModal: false,
      pendingWifi: null,
      // 手动配置相关
      showManualConfig: false,
      manualSsid: '',
      manualPassword: '',
      isManualPasswordVisible: false,
      securityIndex: 0,
      securityOptions: securityOptions
    };
  },
  computed: {
    canConnect() {
      // 手动配置模式
      if (this.showManualConfig) {
        return this.manualSsid.trim() !== '';
      }
      // 列表选择模式
      if (!this.selectedWifi) return false;
      if (this.selectedWifi.secure && !this.password.trim()) return false;
      return true;
    }
  },
  async mounted() {
    console.log('WifiConfig 组件加载');

    // 计算滚动区域高度
    this.calculateScrollHeight();

    // 恢复之前的状态
    const state = bluetoothConfigManager.getState();
    this.selectedWifi = state.selectedWifi;
    if (state.passwordState) {
      this.password = state.passwordState.password || '';
      this.isPasswordVisible = state.passwordState.isVisible || false;
    }

    // 获取当前连接的蓝牙设备
    const selectedDevice = state.selectedDevice;
    if (!selectedDevice || !selectedDevice.deviceId) {
      uni.showToast({
        title: this.$t('bluetooth.wifi.not_connected'),
        icon: 'error',
        duration: 2000
      });
      return;
    }

    // 初始化配网协议
    try {
      this.isLoadingWifi = true;
      await configProtocol.init(selectedDevice.deviceId);
      await this.startWifiScan();
    } catch (error) {
      console.error('初始化配网协议失败:', error);
      this.isLoadingWifi = false;
      uni.showToast({
        title: this.$t('bluetooth.wifi.init_failed'),
        icon: 'none',
        duration: 2000
      });
    }
  },
  methods: {
    calculateScrollHeight() {
      const systemInfo = uni.getSystemInfoSync();
      // 计算可用高度
      const availableHeight = systemInfo.windowHeight - 300;
      this.scrollHeight = Math.max(400, availableHeight) + 'rpx';
    },

    async startWifiScan() {
      this.isLoadingWifi = true;

      try {
        console.log('开始扫描WiFi网络');

        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;

        if (!selectedDevice || !selectedDevice.deviceId) {
          throw new Error('未找到已连接的蓝牙设备');
        }

        const wifiList = await configProtocol.getWifiList(selectedDevice.deviceId);

        this.wifiList = wifiList.map((wifi) => ({
          ...wifi,
          signalStrength: Math.floor((wifi.signalStrength / 100) * 4)
        }));

        console.log('WiFi扫描完成:', this.wifiList);

        if (this.wifiList.length === 0) {
          uni.showToast({
            title: this.$t('bluetooth.wifi.no_networks'),
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('WiFi扫描失败:', error);
        uni.showToast({
          title: error.message || this.$t('bluetooth.wifi.scan_failed'),
          icon: 'none',
          duration: 3000
        });
      } finally {
        this.isLoadingWifi = false;
      }
    },

    handleSelectWifi(wifi) {
      console.log('选择WiFi:', wifi);
      
      // 选择WiFi时关闭手动配置模式
      this.showManualConfig = false;
      
      // 如果需要密码，显示密码弹窗
      if (wifi.secure) {
        this.pendingWifi = wifi;
        this.password = '';
        this.showPasswordModal = true;
      } else {
        // 开放网络，直接选中
        this.selectedWifi = wifi;
        this.password = '';
        bluetoothConfigManager.setSelectedWifi(wifi);
      }
    },

    closePasswordModal() {
      this.showPasswordModal = false;
      this.pendingWifi = null;
    },

    confirmPassword() {
      if (!this.password.trim() && this.pendingWifi && this.pendingWifi.secure) {
        uni.showToast({
          title: this.$t('bluetooth.wifi.password_required'),
          icon: 'none',
          duration: 2000
        });
        return;
      }

      this.selectedWifi = this.pendingWifi;
      bluetoothConfigManager.setSelectedWifi(this.selectedWifi);
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });
      this.showPasswordModal = false;
    },

    togglePasswordVisibility() {
      this.isPasswordVisible = !this.isPasswordVisible;
    },

    // 手动配置相关方法
    toggleManualConfig() {
      this.showManualConfig = !this.showManualConfig;
      if (this.showManualConfig) {
        // 打开手动配置时，清除WiFi列表选择
        this.selectedWifi = null;
        this.password = '';
        bluetoothConfigManager.setSelectedWifi(null);
      }
    },

    clearManualConfig() {
      this.manualSsid = '';
      this.manualPassword = '';
      this.securityIndex = 0;
      this.isManualPasswordVisible = false;
    },

    onSecurityChange(e) {
      this.securityIndex = e.detail.value;
    },

    toggleManualPasswordVisibility() {
      this.isManualPasswordVisible = !this.isManualPasswordVisible;
    },

    async handleConnect() {
      if (!this.canConnect) {
        if (this.showManualConfig) {
          if (!this.manualSsid.trim()) {
            uni.showToast({
              title: this.$t('bluetooth.wifi.ssid_placeholder'),
              icon: 'none',
              duration: 2000
            });
          }
        } else if (!this.selectedWifi) {
          uni.showToast({
            title: this.$t('bluetooth.wifi.please_select'),
            icon: 'none',
            duration: 2000
          });
        }
        return;
      }

      try {
        uni.showLoading({
          title: this.$t('bluetooth.wifi.configuring'),
          mask: true
        });

        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;

        // 确定要使用的SSID和密码
        let ssid, wifiPassword;
        if (this.showManualConfig) {
          // 使用手动配置的信息
          ssid = this.manualSsid.trim();
          wifiPassword = this.manualPassword;

          // 为手动配置创建一个虚拟的 selectedWifi 对象
          const manualWifi = {
            SSID: ssid,
            secure: this.securityIndex !== -1,
            signalStrength: 100
          };
          bluetoothConfigManager.setSelectedWifi(manualWifi);
        } else {
          if (!this.selectedWifi) {
            throw new Error('缺少必要的配置信息');
          }
          ssid = this.selectedWifi.SSID;
          wifiPassword = this.password;

          // 保存密码状态
          bluetoothConfigManager.setPasswordState({
            password: this.password,
            isVisible: this.isPasswordVisible
          });
        }

        // WiFi 名称和密码格式校验
        const formatRegex = /^[a-zA-Z0-9_\-\s!@#$%^&*()+=.\[\]{}|\\:;"'<>,?/~`\u4e00-\u9fa5]+$/;
        if (!formatRegex.test(ssid)) {
          uni.showToast({
            title: this.$t('net_config.invalid_ssid_format'),
            icon: 'none',
            duration: 3000
          });
          uni.hideLoading();
          return;
        }
        if (wifiPassword && !formatRegex.test(wifiPassword)) {
          uni.showToast({
            title: this.$t('net_config.invalid_password_format'),
            icon: 'none',
            duration: 3000
          });
          uni.hideLoading();
          return;
        }

        if (!selectedDevice) {
          throw new Error('缺少已连接的蓝牙设备');
        }

        // 通过蓝牙发送WiFi配置
        await configProtocol.sendWifiConfig(
          selectedDevice.deviceId,
          ssid,
          wifiPassword
        );

        console.log('WiFi配置发送成功');

        uni.hideLoading();

        // 进入提交配置步骤
        bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SUBMIT_CONFIG);
      } catch (error) {
        console.error('WiFi配置发送失败:', error);
        uni.hideLoading();
        uni.showToast({
          title: error.message || this.$t('common.operation_failed'),
          icon: 'none',
          duration: 3000
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.wifi-config {
  min-height: 100%;
  padding-bottom: 200rpx;
  background-color: #fff;
}

/* 空状态容器 */
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 300rpx);
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

/* WiFi列表 */
.wifi-list-container {
  padding: 24rpx;
}

.wifi-scroll-list {
  max-height: 600rpx;
}

.wifi-card {
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
  }

  &.selected {
    background: linear-gradient(135deg, #3b82f6 0%, #335CFF 100%);
    border-color: transparent;

    .wifi-name {
      color: #fff;
    }
  }
}

.wifi-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.wifi-info {
  flex: 1;
  min-width: 0;
}

.wifi-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wifi-lock {
  margin-left: 12rpx;
  flex-shrink: 0;
}

.wifi-arrow {
  margin-left: 12rpx;
  flex-shrink: 0;
}

/* 底部按钮 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
}

.scan-btn,
.connect-btn {
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

  &.disabled {
    opacity: 0.6;
  }
}

/* 密码弹窗 */
.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.password-modal {
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15);
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
  margin-bottom: 32rpx;
}

.modal-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f9fafb;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  margin-bottom: 32rpx;

  &:focus-within {
    border-color: #3b82f6;
    background-color: #fff;
  }
}

.modal-input {
  flex: 1;
  padding: 28rpx 24rpx;
  font-size: 30rpx;
  color: #1f2937;
  background-color: transparent;
  border: none;

  &::placeholder {
    color: #9ca3af;
  }
}

.toggle-visibility {
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.7;
  }
}

.modal-confirm-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #335CFF 100%);
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  border: none;

  &:active {
    transform: scale(0.98);
  }
}

/* 手动配置样式 */
.manual-config-toggle {
  width: 100%;
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #3b82f6;
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 16rpx;
  text-align: center;
  transition: all 0.2s;

  &:active {
    background-color: #dbeafe;
  }
}

.manual-config-form {
  margin-top: 24rpx;
  padding: 24rpx;
  background-color: #f9fafb;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
}

.manual-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.manual-config-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.manual-config-clear {
  font-size: 26rpx;
  color: #ef4444;
  padding: 8rpx 16rpx;

  &:active {
    opacity: 0.7;
  }
}

.form-group {
  margin-bottom: 20rpx;
}

.form-label {
  font-size: 26rpx;
  color: #4b5563;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #1f2937;
  background-color: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    border-color: #3b82f6;
  }
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  font-size: 30rpx;
  color: #1f2937;
  background-color: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.picker-arrow {
  font-size: 36rpx;
  color: #9ca3af;
}

.password-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;

  &:focus-within {
    border-color: #3b82f6;
  }
}

.password-input {
  flex: 1;
  padding: 24rpx;
  font-size: 30rpx;
  color: #1f2937;
  background-color: transparent;
  border: none;

  &::placeholder {
    color: #9ca3af;
  }
}
</style>
