<template>
  <view class="manual-config">
    <!-- 手动配置卡片 -->
    <view class="config-card">
      <view class="card-title">{{ $t('bluetooth.wifi.manual_input_title') }}</view>

      <view class="form-container">
        <!-- WiFi 名称输入框 -->
        <view class="input-group">
          <input
            class="input-field"
            type="text"
            v-model="ssid"
            :placeholder="$t('bluetooth.wifi.wifi_name')"
            confirm-type="next"
            :cursor-spacing="20" />
        </view>

        <!-- WiFi 密码输入框 -->
        <view class="input-group">
          <input
            class="input-field"
            v-model="password"
            :type="isPasswordVisible ? 'text' : 'password'"
            :placeholder="$t('bluetooth.wifi.wifi_password')"
            :maxlength="64"
            confirm-type="done"
            :cursor-spacing="20"
            @confirm="handleSubmit" />
          <view class="toggle-visibility" @click.stop="togglePasswordVisibility">
            <image
              :src="isPasswordVisible ? '/static/icons/eye-on.svg' : '/static/icons/eye-off.svg'"
              mode="aspectFit"
              class="eye-icon" />
          </view>
        </view>

        <!-- 确认按钮 -->
        <button
          class="submit-btn"
          :class="{ disabled: !canSubmit }"
          :disabled="!canSubmit"
          @click="handleSubmit">
          {{ $t('common.confirm') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import * as native from '../../utils/native';
import { BLE_ERROR_CODE } from '../../utils/native';
import {
  WIFI_CONFIG_ERROR,
  validateWifiCredentials,
  ensureBLEConnection,
  sendWifiConfig,
  getWifiSendErrorMessage,
} from '../../utils/wifiConfigHelper';

const { t: $t } = useI18n();

// 响应式状态
const ssid = ref('');
const password = ref('');
const isPasswordVisible = ref(false);
const isSubmitting = ref(false);

// 计算属性
const canSubmit = computed(() => ssid.value.trim() !== '' && !isSubmitting.value);

// 方法
function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value;
}

async function handleSubmit() {
  if (!canSubmit.value) {
    if (!ssid.value.trim()) {
      native.toast($t('bluetooth.wifi.ssid_placeholder'), 2000);
    }
    return;
  }

  isSubmitting.value = true;
  native.showLoading($t('bluetooth.wifi.configuring'));

  const state = bluetoothConfigManager.getState();
  const selectedDevice = state.selectedDevice;

  if (!selectedDevice?.deviceId) {
    native.hideLoading();
    native.toast($t('bluetooth.connection_lost'));
    isSubmitting.value = false;
    return;
  }

  // 1. 检查蓝牙适配器
  const btResult = await native.openBluetoothAdapter();
  if (!btResult.ok) {
    native.hideLoading();
    btResult.errCode === BLE_ERROR_CODE.NOT_AVAILABLE
      ? native.showBluetoothDisabledModal($t)
      : native.toast($t('bluetooth.init_failed'));
    isSubmitting.value = false;
    return;
  }

  // 2. 检查 BLE 连接（断开时自动重连）
  const bleResult = await ensureBLEConnection(selectedDevice.deviceId);
  if (!bleResult.ok) {
    native.hideLoading();
    native.toast(
      bleResult.errCode === WIFI_CONFIG_ERROR.BLE_RECONNECT_TIMEOUT
        ? $t('bluetooth.reconnect_timeout')
        : $t('bluetooth.connection_lost'),
    );
    isSubmitting.value = false;
    return;
  }

  // 仅在蓝牙重连后才需要重置序列号和重新初始化协议
  // 如果连接未断开，序列号必须保持连续，否则设备会报序列号错误(SEQUENCE_ERROR)
  if (bleResult.didReconnect) {
    bluetoothConfigManager.resetSequence();
    const initResult = await native.safeAsync(() => configProtocol.init(selectedDevice.deviceId));
    if (!initResult.ok) {
      native.hideLoading();
      native.toast($t('bluetooth.init_failed'));
      isSubmitting.value = false;
      return;
    }
  }

  // 3. WiFi 凭据校验
  const trimmedSsid = ssid.value.trim();
  const wifiPassword = password.value;
  const validation = validateWifiCredentials(trimmedSsid, wifiPassword, $t);
  if (!validation.valid) {
    native.hideLoading();
    native.toast(validation.message!);
    isSubmitting.value = false;
    return;
  }

  // 4. 保存手动配置的 WiFi 信息
  bluetoothConfigManager.setSelectedWifi({ SSID: trimmedSsid, secure: true, signalStrength: 100 });
  bluetoothConfigManager.setPasswordState({
    password: wifiPassword,
    isVisible: isPasswordVisible.value,
  });

  // 5. 发送 WiFi 配置
  const sendResult = await sendWifiConfig(selectedDevice.deviceId, trimmedSsid, wifiPassword);
  native.hideLoading();

  if (!sendResult.ok) {
    native.toast(getWifiSendErrorMessage(sendResult, $t));
    isSubmitting.value = false;
    return;
  }

  console.log('[ManualConfig] WiFi配置发送成功');
  bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SUBMIT_CONFIG);
  isSubmitting.value = false;
}
</script>

<style lang="scss" scoped>
.manual-config {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background-color: #ffffff;
}

.config-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx;
  gap: 20rpx;

  width: 716rpx;
  margin: 0 32rpx;

  background: #ffffff;
  box-shadow: 0px 0px 8rpx rgba(0, 0, 0, 0.25);
  border-radius: 48rpx;
}

.card-title {
  width: 100%;
  font-style: normal;
  font-weight: 600;
  font-size: 36rpx;
  line-height: 56rpx;
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  color: #0e121b;
}

.form-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  gap: 48rpx;
  width: 100%;
}

.input-group {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 32rpx;
  gap: 8rpx;

  width: 100%;
  height: 96rpx;

  background: #ffffff;
  border: 2rpx solid #335cff;
  border-radius: 16rpx;
}

.input-field {
  flex: 1;
  height: 44rpx;
  font-style: normal;
  font-weight: 400;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #0e121b;
  background-color: transparent;
  border: none;

  &::placeholder {
    color: #99a0ae;
  }
}

.toggle-visibility {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:active {
    opacity: 0.7;
  }
}

.eye-icon {
  width: 48rpx;
  height: 48rpx;
}

.submit-btn {
  min-width: 346rpx;
  height: 88rpx;
  padding: 0 48rpx;
  background: #335cff;
  border-radius: 16rpx;
  font-style: normal;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 88rpx;

  text-align: center;
  color: #ffffff;
  border: none;

  &:active {
    opacity: 0.9;
  }

  &.disabled {
    opacity: 0.5;
  }
}
</style>
