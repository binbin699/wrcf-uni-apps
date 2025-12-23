<template>
  <wd-toast />
  <wd-message-box />
  <wd-notify />
  <view class="net-config">
    <view class="content" v-if="deviceBound">
      <!-- WiFi配置区域 -->
      <view class="wifi-config-section" v-if="curStep === QR_CONFIG_STEP.config_wifi">
        <view class="section-header">
          <view>
            <view class="section-title">
              {{ isIOS ? $t('net_config.manual_config') : $t('net_config.wifi_list_title') }}
            </view>
          </view>
          <view class="rescan-wrapper" v-if="!isIOS">
            <view class="mini-btn" :class="{ disabled: isScanningWifi }" @click="handleRescanClick">
              {{
                isScanningWifi ? $t('net_config.wifi_scanning') : $t('net_config.wifi_scan_retry')
              }}
            </view>
          </view>
        </view>

        <!-- WiFi 扫描错误提示 -->
        <view v-if="!isIOS && wifiScanErrorInfo" class="wifi-scan-error">
          <view class="error-icon">⚠️</view>
          <view class="error-content">
            <text class="error-title">{{ wifiScanErrorInfo.title }}</text>
            <text class="error-desc">{{ wifiScanErrorInfo.desc }}</text>
          </view>
          <button
            v-if="wifiScanErrorInfo.action"
            class="error-action-btn"
            @click="handleErrorAction">
            {{ wifiScanErrorInfo.action }}
          </button>
        </view>

        <view v-if="!isIOS" class="wifi-list-container" :class="{ 'ios-compact': isIOS }">
          <view v-if="isScanningWifi" class="wifi-scan-state">
            <view class="loading-spinner"></view>
            <text class="wifi-scan-text">{{ $t('net_config.wifi_scanning') }}</text>
          </view>
          <view v-else-if="wifiList.length > 0" class="wifi-list">
            <view
              v-for="item in wifiList"
              :key="item.key"
              class="wifi-list-item"
              :class="{ selected: item.key === selectedWifiKey }"
              hover-class="wifi-list-item-hover"
              @tap="handleSelectWifi(item)">
              <view class="wifi-list-item-info">
                <text class="wifi-name">{{ item.ssid }}</text>
                <text class="wifi-security">
                  {{
                    item.secure ? $t('net_config.secure_network') : $t('net_config.open_network')
                  }}
                </text>
              </view>
              <view class="wifi-signal">
                <view
                  v-for="mark in signalLevelMarks"
                  :key="mark"
                  class="signal-bar"
                  :class="{ active: mark <= item.signalLevel }"></view>
              </view>
            </view>
          </view>
          <view v-else class="wifi-scan-state empty">
            <text class="wifi-scan-text">
              {{ wifiScanError ? wifiScanError : $t('net_config.no_wifi_found') }}
            </text>
          </view>
        </view>

        <view v-if="showManualConfig" class="manual-config">
          <view class="manual-config-actions">
            <text class="manual-config-clear" @click="clearConfig">
              {{ $t('net_config.clear_config') }}
            </text>
          </view>
          <view class="form-group">
            <view class="form-label">{{ $t('net_config.wifi_ssid') }}</view>
            <input
              class="form-input"
              type="text"
              v-model="wifiConfig.ssid"
              :placeholder="$t('net_config.wifi_ssid_placeholder')" />
          </view>

          <view class="form-group">
            <view class="form-label">{{ $t('net_config.wifi_security') }}</view>
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
            <view class="password-input-wrapper">
              <input
                class="form-input"
                type="text"
                :password="!showPassword"
                v-model="wifiConfig.password"
                :placeholder="$t('net_config.wifi_password_placeholder')" />
              <view class="password-toggle" @click="showPassword = !showPassword">
                <wd-icon :name="showPassword ? 'view' : 'eye-close'" size="20px" />
              </view>
            </view>
          </view>

          <button class="action-btn mt-20" :class="{ primary: canGenerate }" @click="handleGenQr">
            {{ $t('common.next_step') }}
          </button>
        </view>
        <button v-if="!isIOS" class="action-btn secondary mt-20" @click="toggleManualConfig">
          {{
            showManualConfig ? $t('net_config.hide_manual_config') : $t('net_config.manual_config')
          }}
        </button>
        <view class="mt-20 tips h-fit">{{ $t('net_config.generate_tip') }}</view>
      </view>

      <!-- 声波配置区域 -->
      <view class="soundwave-section" v-if="curStep === QR_CONFIG_STEP.device_config_wifi">
        <!-- 工厂测试隐藏入口 -->
        <view class="factory-test-trigger" @click="handleFactoryQrClick">
          <wd-icon name="qrcode" size="28px" />
        </view>
        <view class="section-title">{{ $t('net_config.sound_wave_config') }}</view>
        <view class="section-desc">{{ $t('net_config.sound_wave_config_desc') }}</view>

        <!-- WiFi信息显示 -->
        <view class="wifi-info mt-20">
          <view class="info-item">
            <text class="info-label">{{ $t('net_config.wifi_name') }}:</text>
            <text class="info-value">{{ wifiConfig.ssid }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">{{ $t('net_config.security_type') }}:</text>
            <text class="info-value">{{ securityOptions[securityIndex].label }}</text>
          </view>
        </view>

        <!-- 声波配网内容 -->
        <view class="soundwave-config-content">
          <!-- 音频播放器 -->
          <view class="audio-player-section mt-20">
            <view class="audio-player">
              <!-- 播放控制按钮 -->
              <view class="audio-controls">
                <wd-checkbox v-model="pageOptions.loopPlay" @change="handleLoopChange">
                  {{ $t('audio_player.loop_play') }}
                </wd-checkbox>
              </view>

              <!-- 进度条和时间同行显示 -->
              <view style="display: flex; align-items: center; gap: 12px; margin-top: 12px">
                <wd-progress
                  :percentage="progressPercent"
                  hide-text
                  color="#335CFF"
                  :duration="0"
                  style="flex: 1" />
                <text style="font-size: 12px; color: #666">{{ currentTime }}/{{ totalTime }}</text>
              </view>
            </view>
          </view>

          <wd-gap></wd-gap>
          <wd-button
            block
            @click="toggleAudioPlay"
            :icon="isPlaying ? 'stop-circle-filled' : 'play-circle-filled'">
            {{ isPlaying ? $t('audio_player.stop_play') : $t('audio_player.start_play') }}
          </wd-button>
        </view>

        <view class="footer-actions mt-20">
          <wd-button block plain type="info" @click="goBackToConfig">
            {{ $t('common.prev_step') }}
          </wd-button>
          <wd-button block type="primary" @click="confirmFinishWifiConfig">
            {{ $t('common.next_step') }}
          </wd-button>
        </view>

        <view class="mt-20 tips h-fit">{{ $t('net_config.generate_tip') }}</view>
      </view>

    </view>
    
    <!-- 反扫二维码配网弹窗 -->
    <wd-popup v-model="showReverseQrPopup" position="center" :close-on-click-modal="true" custom-style="border-radius: 16px; overflow: hidden;">
      <view class="reverse-qr-popup">
        <view class="popup-header">
          <text class="popup-title">{{ $t('net_config.reverse_qr_title') }}</text>
          <view class="popup-close" @click="closeReverseQrPopup">
            <wd-icon name="close" size="24px" />
          </view>
        </view>
        <view class="popup-content">
          <view class="qr-container">
            <!-- 显示生成的二维码图片 -->
            <image v-if="reverseQrImage" class="qrcode-image" :src="reverseQrImage" mode="widthFix" />
            <!-- 用于生成二维码的canvas组件，只在有值时渲染确保每次重新创建 -->
            <l-qrcode 
              v-if="reverseQrValue"
              useCanvasToTempFilePath
              @success="handleReverseQrSuccess"
              class="qrcode-canvas"
              :value="reverseQrValue" 
              size="400rpx" 
              color="#000000"
              bgColor="#ffffff"
              :marginSize="2"
              errorLevel="M"
            />
          </view>
          <view class="wifi-info-display">
            <view class="info-row">
              <text class="info-label">{{ $t('net_config.wifi_name') }}:</text>
              <text class="info-value">{{ wifiConfig.ssid }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ $t('net_config.security_type') }}:</text>
              <text class="info-value">{{ securityOptions[securityIndex].label }}</text>
            </view>
          </view>
          <view class="popup-tips">
            <text>{{ $t('net_config.reverse_qr_tips') }}</text>
          </view>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onUnload } from '@dcloudio/uni-app';
// todo
// @ts-ignore
import { deviceApi } from '@/api/index.js';

import { useToast, useMessage } from '@/uni_modules/wot-design-uni';
import {
  clearWiFiConfig,
  DEFAULT_WIFI_CONFIG,
  generateConfigHash,
  genWiFiStr,
  getWiFiConfig,
  securityOptions,
  type SecurityType,
  WiFiConfigStr
} from '@/utils/wifiConfig';
import { AudioPlayerManager } from '@/utils/audioPlayer';
import { ArrayBufferToBase64, generateWavAudio } from '@/utils/soundWave';
import { type FileInfo, ConfigWifiMethod, methodOptions, methodName } from './types';
import { pageOptions, onMethodChange, isPlaying, callOnLoad, callOnUnload } from './store';
import { PageMap, Pages } from '@/utils/route';
import AudioRecorderManager from '@/utils/audioRecorder';
import { useUserStore } from '@/store';
import type { Device as UserDevice } from '../device/types';
import { getWifiList, WifiScanError, WifiScanErrorType, startWifiSafe, stopWifiSafe, getConnectedWifiBestEffort } from '@/utils/wifi';
import {
  requestCameraPermission,
  requestLocationPermission,
  checkPermissionStatus,
  openPermissionSetting,
  PermissionType,
  PermissionStatus
} from '@/utils/permission';
import { useNotify } from '@/uni_modules/wot-design-uni';
import { AppConfig } from '@/configs';

const toast = useToast();
const message = useMessage();
const { showNotify, closeNotify } = useNotify();
const { t: $t, locale } = useI18n();
const userStore = useUserStore();

type WifiDisplayItem = {
  key: string;
  ssid: string;
  secure: boolean;
  signalLevel: number;
  raw: any;
};

const wifiList = ref<WifiDisplayItem[]>([]);
const isScanningWifi = ref(false);
const wifiScanError = ref('');
const wifiScanErrorInfo = ref<{
  title: string;
  desc: string;
  action?: string;
  actionType?: 'wifi' | 'location' | 'permission';
} | null>(null);
const showManualConfig = ref(false);
const isIOS = ref(false); // iOS 平台标识
const selectedWifiKey = ref('');
const signalLevelMarks = [1, 2, 3, 4];
let wifiScanTimer: ReturnType<typeof setTimeout> | null = null;
const MOCK_WIFI_CANDIDATES: Array<{ ssid: string; security: SecurityType }> = [
  { ssid: 'XRobot-Home-2G', security: 'WPA' },
  { ssid: 'XRobot-Home-5G', security: 'WPA3' },
  { ssid: 'SmartLab-Guest', security: 'WPA' },
  { ssid: 'Office-Network', security: 'WPA' },
  { ssid: 'Cafe-Free-WiFi', security: 'WEP' },
  { ssid: 'LivingRoom-AP', security: 'WPA3' }
];

// WiFi配置数据
const wifiConfig = reactive({
  ...DEFAULT_WIFI_CONFIG
});

const QR_CONFIG_STEP = {
  // 配置WiFi信息
  config_wifi: 0,
  // 设备连接WiFi
  device_config_wifi: 1
};

const curStep = ref(QR_CONFIG_STEP.config_wifi);
const deviceBound = ref(false); // 设备是否绑定成功，初始为false，扫码成功后才显示页面
const securityIndex = ref(0);
const showPassword = ref(false);

// 音频播放器实例
const audioPlayer = ref<AudioPlayerManager | null>(null);

// 新增：音频播放进度相关状态
const currentTime = ref(0);
const totalTime = ref(0);
const progressPercent = ref(0);

// 反扫二维码配网相关状态
const showReverseQrPopup = ref(false);
const reverseQrValue = ref('');
const reverseQrImage = ref<string | null>(null);

function nextStep() {
  switch (curStep.value) {
    // 配置WiFi信息
    case QR_CONFIG_STEP.config_wifi:
      curStep.value = QR_CONFIG_STEP.device_config_wifi;
      break;
    // 设备连接WiFi
    case QR_CONFIG_STEP.device_config_wifi:
      stopPlay();
      // 配网完成后直接跳转智能体广场
      goDeviceManage();
      break;
    default:
      break;
  }
}

// 跳转设备管理页面
function goDeviceManage() {
  console.log('goDeviceManage');
  // 跳转到广场页面，以便触发第二步引导
  uni.switchTab({
    url: PageMap[Pages.Square].url
  });
}

function confirmFinishWifiConfig() {
  message.confirm({
    title: $t('net_config.confirm_wifi_config'),
    msg: $t('net_config.confirm_wifi_config_desc'),
    confirmButtonText: $t('common.confirm'),
    cancelButtonText: $t('common.cancel')
  }).then(() => {
    nextStep();
  }).catch(() => {
    // 用户点击取消或关闭弹窗
  });
}

async function handleScanQr() {
  // 获取系统信息判断平台
  const systemInfo = uni.getSystemInfoSync();
  const isIOS = systemInfo.platform === 'ios';

  // iOS 平台：直接调用 scanCode，它会自动触发权限请求并打开扫码界面
  // 这样避免了先打开相机拍照界面再跳转到扫码的问题
  if (isIOS) {
    // 先检查权限状态
    const permissionStatus = await checkPermissionStatus(PermissionType.CAMERA);
    
    if (permissionStatus === PermissionStatus.DENIED) {
      // 权限已被拒绝，引导用户去设置
      uni.showModal({
        title: $t('common.tip'),
        content: $t('permission.camera_denied_guide'),
        confirmText: $t('common.go_to_setting'),
        cancelText: $t('common.cancel'),
        success: (res) => {
          if (res.confirm) {
            openPermissionSetting();
          }
        }
      });
      return;
    }

    // 直接调用 scanCode，系统会自动处理权限请求
    uni.scanCode({
      scanType: ['qrCode'],
      autoZoom: false,
      success: handleScanQrSuccess,
      fail: (err: any) => {
        if (err.errMsg === 'scanCode:fail cancel') {
          // 用户取消扫码
        } else if (err.errMsg && (err.errMsg.includes('auth') || err.errMsg.includes('permission') || err.errMsg.includes('deny'))) {
          // 权限被拒绝，引导用户去设置
          uni.showModal({
            title: $t('common.tip'),
            content: $t('permission.camera_denied_guide'),
            confirmText: $t('common.go_to_setting'),
            cancelText: $t('common.cancel'),
            success: (res) => {
              if (res.confirm) {
                openPermissionSetting();
              }
            }
          });
        } else {
          console.error('扫码失败:', err);
        }
      }
    });
    return;
  }

  // 非 iOS 平台：使用原有的权限请求流程
  const permissionResult = await requestCameraPermission({
    show: showNotify,
    close: closeNotify
  }, true);
  if (!permissionResult.granted) {
    // 权限请求工具已经显示了相应的提示，返回上一页
    uni.navigateBack();
    return;
  }

  uni.scanCode({
    scanType: ['qrCode'],
    autoZoom: false,
    success: handleScanQrSuccess,
    fail: (err) => {
      // 扫码取消或失败，返回上一页
      uni.navigateBack();
      if (err.errMsg !== 'scanCode:fail cancel') {
        console.error(err);
      }
    }
  });
}

async function handleScanQrSuccess(res: { result: string }) {
  console.log('handleScanQr', res);

  // 解析二维码数据
  let qrcodeData;
  try {
    qrcodeData = JSON.parse(res.result);
  } catch (error) {
    console.error('JSON解析错误:', error);
    toast.warning({
      msg: $t('net_config.invalid_qr'),
      duration: 2000
    });
    return;
  }

  // 检查 s 和 m 字段是否存在（v 字段可选）
  if (!qrcodeData.s || !qrcodeData.m) {
    toast.warning({
      msg: $t('net_config.invalid_qr'),
      duration: 2000
    });
    return;
  }
  try {
    // 调用注册设备方法
    await registerDevice({
      s: qrcodeData.s,
      m: qrcodeData.m,
      v: qrcodeData.v
    });

    toast.success({
      msg: $t('net_config.device_bind_success'),
      duration: 2000,
      cover: true
    });

    // 扫码成功，显示页面并进入配网步骤
    deviceBound.value = true;
    setTimeout(() => {
      nextStep();
    }, 1500);
  } catch (error) {
    console.error('handleScanQrSuccess error', error);
    toast.warning({
      msg: $t('net_config.device_bind_failed'),
      duration: 2000
    });
    // 绑定失败，返回上一页
    uni.navigateBack();
  }
}

/**
 * 注册设备到用户账号
 *
 * 该方法负责设备注册的核心逻辑，包括调用后端接口绑定设备、处理成功和失败情况。
 *
 * @param qrcodeData qrcode数据对象，包含 s（源字符串）、m（MAC地址）、v（版本号，可选）字段
 */
async function registerDevice(qrcodeData: { s: string; m: string; v?: string }) {
  console.log('注册设备', qrcodeData);

  try {
    toast.loading({
      loadingType: 'ring',
      msg: $t('net_config.binding_device'),
      cover: true
    });

    // 调用后端接口绑定设备
    const result = await deviceApi.bindByQrcode(qrcodeData);
    if (result && result.code === 1000) {
      console.log('设备绑定成功', result);
    } else {
      throw new Error(result?.message || $t('net_config.device_bind_fail'));
    }
  } catch (error) {
    console.error('设备绑定失败:', error);
    throw error;
  } finally {
    toast.close();
  }
}


// 计算属性
const canGenerate = computed(() => {
  return wifiConfig.ssid.trim() !== '';
});

function toggleManualConfig() {
  showManualConfig.value = !showManualConfig.value;
}

function setSecurityType(security: SecurityType) {
  wifiConfig.security = security;
  const idx = securityOptions.findIndex((item) => item.value === security);
  securityIndex.value = idx >= 0 ? idx : 0;
}

function resolveSecurityFromWifi(wifi: any): SecurityType {
  if (!wifi) {
    return 'WPA';
  }
  const rawType = String(wifi.securityType || wifi.capabilities || '').toUpperCase();
  if (rawType.includes('WPA3') || rawType.includes('SAE')) {
    return 'WPA3';
  }
  if (rawType.includes('WPA')) {
    return 'WPA';
  }
  if (rawType.includes('WEP')) {
    return 'WEP';
  }
  return 'WPA';
}

function convertSignalToLevel(signal: number | undefined | null) {
  if (signal === undefined || signal === null) {
    return 0;
  }
  // WeChat returns either 0-100 or -100-0, normalize both.
  if (signal < 0) {
    const normalized = Math.min(Math.max((signal + 100) / 100, 0), 1);
    return Math.max(1, Math.round(normalized * 4));
  }
  const normalized = Math.min(Math.max(signal / 100, 0), 1);
  return Math.max(1, Math.round(normalized * 4));
}

function formatWifiList(list: UniApp.WifiInfo[]): WifiDisplayItem[] {
  const dedupe = new Map<string, UniApp.WifiInfo>();
  list.forEach((wifi) => {
    if (!wifi || !wifi.SSID) {
      return;
    }
    const current = dedupe.get(wifi.SSID);
    if (!current || (Number(wifi.signalStrength) || 0) > (Number(current.signalStrength) || 0)) {
      dedupe.set(wifi.SSID, wifi);
    }
  });

  return Array.from(dedupe.values())
    .map((wifi, index) => ({
      key: wifi.BSSID || `${wifi.SSID}-${index}`,
      ssid: wifi.SSID,
      secure: wifi.secure ?? true,
      signalLevel: convertSignalToLevel(wifi.signalStrength),
      raw: wifi
    }))
    .sort((a, b) => b.signalLevel - a.signalLevel || a.ssid.localeCompare(b.ssid));
}

function applyWifiSource(list: UniApp.WifiInfo[]) {
  const formatted = formatWifiList(list);
  wifiList.value = formatted;
  wifiScanError.value = formatted.length ? '' : $t('net_config.no_wifi_found');
  const matched = formatted.find((item) => item.ssid === wifiConfig.ssid);
  selectedWifiKey.value = matched ? matched.key : '';
}

async function startWifiScan(rescan: boolean = false) {
  wifiScanError.value = '';
  wifiScanErrorInfo.value = null;
  if (!rescan) {
    showManualConfig.value = false;
  }
  wifiList.value = [];
  selectedWifiKey.value = '';
  isScanningWifi.value = true;

  // 请求位置权限
  const permissionResult = await requestLocationPermission({
    show: showNotify,
    close: closeNotify
  });
  if (!permissionResult.granted) {
    // 权限请求工具已经显示了相应的提示
    isScanningWifi.value = false;
    return;
  }

  // 注意：NEARBY_WIFI_DEVICES 权限的请求已统一在 wifi.ts 的 ensureAndroidScanPermissions 中处理
  // 这里不再重复请求，避免权限被永久拒绝后无法恢复

  if (wifiScanTimer) {
    clearTimeout(wifiScanTimer);
  }
  wifiScanTimer = setTimeout(async () => {
    try {
      const wifiList_ = await getWifiList({ no24G: false, no5G: true });
      applyWifiSource(wifiList_);
    } catch (error) {
      if (error instanceof WifiScanError) {
        handleWifiScanError(error);
      } else {
        // 处理其他错误
        wifiScanError.value = $t('net_config.wifi_scan_failed');
      }
    } finally {
      isScanningWifi.value = false;
      wifiScanTimer = null;
    }
  }, 600);
}

function handleWifiScanError(error: WifiScanError) {
  switch (error.type) {
    case WifiScanErrorType.WIFI_DISABLED:
      wifiScanErrorInfo.value = {
        title: $t('net_config.wifi_disabled_title'),
        desc: $t('net_config.wifi_disabled_desc'),
        action: $t('net_config.go_to_settings'),
        actionType: 'wifi'
      };
      break;
    case WifiScanErrorType.LOCATION_DISABLED:
      wifiScanErrorInfo.value = {
        title: $t('net_config.location_disabled_title'),
        desc: $t('net_config.location_disabled_desc'),
        action: $t('net_config.go_to_settings'),
        actionType: 'location'
      };
      break;
    case WifiScanErrorType.PERMISSION_DENIED_ALWAYS:
      wifiScanErrorInfo.value = {
        title: $t('net_config.permission_denied_title'),
        desc: $t('net_config.permission_denied_always_desc'),
        action: $t('net_config.go_to_app_settings'),
        actionType: 'permission'
      };
      break;
    case WifiScanErrorType.PERMISSION_DENIED:
      wifiScanErrorInfo.value = {
        title: $t('net_config.permission_denied_title'),
        desc: $t('net_config.permission_denied_desc'),
        action: $t('net_config.retry_scan'),
        actionType: 'permission'
      };
      break;
    case WifiScanErrorType.SCAN_NOT_SUPPORTED:
      wifiScanError.value = $t('net_config.scan_not_supported');
      showManualConfig.value = true;
      break;
    default:
      wifiScanError.value = $t('net_config.wifi_scan_failed');
  }
}

function handleErrorAction() {
  if (!wifiScanErrorInfo.value) return;

  switch (wifiScanErrorInfo.value.actionType) {
    case 'wifi':
    case 'location':
      // 跳转到系统设置
      // #ifdef APP-ANDROID
      try {
        // @ts-ignore
        const main = plus.android.runtimeMainActivity();
        // @ts-ignore
        const Intent = plus.android.importClass('android.content.Intent');
        // @ts-ignore
        const Settings = plus.android.importClass('android.provider.Settings');
        // @ts-ignore
        const intent = new Intent(
          wifiScanErrorInfo.value.actionType === 'wifi'
            ? // @ts-ignore
              Settings.ACTION_WIFI_SETTINGS
            : // @ts-ignore
              Settings.ACTION_LOCATION_SOURCE_SETTINGS
        );
        // @ts-ignore
        main.startActivity(intent);
      } catch (e) {
        console.error('打开系统设置失败:', e);
        toast.error({
          msg: $t('net_config.open_settings_failed'),
          duration: 2000
        });
      }
      // #endif
      break;
    case 'permission':
      if (wifiScanErrorInfo.value.action === $t('net_config.go_to_app_settings')) {
        // 跳转到应用权限设置
        uni.openAppAuthorizeSetting({
          success: () => {
            console.log('打开设置成功');
          },
          fail: (err) => {
            console.error('打开设置失败', err);
            toast.error({
              msg: $t('net_config.open_settings_failed'),
              duration: 2000
            });
          }
        });
      } else {
        // 重新扫描（会再次触发权限请求）
        startWifiScan(true);
      }
      break;
  }
}

function handleRescanClick() {
  if (isScanningWifi.value) {
    return;
  }
  startWifiScan(true);
}

function cleanupWifiScan() {
  if (wifiScanTimer) {
    clearTimeout(wifiScanTimer);
    wifiScanTimer = null;
  }
  isScanningWifi.value = false;
}

async function promptWifiPassword(ssid: string) {
  try {
    const result = await message.prompt({
      title: $t('net_config.enter_password_title'),
      inputType: 'password' as any,
      inputPlaceholder: $t('net_config.wifi_password_placeholder'),
      confirmButtonText: $t('common.confirm'),
      cancelButtonText: $t('common.cancel')
    });
    return String(result.value || '');
  } catch (error) {
    return null;
  }
}

function applyWifiSelection(item: WifiDisplayItem, security: SecurityType, password: string) {
  wifiConfig.ssid = item.ssid;
  wifiConfig.password = password;
  setSecurityType(security);
  selectedWifiKey.value = item.key;
  showManualConfig.value = false;
}

async function handleSelectWifi(item: WifiDisplayItem) {
  if (!item?.ssid) {
    return;
  }
  const security = resolveSecurityFromWifi(item.raw);
  const inputValue = await promptWifiPassword(item.ssid);
  if (inputValue === null) {
    return;
  }
  const password = String(inputValue).trim();
  applyWifiSelection(item, security, password);
  if (!canGenerate.value) {
    return;
  }
  const success = await handleStepToConnectWifi();
  if (success) {
    toast.success({ msg: $t('net_config.wifi_selected_success'), duration: 1500 });
    nextStep();
  }
}

watch(
  () => curStep.value,
  (step, previousStep) => {
    if (step === QR_CONFIG_STEP.config_wifi) {
      if (!isIOS.value) {
        startWifiScan();
      }
    } else if (previousStep === QR_CONFIG_STEP.config_wifi) {
      cleanupWifiScan();
    }
  }
);

const onSecurityChange = (e: any) => {
  const selected = securityOptions[e.detail.value].value;
  setSecurityType(selected);
};

async function handleGenQr() {
  const success = await handleStepToConnectWifi();
  if (success) {
    nextStep();
  }
}

async function handleStepToConnectWifi(): Promise<boolean> {
  if (!checkWifiConfig()) {
    return false;
  }

  // 生成WIFI配置字符串
  const wifiString = genWiFiStr(wifiConfig);
  console.log('genWiFiStr:', wifiString);

  await generateWave(wifiString);
  return true;
}

function checkWifiConfig(): boolean {
  const formatRegex = /^[a-zA-Z0-9_\-\s!@#$%^&*()+=.\[\]{}|\\:;"'<>,?/~`\u4e00-\u9fa5]+$/;

  // 1. 验证 SSID 是否为空
  if (wifiConfig.ssid.trim() === '') {
    toast.warning({
      msg: $t('net_config.please_input_ssid'),
      duration: 2000
    });
    return false;
  }

  // 2. 验证 SSID 格式
  if (!formatRegex.test(wifiConfig.ssid)) {
    toast.warning({
      msg: $t('net_config.invalid_ssid_format'),
      duration: 2000
    });
    return false;
  }

  // 3. 如果输入了密码，验证密码格式
  if (wifiConfig.password) {
    if (!formatRegex.test(wifiConfig.password)) {
      toast.warning({
        msg: $t('net_config.invalid_password_format'),
        duration: 2000
      });
      return false;
    }
  }

  return true;
}


/**
 * 构造文件信息
 * @param dirRoot 根目录
 * @param wifiConfigStr wifi配置字符串
 * @returns 文件信息
 */
function constructFileInfo(dirRoot: string, wifiConfigStr: WiFiConfigStr): FileInfo {
  const dir = `${dirRoot}/wifi_config`;
  const filePrefix = wifiConfig.ssid;
  const fileName = `${filePrefix}_${generateConfigHash(wifiConfigStr)}.wav`;
  const filePath = `${dir}/${fileName}`;
  return {
    dir,
    filePrefix,
    fileName,
    filePath
  };
}

// 辅助函数：清理同前缀的旧文件（微信版本）
function cleanupOldFilesForWx(fsm: UniApp.FileSystemManager, dir: string, prefix: string) {
  // #ifdef MP-WEIXIN
  fsm.readdirSync(dir).forEach((file: string) => {
    if (file.startsWith(prefix)) {
      fsm.unlinkSync(`${dir}/${file}`);
    }
  });
  // #endif
}

// 辅助函数：写入文件内容（微信版本）
function writeFileForWx(fsm: any, filePath: string, arrayBuffer: Uint8Array<ArrayBuffer>) {
  // #ifdef MP-WEIXIN
  fsm.writeFile({
    filePath,
    data: arrayBuffer.buffer,
    encoding: 'binary',
    success(res: any) {
      console.log('writeFile success', res, filePath);
      pageOptions.value.audioUrl = filePath;
    },
    fail(res: any) {
      console.log('writeFile fail', res);
      toast.warning({
        msg: $t('net_config.wave_file_save_failed'),
        duration: 2000
      });
    }
  });
  // #endif
}

function generateWaveForWx(wifiConfigStr: WiFiConfigStr, arrayBuffer: Uint8Array<ArrayBuffer>) {
  // #ifdef MP-WEIXIN
  const fsm = uni.getFileSystemManager();
  // @ts-ignore uni.env 只在wx小程序环境有效
  const fileInfo = constructFileInfo(uni.env.USER_DATA_PATH, wifiConfigStr);
  const { dir, filePrefix: prefix, filePath } = fileInfo;

  // 确保目录存在
  try {
    fsm.accessSync(dir);
  } catch (e) {
    fsm.mkdirSync(dir);
  }

  // 检查目标文件是否已存在
  try {
    fsm.accessSync(filePath);
    // 文件已存在，直接使用
    pageOptions.value.audioUrl = filePath;
  } catch (err) {
    // 文件不存在，先清理同前缀的旧文件，然后创建新文件
    cleanupOldFilesForWx(fsm, dir, prefix);
    writeFileForWx(fsm, filePath, arrayBuffer);
  }
  // #endif
}

// 辅助函数：清理同前缀的旧文件（APP版本）
function cleanupOldFilesForApp(
  dirEntry: any,
  prefix: string,
  currentFileName: string,
  callback: () => void
) {
  // #ifdef APP-PLUS || APP-HARMONY
  dirEntry.createReader().readEntries(
    function (entries: any[]) {
      let filesToDelete = entries.filter(
        (entry) => entry.isFile && entry.name.startsWith(prefix) && entry.name !== currentFileName
      );

      if (filesToDelete.length === 0) {
        callback();
        return;
      }

      let deletedCount = 0;
      filesToDelete.forEach((fileEntry) => {
        fileEntry.remove(
          function () {
            deletedCount++;
            if (deletedCount === filesToDelete.length) {
              callback();
            }
          },
          function (error: any) {
            console.error('删除旧文件失败:', fileEntry.name, error);
            deletedCount++;
            if (deletedCount === filesToDelete.length) {
              callback();
            }
          }
        );
      });
    },
    function (error: any) {
      console.error('读取目录失败:', error);
      callback();
    }
  );
  // #endif
}

// 辅助函数：写入文件内容（APP版本）
function writeFileForApp(
  fileEntry: PlusIoFileEntry,
  arrayBuffer: Uint8Array<ArrayBuffer>,
  filePath: string
) {
  // #ifdef APP-PLUS || APP-HARMONY
  fileEntry.createWriter(function (writer: PlusIoFileWriter) {
    writer.onwrite = function () {
      console.log('ArrayBuffer 保存成功:', filePath);
      const playablePath = plus.io.convertLocalFileSystemURL(fileEntry.toURL());
      console.log('playablePath', playablePath);
      pageOptions.value.audioUrl = playablePath;
    };

    writer.onerror = function (e: PlusIoFileEvent) {
      console.error('保存失败:', e.toString());
      toast.warning({
        msg: $t('net_config.wave_file_save_failed'),
        duration: 2000
      });
    };

    // 写入 ArrayBuffer 内容标准方法
    const base64Str = ArrayBufferToBase64(arrayBuffer.buffer);
    writer.writeAsBinary(base64Str);
  });
  // #endif
}

function generateWaveForApp(wifiConfigStr: WiFiConfigStr, arrayBuffer: Uint8Array<ArrayBuffer>) {
  // #ifdef APP-PLUS || APP-HARMONY
  const {
    filePrefix: prefix,
    fileName,
    filePath
  } = constructFileInfo(plus.io.PRIVATE_DOC.toString(), wifiConfigStr);

  plus.io.requestFileSystem(plus.io.PRIVATE_DOC, function (fs) {
    fs.root!.getDirectory('wifi_config', { create: true, exclusive: false }, function (dirEntry) {
      // 检查目标文件是否已存在
      dirEntry.getFile(
        fileName,
        { create: false },
        function (fileEntry: PlusIoFileEntry) {
          // 文件已存在，直接使用
          const playablePath = plus.io.convertLocalFileSystemURL(fileEntry.toURL());
          console.log('文件已存在，直接使用:', playablePath);
          pageOptions.value.audioUrl = playablePath;
        },
        function () {
          // 文件不存在，先清理同前缀的旧文件，然后创建新文件
          cleanupOldFilesForApp(dirEntry, prefix, fileName, function () {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry: PlusIoFileEntry) {
              writeFileForApp(fileEntry, arrayBuffer, filePath);
            });
          });
        }
      );
    });
  });
  // #endif
}

function generateWave(wifiConfigStr: WiFiConfigStr) {
  console.log('generateWave');
  const arrayBuffer = generateWavAudio(wifiConfigStr);
  // #ifdef MP-WEIXIN
  generateWaveForWx(wifiConfigStr, arrayBuffer);
  // #endif

  // #ifdef APP-PLUS || APP-HARMONY
  generateWaveForApp(wifiConfigStr, arrayBuffer);
  // #endif
}

const clearConfig = () => {
  console.log('clearConfig');
  wifiConfig.ssid = '';
  wifiConfig.password = '';
  setSecurityType('WPA');
  selectedWifiKey.value = '';
  clearWiFiConfig();
};

const goBackToConfig = () => {
  console.log('goBackToConfig');
  curStep.value = QR_CONFIG_STEP.config_wifi;
  stopPlay();
};

function toggleAudioPlay() {
  console.log('toggleAudioPlay', isPlaying.value, audioPlayer.value);
  if (audioPlayer.value && pageOptions.value.audioUrl) {
    audioPlayer.value.toggle({
      src: pageOptions.value.audioUrl,
      id: `${wifiConfig.ssid}${wifiConfig.password}`,
      name: wifiConfig.ssid
    });
  }
}

function stopPlay() {
  if (audioPlayer.value) {
    audioPlayer.value.stop();
  }
}


// 初始化音频播放管理器
function initAudioManager() {
  audioPlayer.value = AudioPlayerManager.getInstance(
    {
      autoStop: true,
      volume: 1,
      loop: pageOptions.value.loopPlay
      // autoplay: pageOptions.value.autoplay
    },
    {
      onPlay: (audio) => {
        isPlaying.value = true;
        console.log('音频开始播放:', audio);
        // 开始进度更新
        startProgressUpdate();
      },
      onStop: (audio) => {
        isPlaying.value = false;
        console.log('音频停止播放:', audio);
        // 停止进度更新
        stopProgressUpdate();
        // 重置进度
        resetProgress();
      },
      onEnded: (audio) => {
        isPlaying.value = false;
        console.log('音频播放结束:', audio);
        // 停止进度更新
        stopProgressUpdate();
        // 如果不是循环播放，重置进度
        if (!pageOptions.value.loopPlay) {
          resetProgress();
        }
      },
      onPause: (audio) => {
        isPlaying.value = false;
        console.log('音频播放暂停:', audio);
        // 停止进度更新
        stopProgressUpdate();
      },
      onError: (error, audio) => {
        isPlaying.value = false;
        console.error('音频播放失败:', error);
        toast.warning({ msg: $t('device.voiceprint.play_failed') || '播放失败', duration: 2000 });
        // 停止进度更新并重置
        stopProgressUpdate();
        resetProgress();
      }
    }
  );

  console.log('audio player init');
}

// 新增：进度更新相关函数
let progressTimer: NodeJS.Timeout | null = null;

function startProgressUpdate() {
  if (progressTimer) {
    clearInterval(progressTimer);
  }

  progressTimer = setInterval(() => {
    if (audioPlayer.value) {
      const progressInfo = audioPlayer.value.getPlayProgress();
      currentTime.value = Math.floor(progressInfo.currentTime);
      totalTime.value = Math.floor(progressInfo.duration);
      progressPercent.value = progressInfo.progress;
    }
  }, 100); // 每100ms更新一次进度
}

function stopProgressUpdate() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function resetProgress() {
  currentTime.value = 0;
  progressPercent.value = 0;
}

function handleLoopChange(loop: { value: boolean }) {
  console.log('handleLoopChange', loop);
  // 更新AudioPlayerManager的循环播放设置
  audioPlayer.value?.setLoop(loop.value);
  // 同步到pageOptions
  pageOptions.value.loopPlay = loop.value;
}

// function handleAutoChange(autoplay: { value: boolean }) {
//   console.log('handleAutoChange', autoplay);
//   // 更新AudioPlayerManager的自动播放设置
//   audioPlayer.value?.setAutoplay(autoplay.value);
//   // 同步到pageOptions
//   pageOptions.value.autoplay = autoplay.value;
// }

function updateNavigationTitle() {
  uni.setNavigationBarTitle({
    title: $t('pages.net_config')
  });
}

/**
 * 反扫二维码配网 - 生成包含WiFi配置信息的二维码供设备扫描
 */
async function handleFactoryQrClick() {
  console.log('Reverse QR config clicked');
  
  // 检查WiFi配置是否完整
  if (!wifiConfig.ssid.trim()) {
    toast.warning({
      msg: $t('net_config.please_input_ssid'),
      duration: 2000
    });
    return;
  }
  
  // 生成WiFi配置字符串
  const wifiString = genWiFiStr(wifiConfig, false);
  
  // 只有当WiFi配置改变时才重新生成二维码
  if (reverseQrValue.value !== wifiString) {
    reverseQrImage.value = null;
    reverseQrValue.value = '';
    await nextTick();
    reverseQrValue.value = wifiString;
  }
  
  showReverseQrPopup.value = true;
}

/**
 * 处理反扫二维码图片生成成功
 */
function handleReverseQrSuccess(img: string) {
  console.log('handleReverseQrSuccess');
  reverseQrImage.value = img;
}

/**
 * 关闭反扫二维码弹窗
 */
function closeReverseQrPopup() {
  showReverseQrPopup.value = false;
  // 不清除二维码数据，下次打开时保持显示
}

onLoad((options) => {
  updateNavigationTitle();
  callOnLoad();
  initAudioManager();
  
  // 检测是否是 iOS 平台
  const systemInfo = uni.getSystemInfoSync();
  isIOS.value = systemInfo.platform === 'ios';
  
  // iOS 设备自动展开手动配置并尝试获取当前连接的 WiFi
  if (isIOS.value) {
    showManualConfig.value = true;
    startWifiSafe().then((success) => {
      if (success) {
        getConnectedWifiBestEffort().then((wifi) => {
          console.log('getConnectedWifi success', wifi);
          if (wifi && wifi.SSID && !wifiConfig.ssid) {
            wifiConfig.ssid = wifi.SSID;
          }
          // 获取完后可以关闭模块，节省资源
          stopWifiSafe();
        });
      }
    });
  }
  
  // 如果有保存的WiFi配置，预填充表单
  const savedConfig = getWiFiConfig();
  if (savedConfig.ssid) {
    wifiConfig.ssid = savedConfig.ssid;
    wifiConfig.password = savedConfig.password;
    setSecurityType(savedConfig.security);
  }
  
  // 如果是从"我的"页面扫码成功后跳转过来，直接显示配网页面
  if (options?.bound === '1') {
    deviceBound.value = true;
    // 自动开始 WiFi 扫描
    if (!isIOS.value) {
      startWifiScan();
    }
    return;
  }
  
  // 否则开始扫码绑定设备
  handleScanQr();
});

onUnload(() => {
  callOnUnload();
  cleanupWifiScan();
  stopPlay();
});

watch(
  () => locale.value,
  () => {
    updateNavigationTitle();
  }
);
</script>

<style lang="scss" scoped>
.net-config {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding-top: 30rpx;
}

.wifi-config-section,
.soundwave-section {
  position: relative;
  margin: 0 16px 24px;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.factory-test-trigger {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 100;
  opacity: 0.5;
  padding: 12px;
  color: #999;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rescan-wrapper {
  flex-shrink: 0;
}

.mini-btn {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #335CFF;
  border: 2rpx solid rgba(0, 122, 255, 0.2);
  border-radius: 999px;
  background-color: rgba(0, 122, 255, 0.08);
  transition: opacity 0.2s ease;
}

.mini-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.wifi-list-container {
  margin-top: 32rpx;
  background-color: #f8f9fa;
  border-radius: 24rpx;
  padding: 32rpx;
  min-height: 450rpx;
}

// iOS 设备紧凑模式：只显示一个 WiFi 的高度
.wifi-list-container.ios-compact {
  min-height: auto;
  max-height: 145rpx;
  overflow: hidden;
}

.wifi-scan-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450rpx;
  gap: 24rpx;
  color: #666;
  text-align: center;
}

// iOS 紧凑模式下扫描动画居中
.ios-compact .wifi-scan-state {
  min-height: 80rpx;
  flex-direction: row;
  gap: 16rpx;
}

.wifi-scan-state.empty {
  color: #999;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid rgba(0, 122, 255, 0.15);
  border-top-color: #335CFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.wifi-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  max-height: 600rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.wifi-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: #fff;
  border: 1px solid transparent;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.wifi-list-item-hover {
  background-color: #f1f6ff;
}

.wifi-list-item:active {
  transform: translateY(1px);
}

.wifi-list-item.selected {
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.08);
}

.wifi-list-item-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.wifi-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.wifi-security {
  font-size: 24rpx;
  color: #666;
}

.wifi-signal {
  display: flex;
  align-items: flex-end;
  gap: 6rpx;
}

.signal-bar {
  width: 8rpx;
  height: 20rpx;
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.signal-bar:nth-child(2) {
  height: 28rpx;
}

.signal-bar:nth-child(3) {
  height: 36rpx;
}

.signal-bar:nth-child(4) {
  height: 44rpx;
}

.signal-bar.active {
  background-color: #335CFF;
}

.manual-config {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.manual-config-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12rpx;
}

.manual-config-clear {
  font-size: 24rpx;
  color: #335CFF;
}

.form-group {
  margin-bottom: 20px;

  .form-label {
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .form-input {
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 16px;
    background-color: #fff;
    box-sizing: border-box;

    &.disabled {
      background-color: #f5f5f5;
      color: #999;
    }

    &:focus {
      border-color: #335CFF;
      outline: none;
    }
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    .form-input {
      padding-right: 44px;
    }

    .password-toggle {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      color: #999;

      &:active {
        opacity: 0.7;
      }
    }
  }

  .form-picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 16px;
    background-color: #fff;

    .picker-arrow {
      font-size: 18px;
      color: #999;
      transform: rotate(90deg);
    }
  }

  .checkbox-group {
    .checkbox-item {
      display: flex;
      align-items: center;

      .checkbox-label {
        margin-left: 8px;
        font-size: 14px;
        color: #333;
      }
    }
  }
}

.action-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
}

.footer-actions {
  display: flex;
  gap: 12px;
  
  :deep(.wd-button) {
    flex: 1;
  }
}


.wifi-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .info-label {
      font-size: 14px;
      color: #666;
    }

    .info-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
  }
}

.audio-player-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.audio-player-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.audio-player {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    transform: scale(0.95);
  }

  &.playing {
    background-color: #ff3b30;
  }

  &.stop-btn {
    background-color: #666;
  }
}

.soundwave-config-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.wifi-scan-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 12rpx;

  .error-icon {
    font-size: 48rpx;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    text-align: center;
  }

  .error-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #856404;
  }

  .error-desc {
    font-size: 28rpx;
    color: #856404;
    line-height: 1.5;
  }

  .error-action-btn {
    margin-top: 8rpx;
    padding: 16rpx 32rpx;
    font-size: 28rpx;
    color: #335CFF;
    background-color: #fff;
    border: 2rpx solid #335CFF;
    border-radius: 8rpx;
  }
}

// 反扫二维码弹窗样式
.reverse-qr-popup {
  width: 600rpx;
  background-color: #fff;
  
  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    border-bottom: 1px solid #f0f0f0;
    
    .popup-title {
      font-size: 36rpx;
      font-weight: 600;
      color: #333;
    }
    
    .popup-close {
      padding: 8rpx;
      color: #999;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .popup-content {
    padding: 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .qr-container {
      position: relative;
      padding: 24rpx;
      background-color: #fff;
      border-radius: 16rpx;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 400rpx;
      min-height: 400rpx;
      
      .qrcode-image {
        width: 400rpx;
        height: 400rpx;
      }
      
      .qrcode-canvas {
        // #ifdef APP-PLUS || APP-HARMONY
        position: absolute;
        top: 40rpx;
        left: 40rpx;
        z-index: -100;
        // #endif
        // #ifdef MP-WEIXIN
        display: none;
        // #endif
      }
    }
    
    .wifi-info-display {
      width: 100%;
      margin-top: 32rpx;
      padding: 24rpx;
      background-color: #f8f9fa;
      border-radius: 12rpx;
      
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8rpx 0;
        
        &:not(:last-child) {
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 16rpx;
          margin-bottom: 8rpx;
        }
        
        .info-label {
          font-size: 28rpx;
          color: #666;
        }
        
        .info-value {
          font-size: 28rpx;
          color: #333;
          font-weight: 500;
        }
      }
    }
    
    .popup-tips {
      margin-top: 24rpx;
      padding: 20rpx;
      background-color: #fff7e6;
      border-radius: 8rpx;
      width: 100%;
      box-sizing: border-box;
      
      text {
        font-size: 24rpx;
        color: #d48806;
        line-height: 1.5;
      }
    }
  }
}
</style>
