<template>
  <view class="submit-config">
    <!-- 配网进行中状态 -->
    <view v-if="isSubmitting" class="status-section connecting">
      <view class="status-icon-wrapper">
        <view class="connecting-animation">
          <view class="pulse-ring"></view>
          <view class="pulse-ring delay-1"></view>
          <view class="pulse-ring delay-2"></view>
          <wd-icon name="wifi" size="64rpx" color="#3b82f6" />
        </view>
      </view>
      <view class="status-title">{{ $t('bluetooth.submit.title') }}</view>
      <view class="status-desc">{{ $t('bluetooth.submit.waiting') }}</view>
      <view class="waiting-time">{{ waitingTime }}s</view>
      
      <!-- 进度停滞提示 -->
      <view v-if="showStuckWarning" class="warning-card">
        <wd-icon name="warning" size="36rpx" color="#f59e0b" />
        <text>{{ $t('bluetooth.submit.stuck_warning') || '配网进度较慢，请检查WiFi密码和网络状态' }}</text>
      </view>
    </view>

    <!-- 配网成功状态 -->
    <view v-else-if="isConfigSuccess" class="status-section success">
      <view class="status-icon-wrapper success-icon">
        <wd-icon name="check" size="80rpx" color="#fff" />
      </view>
      <view class="status-title">{{ $t('bluetooth.submit.success_title') }}</view>
      <view class="status-desc">{{ $t('bluetooth.submit.success_desc') }}</view>
      
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

    <!-- 配网失败状态 -->
    <view v-else-if="configError" class="status-section error">
      <view class="status-icon-wrapper error-icon">
        <wd-icon name="close" size="80rpx" color="#fff" />
      </view>
      <view class="status-title">{{ $t('bluetooth.submit.failed_title') }}</view>
      <view class="status-desc error-message">{{ configError }}</view>

      <!-- WiFi密码错误提示 -->
      <view v-if="isWifiPasswordError" class="hint-card">
        <view class="hint-title">
          <wd-icon name="info-outline" size="32rpx" color="#3b82f6" />
          <text>{{ $t('common.tip') }}</text>
        </view>
        <view class="hint-list">
          <text class="hint-item">• 检查WiFi密码是否正确</text>
          <text class="hint-item">• 确认WiFi网络是否正常工作</text>
          <text class="hint-item">• 尝试重新输入WiFi密码</text>
        </view>
      </view>
    </view>

    <!-- 准备提交状态 -->
    <view v-else class="status-section ready">
      <view class="status-icon-wrapper ready-icon">
        <wd-icon name="wifi" size="64rpx" color="#3b82f6" />
      </view>
      <view class="status-title">{{ $t('bluetooth.submit.title') || '准备配网' }}</view>
      <view class="status-desc">{{ $t('bluetooth.submit.ready_desc') || '确认信息无误后，开始配网' }}</view>
      
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

    <!-- 底部操作按钮 -->
    <view class="bottom-action">
      <!-- 配网中 -->
      <view v-if="isSubmitting" class="action-hint">
        <text>{{ $t('common.loading') }}</text>
      </view>

      <!-- 成功状态 -->
      <button v-else-if="isConfigSuccess" class="action-btn success" @click="finishConfig">
        <wd-icon name="check" size="36rpx" color="#fff" />
        <text>{{ $t('bluetooth.submit.finish') }}</text>
      </button>

      <!-- 失败状态 -->
      <view v-else-if="configError" class="action-group">
        <button class="action-btn secondary" @click="goBackToWifiConfig">
          <text>{{ $t('bluetooth.submit.modify_config') }}</text>
        </button>
        <button class="action-btn primary" @click="retryConfigSubmission">
          <wd-icon name="refresh" size="32rpx" color="#fff" />
          <text>{{ $t('bluetooth.submit.retry') }}</text>
        </button>
      </view>

      <!-- 准备状态 -->
      <button v-else class="action-btn primary" @click="startConfigSubmission">
        <wd-icon name="wifi" size="36rpx" color="#fff" />
        <text>{{ $t('bluetooth.wifi.connect') || '开始配网' }}</text>
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
      waitingTimer: null
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
      if (!this.selectedDevice) return '未知设备';
      return this.selectedDevice.name || this.selectedDevice.deviceId || '未知设备';
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
        title: '配网信息不完整',
        icon: 'none',
        duration: 2000
      });
      this.goBackToInputPwd();
      return;
    }

    // 自动开始配网提交
    this.$nextTick(() => {
      this.startConfigSubmission();
    });
  },
  methods: {
    /**
     * 切换密码可见性
     */
    togglePasswordVisibility() {
      bluetoothConfigManager.setPasswordState({
        ...this.passwordState,
        isVisible: !this.passwordState.isVisible
      });
    },

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
      }, 1000);

      try {
        console.log('开始提交配网配置');

        // 获取当前状态
        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;

        if (!selectedDevice || !selectedDevice.deviceId) {
          throw new Error('未找到已连接的蓝牙设备');
        }

        console.log('开始监听配网结果...');

        // 监听配网结果
        const configResult = await configProtocol.waitForConfigResult(selectedDevice.deviceId);

        if (configResult.success) {
          console.log('配网成功', configResult);
          this.isConfigSuccess = true;

          await this.registerDevice();

          uni.showToast({
            title: '配网成功',
            icon: 'success',
            duration: 2000
          });
        } else {
          throw new Error(configResult.error || '配网失败');
        }
      } catch (error) {
        console.error('配网失败:', error);

        // 根据错误类型提供更具体的提示
        let errorMessage = '配网失败，请重试';
        let toastTitle = '配网失败';

        if (error.message && error.message.includes('超时')) {
          // 检查是否可能是WiFi密码错误
          if (this.wifiConnectionStuck) {
            errorMessage = 'WiFi连接超时，请检查WiFi密码是否正确';
            toastTitle = 'WiFi密码可能错误';
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.configError = errorMessage;

        uni.showToast({
          title: toastTitle,
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

      // 返回上一页
      setTimeout(() => {
        uni.navigateBack();
      }, 2000);
    },

    /**
     * 注册设备到用户账号
     */
    async registerDevice() {
      console.log('注册设备', this.selectedDevice);

      try {
        // 绑定设备到用户账号
        const timestamp = new Date().toISOString();
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
          title: '绑定设备中...',
          mask: true
        });

        const result = await deviceApi.add(deviceData);

        uni.hideLoading();

        if (result && result.code === 1000) {
          console.log('设备绑定成功', result);
          uni.showToast({
            title: '设备绑定成功',
            icon: 'success',
            duration: 2000
          });
        } else {
          console.warn('设备绑定响应异常', result);
          uni.showToast({
            title: '设备已配网成功',
            icon: 'success',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('设备绑定失败:', error);
        uni.hideLoading();

        // 即使绑定失败，配网已成功，给用户提示
        uni.showToast({
          title: '配网成功，设备绑定失败',
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
  padding: 24rpx;
  padding-bottom: 200rpx;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 状态区域 */
.status-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  text-align: center;
}

.status-icon-wrapper {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: 40rpx;
  position: relative;
}

.ready-icon {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.success-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 8rpx 32rpx rgba(16, 185, 129, 0.3);
}

.error-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 8rpx 32rpx rgba(239, 68, 68, 0.3);
}

/* 连接动画 */
.connecting-animation {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid #3b82f6;
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
    transform: scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.status-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.status-desc {
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.5;
  max-width: 500rpx;
}

.error-message {
  color: #ef4444;
}

.waiting-time {
  font-size: 48rpx;
  font-weight: 600;
  color: #3b82f6;
  margin-top: 32rpx;
  font-variant-numeric: tabular-nums;
}

/* 信息卡片 */
.info-card {
  width: 100%;
  max-width: 600rpx;
  background-color: #f9fafb;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
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
  max-width: 600rpx;
  padding: 24rpx;
  background-color: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 16rpx;
  margin-top: 32rpx;
  font-size: 26rpx;
  color: #92400e;
  text-align: left;
}

/* 提示卡片 */
.hint-card {
  width: 100%;
  max-width: 600rpx;
  padding: 28rpx;
  background-color: #eff6ff;
  border: 1rpx solid #bfdbfe;
  border-radius: 16rpx;
  margin-top: 32rpx;
  text-align: left;
}

.hint-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 16rpx;
}

.hint-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.hint-item {
  font-size: 26rpx;
  color: #1e40af;
  line-height: 1.5;
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

.action-hint {
  text-align: center;
  font-size: 28rpx;
  color: #6b7280;
  padding: 28rpx 0;
}

.action-group {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  flex: 1;
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
  background: linear-gradient(135deg, #3b82f6 0%, #335CFF 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
}

.action-btn.secondary {
  background-color: #f3f4f6;
  color: #4b5563;
}

.action-btn.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(16, 185, 129, 0.3);
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .submit-config {
    padding: 20rpx;
    padding-bottom: 180rpx;
  }

  .status-section {
    padding: 40rpx 24rpx;
  }

  .status-icon-wrapper {
    width: 140rpx;
    height: 140rpx;
    margin-bottom: 32rpx;
  }

  .connecting-animation {
    width: 140rpx;
    height: 140rpx;
  }

  .status-title {
    font-size: 36rpx;
  }

  .status-desc {
    font-size: 26rpx;
  }

  .waiting-time {
    font-size: 44rpx;
  }

  .info-card {
    padding: 24rpx 28rpx;
  }

  .info-label,
  .info-value {
    font-size: 26rpx;
  }

  .bottom-action {
    padding: 20rpx 24rpx;
  }

  .action-btn {
    height: 88rpx;
    font-size: 30rpx;
  }
}
</style>
