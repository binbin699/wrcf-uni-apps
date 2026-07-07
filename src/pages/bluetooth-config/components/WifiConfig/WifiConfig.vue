<template>
  <view class="wifi-config">
    <!-- 加载/空状态 -->
    <view v-if="isLoadingWifi && wifiList.length === 0" class="empty-container">
      <view class="empty-content">
        <image class="empty-image" src="/static/icons/wifi-scan.svg" mode="aspectFit" />
        <text class="empty-text">{{ $t('bluetooth.wifi.scanning') }}</text>
      </view>
    </view>

    <!-- 空列表状态：扫描失败 -->
    <view v-else-if="!isLoadingWifi && wifiList.length === 0" class="scan-failed-container">
      <view class="scan-failed-content">
        <image class="scan-failed-icon" src="/static/icons/config-failed.svg" mode="aspectFit" />
        <view class="scan-failed-text">
          <text class="scan-failed-title">{{ $t('bluetooth.wifi.scan_failed_title') }}</text>
          <text class="scan-failed-desc">{{ $t('bluetooth.wifi.scan_failed_desc') }}</text>
        </view>
      </view>
    </view>

    <!-- WiFi列表 -->
    <view v-else class="wifi-list-container">
      <scroll-view scroll-y class="wifi-scroll-list" :style="{ maxHeight: scrollHeight }">
        <view class="wifi-list-inner">
          <view
            v-for="wifi in wifiList"
            :key="wifi.SSID"
            class="wifi-card"
            :class="{ selected: selectedWifi && selectedWifi.SSID === wifi.SSID }"
            @click="handleSelectWifi(wifi)">
            <view class="wifi-content">
              <view class="wifi-icon">
                <wd-icon
                  name="wifi"
                  size="48rpx"
                  :color="
                    selectedWifi && selectedWifi.SSID === wifi.SSID ? '#FFFFFF' : '#9ca3af'
                  " />
              </view>
              <view class="wifi-info">
                <text class="wifi-name">{{ wifi.SSID }}</text>
                <view v-if="wifi.secure" class="wifi-lock">
                  <image
                    :src="
                      selectedWifi && selectedWifi.SSID === wifi.SSID
                        ? '/static/icons/wifi-lock-selected.svg'
                        : '/static/icons/wifi-lock.svg'
                    "
                    mode="aspectFit"
                    class="wifi-lock-icon" />
                </view>
              </view>
            </view>
            <view class="wifi-arrow">
              <image
                :src="
                  selectedWifi && selectedWifi.SSID === wifi.SSID
                    ? '/static/icons/wifi-arrow-selected.svg'
                    : '/static/icons/wifi-arrow.svg'
                "
                mode="aspectFit"
                class="wifi-arrow-icon" />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部按钮区域（双按钮垂直排列） -->
    <view class="bottom-action-wrapper">
      <view class="gradient-fade"></view>
      <view class="bottom-action-container">
        <button
          v-if="props.showSkipConfig"
          class="secondary-btn skip-btn"
          @click="emitSkipConfig">
          <text>{{ $t('common.skip_config') }}</text>
        </button>

        <!-- 上方：重新扫描按钮（蓝色） -->
        <button
          class="primary-btn blue-btn"
          :class="{ disabled: isLoadingWifi }"
          :disabled="isLoadingWifi"
          @click="startWifiScan">
          <text>{{ $t('bluetooth.wifi.scan_retry') }}</text>
        </button>

        <!-- 下方：手动配置按钮（绿色） -->
        <button class="primary-btn green-btn" @click="goToManualConfig">
          <text>{{ $t('bluetooth.wifi.manual_config') }}</text>
        </button>
      </view>
    </view>

    <!-- 密码输入弹窗 -->
    <view v-if="showPasswordModal" class="password-modal-overlay">
      <!-- 遮罩层，点击关闭弹窗 -->
      <view class="password-modal-mask" @click="closePasswordModal"></view>
      <view class="password-modal">
        <view class="modal-title">{{ pendingWifi && pendingWifi.SSID }}</view>
        <view class="modal-content">
          <view class="modal-input-wrapper" @click="focusPasswordInput">
            <input
              v-model="password"
              class="modal-input"
              :type="isPasswordVisible ? 'text' : 'password'"
              :placeholder="$t('bluetooth.wifi.password_placeholder')"
              :maxlength="64"
              :focus="passwordInputFocus"
              :adjust-position="true"
              :cursor-spacing="120"
              confirm-type="done"
              @confirm="confirmPassword" />
            <view class="toggle-visibility" @click.stop="togglePasswordVisibility">
              <image
                :src="isPasswordVisible ? '/static/icons/eye-on.svg' : '/static/icons/eye-off.svg'"
                mode="aspectFit"
                class="eye-icon" />
            </view>
          </view>
          <button class="modal-confirm-btn" @click="confirmPassword">
            {{ $t('common.confirm') }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { bluetoothConfigManager, CONFIG_STEPS } from '../../store/bluetoothConfigStore';
import { configProtocol } from '../../utils/configProtocol';
import * as native from '../../utils/native';
import {
  WIFI_CONFIG_ERROR,
  validateWifiCredentials,
  ensureBLEConnection,
  sendWifiConfig,
  getWifiSendErrorMessage
} from '../../utils/wifiConfigHelper';

/** WiFi 项类型 */
interface WifiItem {
  SSID: string;
  secure: boolean;
  signalStrength: number;
}

const { t: $t } = useI18n();
const props = withDefaults(
  defineProps<{
    showSkipConfig?: boolean;
  }>(),
  {
    showSkipConfig: false
  }
);
const emit = defineEmits<{
  (e: 'skipConfig'): void;
}>();

// 响应式状态
const isLoadingWifi = ref(false);
const wifiList = ref<WifiItem[]>([]);
const selectedWifi = ref<WifiItem | null>(null);
const password = ref('');
const isPasswordVisible = ref(false);
const scrollHeight = ref('600rpx');

// 密码弹窗
const showPasswordModal = ref(false);
const passwordInputFocus = ref(false); // 控制密码输入框聚焦（iOS 需要延迟聚焦）
const pendingWifi = ref<WifiItem | null>(null);

// 方法
function calculateScrollHeight() {
  const systemInfo = uni.getSystemInfoSync();
  const rpxToPx = systemInfo.windowWidth / 750;

  const statusBarHeight = systemInfo.statusBarHeight || 44;
  const navContentHeight = 88 * rpxToPx;
  const topAreaHeight = statusBarHeight + navContentHeight;

  const bottomBtnRpx = 16 + 96 + 24 + 96 + 32; // 264rpx → reduced top padding from 32 to 16
  const safeAreaBottom = systemInfo.safeAreaInsets ? systemInfo.safeAreaInsets.bottom : 0;
  const bottomAreaHeight = bottomBtnRpx * rpxToPx + safeAreaBottom;

  const listPaddingHeight = 24 * 2 * rpxToPx;

  const availableHeight =
    systemInfo.windowHeight - topAreaHeight - bottomAreaHeight - listPaddingHeight;
  scrollHeight.value = Math.max(200, Math.floor(availableHeight)) + 'px';
}

async function startWifiScan() {
  isLoadingWifi.value = true;
  uni.hideLoading();

  const state = bluetoothConfigManager.getState();
  const selectedDevice = state.selectedDevice;

  if (!selectedDevice?.deviceId) {
    native.toast($t('bluetooth.wifi.not_connected'));
    isLoadingWifi.value = false;
    return;
  }

  const initResult = await native.safeAsync(() => configProtocol.init(selectedDevice.deviceId));
  if (!initResult.ok) {
    console.error('[WifiConfig] 协议初始化失败:', initResult.errMsg);
    native.toast($t('bluetooth.wifi.init_failed'));
    isLoadingWifi.value = false;
    return;
  }

  console.log('[WifiConfig] 开始扫描WiFi网络');
  const result = await native.safeAsync(() => configProtocol.getWifiList(selectedDevice.deviceId));

  if (!result.ok) {
    console.error('[WifiConfig] WiFi扫描失败:', result.errMsg);
    uni.hideLoading();
    uni.hideToast();
    configProtocol.reset();
    native.toast($t('bluetooth.wifi.scan_failed'));
    isLoadingWifi.value = false;
    return;
  }

  wifiList.value = result.data!.map((wifi: WifiItem) => ({
    ...wifi,
    signalStrength: Math.floor((wifi.signalStrength / 100) * 4)
  }));

  console.log('[WifiConfig] WiFi扫描完成:', wifiList.value);

  if (wifiList.value.length === 0) {
    native.toast($t('bluetooth.wifi.no_networks'), 2000);
  }

  isLoadingWifi.value = false;
}

function handleSelectWifi(wifi: WifiItem) {
  console.log('[WifiConfig] 选择WiFi:', wifi);

  selectedWifi.value = wifi;

  if (wifi.secure) {
    pendingWifi.value = wifi;
    password.value = '';
    passwordInputFocus.value = false;
    showPasswordModal.value = true;

    // iOS 上不自动聚焦，让用户点击输入框来触发键盘
    const systemInfo = uni.getSystemInfoSync();
    if (systemInfo.platform !== 'ios') {
      nextTick(() => {
        setTimeout(() => {
          passwordInputFocus.value = true;
        }, 300);
      });
    }
  } else {
    // 开放网络，无需密码，直接配网
    password.value = '';
    bluetoothConfigManager.setSelectedWifi(wifi);
    handleConnect();
  }
}

/** 点击输入框区域时手动聚焦（iOS 需要用户主动点击） */
function focusPasswordInput() {
  passwordInputFocus.value = false;
  setTimeout(() => {
    passwordInputFocus.value = true;
  }, 50);
}

function closePasswordModal() {
  showPasswordModal.value = false;
  passwordInputFocus.value = false;
  pendingWifi.value = null;
  selectedWifi.value = null;
}

function confirmPassword() {
  selectedWifi.value = pendingWifi.value;
  bluetoothConfigManager.setSelectedWifi(selectedWifi.value);
  bluetoothConfigManager.setPasswordState({
    password: password.value,
    isVisible: isPasswordVisible.value
  });
  showPasswordModal.value = false;
  passwordInputFocus.value = false;
  // 确认密码后直接进入配网
  handleConnect();
}

function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value;
  nextTick(() => {
    passwordInputFocus.value = false;
    setTimeout(() => {
      passwordInputFocus.value = true;
    }, 100);
  });
}

/** 跳转到手动配置页面 */
function goToManualConfig() {
  bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.MANUAL_CONFIG);
}

function emitSkipConfig() {
  emit('skipConfig');
}

async function handleConnect() {
  if (!selectedWifi.value) {
    native.toast($t('bluetooth.wifi.please_select'), 2000);
    return;
  }

  native.showLoading($t('bluetooth.wifi.configuring'));

  const state = bluetoothConfigManager.getState();
  const selectedDevice = state.selectedDevice;

  if (!selectedWifi.value || !selectedDevice?.deviceId) {
    native.hideLoading();
    native.toast($t('bluetooth.connection_lost'));
    return;
  }

  const ssid = selectedWifi.value.SSID;
  const wifiPassword = password.value;

  // 保存密码状态
  bluetoothConfigManager.setPasswordState({
    password: password.value,
    isVisible: isPasswordVisible.value
  });

  // 1. WiFi 凭据校验
  const validation = validateWifiCredentials(ssid, wifiPassword, $t);
  if (!validation.valid) {
    native.hideLoading();
    native.toast(validation.message!);
    return;
  }

  // 2. 检查 BLE 连接（断开时自动重连）
  const bleResult = await ensureBLEConnection(selectedDevice.deviceId);
  if (!bleResult.ok) {
    native.hideLoading();
    native.toast(
      bleResult.errCode === WIFI_CONFIG_ERROR.BLE_RECONNECT_TIMEOUT
        ? $t('bluetooth.reconnect_timeout')
        : $t('bluetooth.connection_lost')
    );
    return;
  }

  // 仅在蓝牙重连后才需要重置序列号和重新初始化协议
  if (bleResult.didReconnect) {
    bluetoothConfigManager.resetSequence();
    const initResult = await native.safeAsync(() => configProtocol.init(selectedDevice.deviceId));
    if (!initResult.ok) {
      native.hideLoading();
      native.toast($t('bluetooth.init_failed'));
      return;
    }
  }

  // 3. 发送 WiFi 配置
  const sendResult = await sendWifiConfig(selectedDevice.deviceId, ssid, wifiPassword);
  native.hideLoading();

  if (!sendResult.ok) {
    native.toast(getWifiSendErrorMessage(sendResult, $t));
    return;
  }

  console.log('[WifiConfig] WiFi配置发送成功');
  bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SUBMIT_CONFIG);
}

// 生命周期
onMounted(async () => {
  console.log('[WifiConfig] 组件加载');

  calculateScrollHeight();

  // 恢复之前的状态
  const state = bluetoothConfigManager.getState();
  selectedWifi.value = state.selectedWifi;
  if (state.passwordState) {
    password.value = state.passwordState.password || '';
    isPasswordVisible.value = state.passwordState.isVisible || false;
  }

  const selectedDevice = state.selectedDevice;
  if (!selectedDevice?.deviceId) {
    native.toast($t('bluetooth.wifi.not_connected'), 2000);
    return;
  }

  // 初始化配网协议
  isLoadingWifi.value = true;
  const initResult = await native.safeAsync(() => configProtocol.init(selectedDevice.deviceId));
  if (!initResult.ok) {
    isLoadingWifi.value = false;
    native.toast($t('bluetooth.wifi.init_failed'), 2000);
    return;
  }

  await startWifiScan();
});
</script>

<style lang="scss" scoped>
.wifi-config {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(240rpx + env(safe-area-inset-bottom));
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

/* 扫描失败容器 */
.scan-failed-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  background-color: #fff;
}

.scan-failed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  width: 716rpx;
}

.scan-failed-icon {
  width: 240rpx;
  height: 240rpx;
}

.scan-failed-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 100%;
}

.scan-failed-title {
  font-weight: 500;
  font-size: 36rpx;
  line-height: 48rpx;
  text-align: center;
  color: #0e121b;
}

.scan-failed-desc {
  font-weight: 400;
  font-size: 28rpx;
  line-height: 40rpx;
  text-align: center;
  color: #717784;
}

/* WiFi列表 */
.wifi-list-container {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.wifi-list-inner {
  padding: 24rpx 32rpx;
}

.wifi-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  gap: 32rpx;
  width: 100%;
  height: 120rpx;
  margin: 0 auto 24rpx;
  background-color: #fff;
  border: 2rpx solid #f3f4f6;
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
  transition: all 0.2s;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    transform: scale(0.99);
  }

  &.selected {
    background: var(--color-primary);
    border: 2rpx solid rgba(255, 255, 255, 0.8);
    box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);

    .wifi-name {
      color: #fff;
    }
  }
}

.wifi-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0;
  gap: 24rpx;
  margin: 0 auto;
  flex: 1;
  min-width: 0;
}

.wifi-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wifi-info {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.wifi-name {
  font-style: normal;
  font-weight: 600;
  font-size: 36rpx;
  line-height: 56rpx;
  color: #1f2937;

  display: flex;
  align-items: center;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.wifi-lock {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wifi-lock-icon {
  width: 32rpx;
  height: 32rpx;
}

.wifi-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wifi-arrow-icon {
  width: 48rpx;
  height: 48rpx;
}

/* 底部按钮区域 */
.bottom-action-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
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

.bottom-action-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 16rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  gap: 24rpx;
}

.secondary-btn,
.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
  border: none;
  transition: all 0.2s;

  &:active {
    opacity: 0.9;
  }

  &.disabled {
    opacity: 0.6;
  }
}

.blue-btn {
  background: var(--color-primary);
}

.skip-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.green-btn {
  background: #48cb6f;
}

/* 密码弹窗 */
.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.password-modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
}

.password-modal {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx;
  gap: 20rpx;

  width: 686rpx;
  margin: 0 32rpx;
  background: #ffffff;
  border-radius: 48rpx;
}

.modal-title {
  width: 100%;
  height: 56rpx;

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

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  gap: 48rpx;
  width: 100%;
}

.modal-input-wrapper {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  gap: 16rpx;

  width: 100%;
  height: 96rpx;

  background: #ffffff;
  border: 2rpx solid var(--color-primary-border);
  border-radius: 24rpx;
  /* 确保可以接收点击事件 */
  pointer-events: auto;
}

.modal-input {
  flex: 1;
  height: 44rpx;
  font-style: normal;
  font-weight: 400;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #0e121b;
  background-color: transparent;
  border: none;
  /* iOS 确保输入框可交互 */
  pointer-events: auto;
  -webkit-user-select: text;
  user-select: text;

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

.modal-confirm-btn {
  min-width: 346rpx;
  height: 88rpx;
  padding: 0 48rpx;
  background: var(--color-primary);
  border-radius: 24rpx;

  font-style: normal;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 88rpx;

  text-align: center;

  color: #ffffff;
  border: none;
  flex-shrink: 0;

  &:active {
    opacity: 0.9;
  }
}
</style>
