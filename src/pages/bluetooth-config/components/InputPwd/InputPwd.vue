<template>
  <view class="input-pwd">
    <!-- 步骤标题 -->
    <view class="step-title">当前步骤：输入WiFi密码</view>

    <!-- 选中的WiFi信息 -->
    <view v-if="selectedWifi" class="selected-wifi">
      <view class="wifi-header">
        <view class="wifi-icon">📶</view>
        <view class="wifi-info">
          <view class="wifi-name">{{ selectedWifi.SSID }}</view>
          <view class="wifi-security">🔒 加密网络</view>
        </view>
        <view class="wifi-signal">
          <WifiSignal :strength="selectedWifi.signalStrength" />
        </view>
      </view>
    </view>

    <!-- 密码输入 -->
    <view class="password-section">
      <view class="input-label">WiFi密码</view>
      <view class="input-container">
        <input
          v-model="password"
          class="password-input"
          :type="isPasswordVisible ? 'text' : 'password'"
          placeholder="请输入WiFi密码"
          :maxlength="64"
          @input="handlePasswordInput" />
        <view class="toggle-visibility" @click="togglePasswordVisibility">
          {{ isPasswordVisible ? '🙈' : '👁️' }}
        </view>
      </view>

      <!-- 密码提示 -->
      <view class="password-tips">
        <view class="tip">
          <view class="icon">💡</view>
          <text>请根据网络要求输入正确密码</text>
        </view>
        <view class="tip">
          <view class="icon">🔐</view>
          <text>请确保密码正确，避免连接失败</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="action-btn secondary" @click="goBackToSelectWifi">← 重新选择WiFi</view>

      <view class="action-btn primary" @click="confirmPassword">
        确认密码 →
      </view>
    </view>
  </view>
</template>

<script>
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import WifiSignal from '../SelectWifi/WifiSignal.vue';

export default {
  name: 'InputPwd',
  components: {
    WifiSignal
  },
  data() {
    return {
      password: '',
      isPasswordVisible: false
    };
  },
  computed: {
    selectedWifi() {
      return bluetoothConfigManager.getState().selectedWifi;
    },
    passwordState() {
      return bluetoothConfigManager.getState().passwordState;
    }
  },
  mounted() {
    console.log('InputPwd 组件加载');
    console.log('选中的WiFi:', this.selectedWifi);

    if (!this.selectedWifi) {
      console.error('没有选中的WiFi，返回WiFi选择页面');
      this.goBackToSelectWifi();
      return;
    }
    
    // 如果是开放网络，自动跳转到下一步
    if (this.selectedWifi && !this.selectedWifi.secure) {
      console.log('开放网络，无需密码，自动跳转到下一步');
      this.confirmPassword();
      return;
    }

    // 恢复之前输入的密码
    this.password = this.passwordState.password || '';
    this.isPasswordVisible = this.passwordState.isVisible || false;
  },
  methods: {
    /**
     * 处理密码输入
     */
    handlePasswordInput() {
      // 实时更新密码状态
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });
    },

    /**
     * 切换密码可见性
     */
    togglePasswordVisibility() {
      this.isPasswordVisible = !this.isPasswordVisible;

      // 更新密码状态
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });
    },

    /**
     * 确认密码
     */
    async confirmPassword() {
      console.log('确认密码:', this.password);

      // 更新密码状态
      bluetoothConfigManager.setPasswordState({
        password: this.password,
        isVisible: this.isPasswordVisible
      });

      try {
        // 显示加载状态
        uni.showLoading({
          title: '正在配置WiFi...',
          mask: true
        });

        // 获取当前状态
        const state = bluetoothConfigManager.getState();
        const selectedDevice = state.selectedDevice;
        const selectedWifi = state.selectedWifi;

        if (!selectedDevice || !selectedWifi) {
          throw new Error('缺少必要的配置信息');
        }

        // 通过蓝牙发送WiFi配置
        await configProtocol.sendWifiConfig(
          selectedDevice.deviceId,
          selectedWifi.SSID,
          this.password
        );

        console.log('WiFi配置发送成功');

        // 进入提交配置步骤
        bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SUBMIT_CONFIG);
      } catch (error) {
        console.error('WiFi配置发送失败:', error);
        uni.showToast({
          title: error.message || 'WiFi配置失败',
          icon: 'none',
          duration: 3000
        });
      } finally {
        uni.hideLoading();
      }
    },

    /**
     * 返回WiFi选择页面
     */
    goBackToSelectWifi() {
      bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
    }
  }
};
</script>

<style lang="scss" scoped>
.input-pwd {
  padding: 32rpx;
}

.step-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 32rpx;
  text-align: center;
}

.selected-wifi {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 2rpx solid #f0f0f0;
}

.wifi-header {
  display: flex;
  align-items: center;
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

.password-section {
  margin-bottom: 48rpx;
}

.input-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  border: 2rpx solid #e5e5e5;
  overflow: hidden;
  transition: border-color 0.3s ease;

  &:focus-within {
    border-color: #667eea;
  }
}

.password-input {
  flex: 1;
  padding: 24rpx;
  font-size: 32rpx;
  color: #333;
  background-color: transparent;
  border: none;
  outline: none;

  &::placeholder {
    color: #999;
  }
}

.toggle-visibility {
  padding: 24rpx;
  font-size: 32rpx;
  color: #666;
  cursor: pointer;
  flex-shrink: 0;

  &:active {
    color: #333;
  }
}

.password-tips {
  margin-top: 24rpx;
  background-color: #f8f9ff;
  border-radius: 16rpx;
  padding: 24rpx;
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

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);

  &:active {
    box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
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
  .input-pwd {
    padding: 24rpx;
  }

  .step-title {
    font-size: 30rpx;
    margin-bottom: 24rpx;
  }

  .selected-wifi {
    padding: 20rpx;
    margin-bottom: 24rpx;
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

  .password-section {
    margin-bottom: 36rpx;
  }

  .input-label {
    font-size: 26rpx;
  }

  .password-input {
    padding: 20rpx;
    font-size: 30rpx;
  }

  .toggle-visibility {
    padding: 20rpx;
    font-size: 30rpx;
  }

  .password-tips {
    padding: 20rpx;
  }

  .tip text {
    font-size: 26rpx;
  }

  .action-btn {
    padding: 20rpx 40rpx;
    font-size: 30rpx;
  }
}
</style>
