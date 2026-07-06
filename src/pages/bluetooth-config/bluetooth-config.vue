<template>
  <wd-toast />
  <wd-notify />
  <view class="bluetooth-config">
    <!-- 重新开始提示遮罩 -->
    <view v-if="isRestarting" class="restart-overlay">
      <view class="restart-content">
        <view class="restart-spinner"></view>
        <view class="restart-title">{{ $t('bluetooth.restarting') }}</view>
        <view class="restart-reason">{{ state.restartReason }}</view>
      </view>
    </view>

    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight * 2 + 'rpx' }"></view>
      <view class="nav-content">
        <view class="nav-left">
          <view class="nav-back" @click="handleBack">
            <wd-icon name="arrow-left" size="44rpx" color="#000000" />
          </view>
        </view>
        <text class="nav-title">
          {{ state.configOnly ? $t('bluetooth.wifi_config_title') : $t('bluetooth.title') }}
        </text>
        <view class="nav-right">
          <!-- #ifndef MP-WEIXIN -->
          <!-- 非小程序平台显示刷新按钮，避免与小程序原生按钮重叠 -->
          <view class="nav-restart" @click="handleRestart">
            <wd-icon name="refresh" size="36rpx" color="#6b7280" />
          </view>
          <!-- #endif -->
        </view>
      </view>
    </view>

    <!-- 步骤内容 -->
    <view class="step-content">
      <!-- 选择设备步骤 -->
      <SelectDevice v-if="state.currentStep === CONFIG_STEPS.SELECT_DEVICE" />

      <!-- 选择WiFi + 输入密码步骤（合并） -->
      <WifiConfig
        v-if="state.currentStep === CONFIG_STEPS.SELECT_WIFI"
        :show-skip-config="showSkipConfig"
        @skip-config="handleSkipConfig" />

      <!-- 手动配置步骤 -->
      <ManualConfig v-if="state.currentStep === CONFIG_STEPS.MANUAL_CONFIG" />

      <!-- 提交配置步骤 -->
      <SubmitConfig v-if="state.currentStep === CONFIG_STEPS.SUBMIT_CONFIG" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, provide } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onUnload, onBackPress } from '@dcloudio/uni-app';
import { useNotify, useToast } from '@/uni_modules/wot-design-uni';
// @ts-ignore
import bluetoothConfigManager, { CONFIG_STEPS } from './store/bluetoothConfigStore';
// @ts-ignore
import { configProtocol } from './utils/configProtocol';
import SelectDevice from './components/SelectDevice/SelectDevice.vue';
import WifiConfig from './components/WifiConfig/WifiConfig.vue';
import ManualConfig from './components/ManualConfig/ManualConfig.vue';
import SubmitConfig from './components/SubmitConfig/SubmitConfig.vue';
import { PageMap, Pages } from '@/utils/route';
import { AppInfo } from '@/const';
import { bleService } from '@/services/ble';

const { t: $t } = useI18n();

// 获取 notify 函数并通过 provide 传递给子组件
const { showNotify, closeNotify } = useNotify();
const toast = useToast();
provide('notify', { show: showNotify, close: closeNotify });
provide('toast', toast);
provide('isLeavingBluetoothPage', () => isLeavingPage.value);

// 响应式数据
const manager = bluetoothConfigManager;
const isRestarting = ref(false);
const isRestartReasonTimer = ref<NodeJS.Timeout | null>(null);
const isLeavingPage = ref(false);
const leavePageGuardTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const state = ref(bluetoothConfigManager.state);
const statusBarHeight = ref(44);
const BLE_LEAVE_CLEANUP_TIMEOUT = 1200;
const LEAVE_PAGE_GUARD_TIMEOUT = 3000;
const showSkipConfig = computed(
  () =>
    !state.value.configOnly &&
    state.value.defaultAgentBind !== null &&
    state.value.currentStep !== CONFIG_STEPS.SELECT_DEVICE &&
    !state.value.configCompleted
);

// 监听器
watch(
  () => state.value.isRestarting,
  (newVal) => {
    if (newVal) {
      if (isRestartReasonTimer.value) {
        clearTimeout(isRestartReasonTimer.value);
        isRestartReasonTimer.value = null;
      }
      isRestarting.value = newVal;
    } else {
      isRestartReasonTimer.value = setTimeout(() => {
        isRestarting.value = newVal;
      }, 1500);
    }
  },
  { immediate: true }
);

// 生命周期钩子
onLoad((options) => {
  console.log('BluetoothConfig 页面加载', options);

  // 检测设备类型
  const systemInfo = uni.getSystemInfoSync();
  const useLocalName = systemInfo.platform === 'ios' || AppInfo.isHarmonyApp();
  bluetoothConfigManager.setUseLocalName(useLocalName);

  // 设置状态栏高度
  setStatusBarHeight();

  // 添加状态监听器
  bluetoothConfigManager.addStateListener(onStoreStateChange);

  // 监听蓝牙连接丢失事件
  uni.$on('connectionLost', handleConnectionLost);

  // 初始化状态
  bluetoothConfigManager.resetState();

  // 设置仅配网模式（从 URL 参数读取）
  if (options?.configOnly === '1') {
    bluetoothConfigManager.setConfigOnly(true);
    console.log('仅配网模式已启用');
  }

  state.value = bluetoothConfigManager.getState();

  console.log('初始状态:', {
    currentStep: state.value.currentStep,
    selectedDevice: state.value.selectedDevice,
    selectedWifi: state.value.selectedWifi,
    useLocalName: state.value.useLocalName
  });
});

onBackPress((event) => {
  if (event?.from === 'navigateBack') {
    return false;
  }
  return handleBack();
});

onUnload(() => {
  console.log('BluetoothConfig 页面卸载');

  if (leavePageGuardTimer.value) {
    clearTimeout(leavePageGuardTimer.value);
    leavePageGuardTimer.value = null;
  }

  // 移除状态监听器
  bluetoothConfigManager.removeStateListener(onStoreStateChange);

  // 移除事件监听器
  uni.$off('connectionLost', handleConnectionLost);

  // 重置配网协议状态
  configProtocol.reset();

  // 页面离开时重置配网状态
  bluetoothConfigManager.restartConfig($t('bluetooth.page_leave_reset'));
});

// 方法
function setStatusBarHeight() {
  const systemInfo = uni.getSystemInfoSync();
  const statusBarHeightValue = systemInfo.statusBarHeight || 44;
  // 将状态栏高度保存到ref中
  statusBarHeight.value = statusBarHeightValue;
}

function onStoreStateChange(newState: any) {
  console.log('状态变化:', newState);
  state.value = newState;
}

function withTimeout(task: Promise<unknown>, timeoutMs: number, onTimeout?: () => void) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    task,
    new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        onTimeout?.();
        resolve();
      }, timeoutMs);
    })
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

let leaveCleanupPromise: Promise<void> | null = null;

function cleanupBluetoothBeforeLeave() {
  if (!AppInfo.isApp()) {
    return Promise.resolve();
  }

  if (leaveCleanupPromise) {
    return leaveCleanupPromise;
  }

  leaveCleanupPromise = cleanupBluetooth()
    .catch((error) => {
      console.log('离开页面前清理蓝牙资源失败(可忽略):', error);
    })
    .finally(() => {
      leaveCleanupPromise = null;
    });

  return leaveCleanupPromise;
}

function clearLeavePageGuard() {
  if (leavePageGuardTimer.value) {
    clearTimeout(leavePageGuardTimer.value);
    leavePageGuardTimer.value = null;
  }
}

function resetLeavePageGuard() {
  clearLeavePageGuard();
  isLeavingPage.value = false;
}

/** 离开配网页：先导航，蓝牙清理放后台（避免 onBackPress 拦截后长时间无法返回） */
function navigateBackFromConfig() {
  const pages = getCurrentPages();
  if (pages.length <= 1) {
    uni.switchTab({ url: PageMap[Pages.Profile].url });
    return;
  }
  uni.navigateBack({
    fail: (err) => {
      console.warn('[蓝牙] navigateBack 失败，跳转 Profile:', err);
      uni.switchTab({ url: PageMap[Pages.Profile].url });
    }
  });
}

function leaveBluetoothConfig(navigate: () => void) {
  if (isLeavingPage.value) {
    console.log('[蓝牙] 正在离开页面，忽略重复返回');
    return;
  }

  isLeavingPage.value = true;
  clearLeavePageGuard();
  leavePageGuardTimer.value = setTimeout(() => {
    console.warn(`[蓝牙] 离开页面守卫超时（${LEAVE_PAGE_GUARD_TIMEOUT}ms），重置状态`);
    resetLeavePageGuard();
  }, LEAVE_PAGE_GUARD_TIMEOUT);

  try {
    navigate();
  } catch (error) {
    console.error('[蓝牙] 页面导航失败:', error);
  }

  void cleanupBluetoothBeforeLeave();
}

/**
 * 处理返回
 * @returns 是否拦截系统默认返回（步骤内回退需拦截；离开页面由 navigate 自行处理）
 */
function handleBack(): boolean {
  if (isLeavingPage.value) {
    console.log('[蓝牙] 正在离开页面，忽略重复返回');
    return true;
  }

  // 如果配网已完成，跳转到智能体广场方便用户绑定智能体
  if (state.value.configCompleted) {
    console.log('配网已完成，跳转智能体广场');
    leaveBluetoothConfig(() => {
      uni.switchTab({
        url: '/pages/square/square'
      });
    });
    return true;
  }

  if (state.value.currentStep === CONFIG_STEPS.SELECT_DEVICE) {
    // 第一步，返回上一页
    leaveBluetoothConfig(() => {
      navigateBackFromConfig();
    });
    return true;
  } else if (state.value.currentStep === CONFIG_STEPS.SELECT_WIFI) {
    // 从WiFi选择页返回设备选择页，需要断开蓝牙连接并重置状态
    console.log('从WiFi页返回设备扫描页，断开蓝牙并重置状态');

    // 断开当前蓝牙连接
    const selectedDevice = state.value.selectedDevice;
    if (selectedDevice && selectedDevice.deviceId) {
      bleService
        .disconnect(selectedDevice.deviceId)
        .then(() => {
          console.log('蓝牙连接已断开');
        })
        .catch((error) => {
          console.log('断开蓝牙连接失败(可忽略):', error);
        });
    }

    // 重置配网协议状态
    configProtocol.reset();

    // 清除选中的设备和WiFi
    bluetoothConfigManager.setSelectedDevice(null);
    bluetoothConfigManager.setSelectedWifi(null);

    // 返回上一步
    bluetoothConfigManager.prevStep();
    return true;
  } else if (state.value.currentStep === CONFIG_STEPS.MANUAL_CONFIG) {
    // 从手动配置页面返回到WiFi列表
    console.log('从手动配置页返回WiFi列表页');
    bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
    return true;
  } else if (state.value.currentStep === CONFIG_STEPS.SUBMIT_CONFIG) {
    // 从提交配置页面返回到WiFi列表（无论是从列表选择还是手动配置来的）
    console.log('从提交配置页返回WiFi列表页');
    bluetoothConfigManager.setCurrentStep(CONFIG_STEPS.SELECT_WIFI);
    return true;
  } else {
    // 其他步骤，返回上一步
    bluetoothConfigManager.prevStep();
    return true;
  }
}

function handleSkipConfig() {
  leaveBluetoothConfig(() => {
    uni.switchTab({
      url: PageMap[Pages.Square].url
    });
  });
}

/**
 * 处理重新开始
 */
function handleRestart() {
  uni.showModal({
    title: $t('bluetooth.restart_config'),
    content: $t('bluetooth.restart_confirm'),
    confirmText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    success: (res) => {
      if (res.confirm) {
        // 重置配网协议状态
        configProtocol.reset();
        bluetoothConfigManager.restartConfig($t('bluetooth.user_manual_restart'));
      }
    }
  });
}

/**
 * 处理蓝牙连接丢失
 */
function handleConnectionLost(event: any) {
  if (isLeavingPage.value) {
    console.log('[蓝牙] 页面离开中，忽略连接丢失回调');
    return;
  }

  console.log('收到蓝牙连接丢失事件:', event);
  uni.hideLoading();
  uni.hideToast();
  uni.showToast({
    title: event.message || $t('bluetooth.connection_lost'),
    icon: 'none',
    duration: 3000
  });

  // 重置配网协议状态
  configProtocol.reset();

  // 自动重新开始配网流程
  setTimeout(() => {
    if (isLeavingPage.value) {
      return;
    }
    bluetoothConfigManager.restartConfig(event.reason || $t('bluetooth.connection_disconnected'));
  }, 1000);
}

async function cleanupBluetooth() {
  try {
    await withTimeout(
      bleService.stopScan(),
      BLE_LEAVE_CLEANUP_TIMEOUT,
      () => console.log(`[蓝牙] 停止扫描超时（${BLE_LEAVE_CLEANUP_TIMEOUT}ms），后台继续清理`)
    );
  } catch (error) {
    console.log('[蓝牙] 停止扫描失败(可忽略):', error);
  }

  // Harmony 插件在页面内 close/dispose 容易阻塞主线程，与 resetBluetooth 策略保持一致
  if (AppInfo.isHarmonyApp()) {
    console.log('[蓝牙] Harmony 离开页面仅停止扫描，跳过 closeAdapter');
    return;
  }

  try {
    await withTimeout(
      bleService.closeAdapter(),
      BLE_LEAVE_CLEANUP_TIMEOUT,
      () => console.log(`[蓝牙] 关闭蓝牙适配器超时（${BLE_LEAVE_CLEANUP_TIMEOUT}ms），后台清理结束`)
    );
  } catch (error) {
    console.log('[蓝牙] 关闭蓝牙适配器失败(可忽略):', error);
  }
}
</script>

<style lang="scss" scoped>
.bluetooth-config {
  min-height: 100vh;
  background-color: #fff;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 重新开始遮罩 */
.restart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.restart-content {
  background-color: white;
  border-radius: 24rpx;
  padding: 64rpx 48rpx;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  min-width: 480rpx;
}

.restart-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #e5e7eb;
  border-top: 6rpx solid var(--color-primary);
  border-radius: 50%;
  margin: 0 auto 32rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.restart-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.restart-reason {
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.4;
}

/* 自定义导航栏样式 */
.custom-navbar {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #fff;
  flex-shrink: 0;
}

.nav-content {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  position: relative;
}

.nav-left,
.nav-right {
  min-width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-right {
  justify-content: flex-end;
  gap: 12rpx;
}

.nav-skip-btn {
  height: 56rpx;
  padding: 0 20rpx;
  line-height: 56rpx;
  border: none;
  border-radius: 999rpx;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 24rpx;
  font-weight: 500;

  &::after {
    border: none;
  }
}

.nav-back,
.nav-restart {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:active {
    background-color: #f3f4f6;
  }
}

.nav-title {
  font-size: 36rpx;
  font-weight: normal;
  color: #000000;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-content {
  flex: 1;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .nav-content {
    height: 80rpx;
    padding: 0 24rpx;
  }

  .nav-title {
    font-size: 32rpx;
  }
}
</style>
