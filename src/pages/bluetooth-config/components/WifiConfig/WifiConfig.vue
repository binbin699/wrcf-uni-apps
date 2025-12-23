<template>
  <view class="wifi-config">
    <!-- 页面标题区域 -->
    <view class="header-section">
      <view class="header-title">{{ $t('bluetooth.wifi.title') }}</view>
      <view class="header-desc">{{ $t('bluetooth.wifi.desc') }}</view>
    </view>

    <!-- WiFi列表卡片 -->
    <view class="card wifi-card">
      <view class="card-header">
        <view class="card-title">
          <wd-icon name="wifi" size="36rpx" color="#3b82f6" />
          <text>WiFi {{ $t('net_config.wifi_list_title') }}</text>
        </view>
        <view
          class="scan-btn"
          :class="{ disabled: isLoadingWifi }"
          @click="startWifiScan">
          <wd-icon v-if="!isLoadingWifi" name="refresh" size="28rpx" color="#3b82f6" />
          <view v-else class="mini-spinner"></view>
          <text>{{ isLoadingWifi ? $t('bluetooth.wifi.scanning') : $t('bluetooth.wifi.scan_retry') }}</text>
        </view>
      </view>

      <!-- WiFi列表内容 -->
      <view class="wifi-list-container">
        <!-- 加载状态 -->
        <view v-if="isLoadingWifi && wifiList.length === 0" class="loading-state">
          <view class="loading-spinner"></view>
          <text class="loading-text">{{ $t('bluetooth.wifi.scanning') }}</text>
        </view>

        <!-- WiFi列表 -->
        <scroll-view
          v-else-if="wifiList.length > 0"
          scroll-y
          class="wifi-scroll-list"
          :style="{ maxHeight: scrollHeight }">
          <view
            v-for="wifi in wifiList"
            :key="wifi.SSID"
            class="wifi-item"
            :class="{ selected: selectedWifi && selectedWifi.SSID === wifi.SSID }"
            @click="handleSelectWifi(wifi)">
            <view class="wifi-info">
              <view class="wifi-name">{{ wifi.SSID }}</view>
              <view class="wifi-meta">
                <wd-icon v-if="wifi.secure" name="lock-on" size="24rpx" color="#6b7280" />
                <text class="wifi-security">
                  {{ wifi.secure ? $t('net_config.secure_network') : $t('net_config.open_network') }}
                </text>
              </view>
            </view>
            <view class="wifi-signal">
              <WifiSignal :strength="wifi.signalStrength" />
            </view>
            <view v-if="selectedWifi && selectedWifi.SSID === wifi.SSID" class="wifi-check">
              <wd-icon name="check" size="32rpx" color="#3b82f6" />
            </view>
          </view>
        </scroll-view>

        <!-- 空状态 -->
        <view v-else class="empty-state">
          <wd-icon name="wifi" size="80rpx" color="#d1d5db" />
          <view class="empty-text">{{ $t('bluetooth.wifi.no_networks') }}</view>
          <view class="empty-hint">{{ $t('bluetooth.wifi.no_networks_hint') }}</view>
        </view>
      </view>

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

    <!-- 密码输入卡片（仅当从列表选择WiFi且需要密码时显示） -->
    <view v-if="selectedWifi && selectedWifi.secure && !showManualConfig" class="card password-card">
      <view class="card-header">
        <view class="card-title">
          <wd-icon name="lock-on" size="36rpx" color="#3b82f6" />
          <text>{{ $t('net_config.wifi_password') }}</text>
        </view>
      </view>

      <view class="password-section">
        <view class="selected-wifi-info">
          <text class="wifi-label">{{ $t('net_config.wifi_name') }}:</text>
          <text class="wifi-value">{{ selectedWifi.SSID }}</text>
        </view>

        <view class="password-input-wrapper">
          <input
            v-model="password"
            class="password-input"
            type="text"
            :password="!isPasswordVisible"
            :placeholder="$t('bluetooth.wifi.password_placeholder')"
            :maxlength="64"
            @input="handlePasswordInput" />
          <view class="toggle-visibility" @click.stop="togglePasswordVisibility">
            <wd-icon :name="isPasswordVisible ? 'view' : 'eye-close'" size="40rpx" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-action">
      <button
        class="connect-btn"
        :class="{ disabled: !canConnect }"
        :disabled="!canConnect"
        @click="handleConnect">
        <wd-icon name="wifi" size="36rpx" color="#fff" />
        <text>{{ $t('bluetooth.wifi.connect') }}</text>
      </button>
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
      scrollHeight: '400rpx',
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
      // 计算可用高度，减去导航栏、进度条、标题、密码卡片、底部按钮等
      const availableHeight = systemInfo.windowHeight - 400;
      this.scrollHeight = Math.max(300, availableHeight) + 'rpx';
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
      this.selectedWifi = wifi;
      bluetoothConfigManager.setSelectedWifi(wifi);

      // 如果是开放网络，清空密码
      if (!wifi.secure) {
        this.password = '';
      }

      // 选择WiFi时关闭手动配置模式
      this.showManualConfig = false;
    },

    handlePasswordInput() {
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });
    },

    togglePasswordVisibility() {
      this.isPasswordVisible = !this.isPasswordVisible;
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });
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
            secure: this.securityIndex !== -1, // 假设有加密
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

/* 卡片通用样式 */
.card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid #f3f4f6;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

/* 扫描按钮 */
.scan-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #3b82f6;
  background-color: #eff6ff;
  border-radius: 999rpx;
  transition: all 0.2s;

  &:active {
    background-color: #dbeafe;
  }

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.mini-spinner {
  width: 24rpx;
  height: 24rpx;
  border: 3rpx solid #bfdbfe;
  border-top: 3rpx solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* WiFi列表容器 */
.wifi-list-container {
  min-height: 200rpx;
}

.wifi-scroll-list {
  max-height: 500rpx;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #e5e7eb;
  border-top: 4rpx solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #9ca3af;
}

/* WiFi列表项 */
.wifi-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  background-color: #f9fafb;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    background-color: #f3f4f6;
  }

  &.selected {
    background-color: #eff6ff;
    border-color: #3b82f6;
  }
}

.wifi-info {
  flex: 1;
  min-width: 0;
}

.wifi-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wifi-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.wifi-security {
  font-size: 24rpx;
  color: #6b7280;
}

.wifi-signal {
  margin-left: 16rpx;
  margin-right: 8rpx;
}

.wifi-check {
  margin-left: 8rpx;
}

/* 密码输入区域 */
.password-section {
  padding-top: 8rpx;
}

.selected-wifi-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background-color: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.wifi-label {
  font-size: 26rpx;
  color: #6b7280;
}

.wifi-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}

.password-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f9fafb;
  border-radius: 16rpx;
  border: 2rpx solid #e5e7eb;
  overflow: hidden;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #3b82f6;
    background-color: #fff;
  }

  &.manual-password-wrapper {
    background-color: #fff;
  }
}

.password-input {
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
    background: #d1d5db;
    box-shadow: none;
    pointer-events: none;
  }
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .wifi-config {
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

  .wifi-item {
    padding: 20rpx 16rpx;
  }

  .wifi-name {
    font-size: 28rpx;
  }

  .bottom-action {
    padding: 20rpx 24rpx;
  }

  .connect-btn {
    height: 88rpx;
    font-size: 30rpx;
  }
}

/* 手动配置样式 */
.manual-config-toggle {
  width: 100%;
  margin-top: 24rpx;
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  color: #3b82f6;
  background-color: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 12rpx;
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
</style>
