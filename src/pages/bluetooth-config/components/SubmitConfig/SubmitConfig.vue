<template>
  <view class="submit-config">
    <!-- 配网进行中状态 -->
    <view v-if="isSubmitting" class="status-container">
      <view class="status-content">
        <view class="connecting-animation">
          <view class="pulse-ring"></view>
          <view class="pulse-ring delay-1"></view>
          <view class="pulse-ring delay-2"></view>
          <wd-icon name="wifi" size="80rpx" color="var(--color-primary)" />
        </view>
        <text class="status-title">{{ $t('bluetooth.submit.title') }}</text>
        <text class="status-desc">{{ $t('bluetooth.submit.waiting') }}</text>
        <text class="waiting-time">{{ waitingTime }}s</text>

        <!-- 进度停滞提示 -->
        <view v-if="showStuckWarning" class="warning-card">
          <wd-icon name="warning" size="36rpx" color="#f59e0b" />
          <text>{{ $t('bluetooth.submit.stuck_warning') }}</text>
        </view>
      </view>
    </view>

    <!-- 配网成功状态 -->
    <view v-else-if="isConfigSuccess" class="status-container">
      <view class="status-content">
        <view class="success-icon-wrapper">
          <wd-icon name="check" size="100rpx" color="#fff" />
        </view>
        <text class="status-title success-text">{{ $t('bluetooth.submit.success_title') }}</text>
        <text class="status-desc">{{ $t('bluetooth.submit.success_desc') }}</text>
        <text v-if="defaultAgentBind && defaultAgentBind.bound" class="status-desc">{{ $t('device.default_agent_bound').replace('{name}', defaultAgentBind.agentName || '') }}</text>
        <text v-else-if="defaultAgentBind && defaultAgentBind.reason === 'no_match'" class="status-desc">{{ $t('device.default_agent_no_match') }}</text>
        <text v-else-if="defaultAgentBind && defaultAgentBind.reason === 'error'" class="status-desc">{{ $t('device.default_agent_bind_failed') }}</text>

        <!-- 配网信息摘要 -->
        <view class="info-card">
          <view class="info-item">
            <text class="info-label">{{ $t('net_config.wifi_name') }}</text>
            <text class="info-value">{{ selectedWifi && selectedWifi.SSID }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">{{ $t('device.name_prefix') }}</text>
            <text class="info-value">{{ deviceDisplayName }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 配网失败状态 -->
    <view v-else-if="configError" class="status-container">
      <view class="status-content">
        <image class="status-image" src="/static/icons/config-failed.svg" mode="aspectFit" />
        <text class="status-title error-text">{{ $t('bluetooth.submit.failed_title') }}</text>
        <text class="status-desc">{{ configError || $t('bluetooth.submit.device_timeout') }}</text>
      </view>
    </view>

    <!-- 准备状态 -->
    <view v-else class="status-container">
      <view class="status-content">
        <image class="status-image" src="/static/icons/wifi-scan.svg" mode="aspectFit" />
        <text class="status-title">{{ $t('bluetooth.submit.title') }}</text>
        <text class="status-desc">{{ $t('bluetooth.submit.ready_desc') }}</text>

        <!-- 配置信息摘要 -->
        <view class="info-card">
          <view class="info-item">
            <text class="info-label">{{ $t('net_config.wifi_name') }}</text>
            <text class="info-value">{{ selectedWifi && selectedWifi.SSID }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">{{ $t('device.name_prefix') }}</text>
            <text class="info-value">{{ deviceDisplayName }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-action">
      <!-- 配网中 -->
      <view v-if="isSubmitting" class="action-hint">
        <text>{{ $t('common.loading') }}</text>
      </view>

      <!-- 成功状态 -->
      <button v-else-if="isConfigSuccess" class="action-btn success" @click="finishConfig">
        <text>{{ $t('bluetooth.submit.finish') }}</text>
      </button>

      <!-- 失败状态 -->
      <button v-else-if="configError" class="action-btn primary" @click="retryConfigSubmission">
        <text>{{ $t('bluetooth.submit.retry') }}</text>
      </button>

      <!-- 准备状态 -->
      <button v-else class="action-btn primary" @click="startConfigSubmission">
        <text>{{ $t('bluetooth.wifi.connect') }}</text>
      </button>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import { deviceApi } from '@/api/index';

export default {
  name: 'SubmitConfig',
  data() {
    return {
      isSubmitting: false,
      isConfigSuccess: false,
      configError: null,
      wifiFailureCheckTimer: null,
      wifiConnectionStuck: false,
      waitingTime: 0,
      waitingTimer: null,
      defaultAgentBind: null
    };
  },
  computed: {
    selectedDevice() {
      return bluetoothConfigManager.getState().selectedDevice;
    },
    selectedWifi() {
      return bluetoothConfigManager.getState().selectedWifi;
    },
    passwordState() {
      return bluetoothConfigManager.getState().passwordState;
    },
    deviceDisplayName() {
      if (!this.selectedDevice) return this.$t('bluetooth.submit.unknown_device');
      return (
        this.selectedDevice.name ||
        this.selectedDevice.deviceId ||
        this.$t('bluetooth.submit.unknown_device')
      );
    },
    isWifiPasswordError() {
      return this.configError && this.configError.includes('WiFi密码');
    },
    showStuckWarning() {
      return this.wifiConnectionStuck && this.isSubmitting;
    }
  },
  mounted() {
    console.log('SubmitConfig 组件加载');
    console.log('配网信息:', {
      device: this.selectedDevice,
      wifi: this.selectedWifi,
      password: this.passwordState
    });

    // 验证必要信息
    if (!this.selectedDevice || !this.selectedWifi) {
      console.error('配网信息不完整');
      uni.showToast({
        title: this.$t('bluetooth.submit.config_incomplete'),
        icon: 'none',
        duration: 2000
      });
      this.goBackToWifiConfig();
      return;
    }

    // 自动开始配网提交
    this.$nextTick(() => {
      this.startConfigSubmission();
    });
  },
  methods: {
    /**
     * 清理定时器
     */
    clearTimers() {
      if (this.wifiFailureCheckTimer) {
        clearTimeout(this.wifiFailureCheckTimer);
        this.wifiFailureCheckTimer = null;
      }
      if (this.waitingTimer) {
        clearInterval(this.waitingTimer);
        this.waitingTimer = null;
      }
    },

    /**
     * 开始配网提交
     */
    async startConfigSubmission() {
      this.isSubmitting = true;
      this.configError = null;
      this.isConfigSuccess = false;
      this.wifiConnectionStuck = false;
      this.waitingTime = 0;
      this.clearTimers();

      // 启动等待计时器
      this.waitingTimer = setInterval(() => {
        this.waitingTime++;
        // 超过20秒显示警告
        if (this.waitingTime > 20) {
          this.wifiConnectionStuck = true;
        }
      }, 1000);

      try {
        console.log('开始提交配网配置');

        // 获取当前状态
        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;

        if (!selectedDevice || !selectedDevice.deviceId) {
          throw new Error(this.$t('bluetooth.submit.no_bluetooth_device'));
        }

        console.log('开始监听配网结果...');

        // 监听配网结果
        const configResult = await configProtocol.waitForConfigResult(selectedDevice.deviceId);

        if (configResult.success) {
          console.log('配网成功', configResult);
          this.isConfigSuccess = true;

          // 标记配网已完成，这样返回时可以直接退出页面
          bluetoothConfigManager.setConfigCompleted(true);

          // 仅在非 configOnly 模式下绑定设备
          if (!state.configOnly) {
            await this.registerDevice();
          } else {
            console.log('仅配网模式，跳过设备绑定');
          }

          uni.showToast({
            title: this.$t('bluetooth.submit.config_success'),
            icon: 'success',
            duration: 2000
          });
        } else {
          throw new Error(configResult.error || this.$t('bluetooth.submit.config_failed'));
        }
      } catch (error) {
        console.error('配网失败:', error);

        // 根据错误类型提供更具体的提示
        let errorMessage = this.$t('bluetooth.submit.device_timeout');

        if (error.message && error.message.includes('超时')) {
          // 检查是否可能是WiFi密码错误
          if (this.wifiConnectionStuck) {
            errorMessage = this.$t('bluetooth.wifi_timeout_check_password');
          }
        }

        this.configError = errorMessage;

        uni.showToast({
          title: this.$t('bluetooth.submit.failed_title'),
          icon: 'none',
          duration: 3000
        });
      } finally {
        this.isSubmitting = false;
        this.clearTimers();
      }
    },

    /**
     * 重新配网
     */
    retryConfigSubmission() {
      this.startConfigSubmission();
    },

    /**
     * 完成配网
     */
    async finishConfig() {
      // 重置状态
      bluetoothConfigManager.resetState();

      // 跳转到智能体广场，方便用户绑定智能体
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/square/square'
        });
      }, 500);
    },

    /**
     * 注册设备到用户账号
     */
    async registerDevice() {
      console.log('注册设备', this.selectedDevice);

      try {
        // 绑定设备到用户账号
        // 优先使用 macAddress 字段（iOS 上 deviceId 是 UUID 格式）
        const macAddr = this.selectedDevice.macAddress || this.selectedDevice.deviceId;
        const deviceData = {
          deviceName: this.selectedDevice.name || macAddr,
          macAddress: macAddr,
          // 直接存储 i18n key，前端显示时通过 $t() 翻译
          remark: 'device.remark_bound_via_wifi'
        };
        console.log('正在绑定设备到用户账号...', deviceData);

        uni.showLoading({
          title: this.$t('bluetooth.submit.binding_loading'),
          mask: true
        });

        const result = await deviceApi.add(deviceData);

        uni.hideLoading();

        if (result && result.code === 1000) {
          console.log('设备绑定成功', result);
          // 保存默认智能体绑定结果，用于成功页面展示
          this.defaultAgentBind = result.data?.defaultAgentBind || null;
          uni.showToast({
            title: this.$t('bluetooth.submit.bind_device_success'),
            icon: 'success',
            duration: 2000
          });
        } else {
          console.warn('设备绑定响应异常', result);
          uni.showToast({
            title: this.$t('bluetooth.submit.config_ok_no_bind'),
            icon: 'success',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('设备绑定失败:', error);
        uni.hideLoading();

        // 即使绑定失败，配网已成功，给用户提示
        uni.showToast({
          title: this.$t('bluetooth.submit.config_success_bind_failed'),
          icon: 'none',
          duration: 3000
        });
      }
    },

    /**
     * 返回WiFi配置页面
     */
    goBackToWifiConfig() {
      bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
    }
  }
};
</script>

<style lang="scss" scoped>
.submit-config {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 200rpx;
  background-color: #fff;
}

/* 状态容器 */
.status-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48rpx 32rpx;
}

.status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 600rpx;
}

.status-image {
  width: 280rpx;
  height: 280rpx;
  margin-bottom: 40rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.status-title.success-text {
  color: var(--color-success);
}

.status-title.error-text {
  color: #1f2937;
}

.status-desc {
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 连接动画 */
.connecting-animation {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid var(--color-primary);
  animation: pulse 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

@keyframes pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.waiting-time {
  font-size: 56rpx;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 24rpx;
  font-variant-numeric: tabular-nums;
}

/* 成功图标 */
.success-icon-wrapper {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%);
  box-shadow: 0 16rpx 48rpx rgba(16, 185, 129, 0.3);
  margin-bottom: 40rpx;
}

/* 信息卡片 */
.info-card {
  width: 100%;
  background-color: #f9fafb;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-top: 40rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid #e5e7eb;
  }
}

.info-label {
  font-size: 26rpx;
  color: #6b7280;
}

.info-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}

/* 警告卡片 */
.warning-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  padding: 24rpx;
  background-color: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 16rpx;
  margin-top: 32rpx;
  font-size: 26rpx;
  color: #92400e;
  text-align: left;
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

.action-hint {
  text-align: center;
  font-size: 28rpx;
  color: #6b7280;
  padding: 28rpx 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
  }
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary) 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx var(--color-primary-alpha-25);
}

.action-btn.success {
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(16, 185, 129, 0.3);
}
</style>
